import { CurrencyEnum, TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { AppDataSource } from '../../src/data-source';
import { Transaction } from '../../src/entities';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedAccount,
  seedCategory,
  seedFinancialGoal,
  seedTransaction,
  seedUser,
  truncateAllTables,
} from './setup';

function buildApprovedRows(
  previewRows: Array<{
    rowNumber: number;
    fingerprint?: string;
    normalized: {
      amount: number | null;
      date: string | null;
      description: string | null;
      externalReference: string | null;
      type: TransactionType | null;
    };
  }>,
  categoryId: string,
) {
  return previewRows.map((row) => {
    if (!row.fingerprint) {
      throw new Error(`Expected preview row ${row.rowNumber} to include a fingerprint`);
    }

    return {
      categoryId,
      fingerprint: row.fingerprint,
      normalized: row.normalized,
      rowNumber: row.rowNumber,
    };
  });
}

describe('transaction router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.id;
    caller = createAuthenticatedCaller(userId);
  });

  describe('create (single)', () => {
    it('should create a single transaction', async () => {
      const category = await seedCategory(userId);
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.transaction.create({
        mode: 'single',
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
          accountId: account.id,
          categoryId: category.id,
        },
      });

      expect(Array.isArray(result)).toBe(false);
      if (Array.isArray(result)) {
        throw new Error('Expected single transaction result');
      }

      expect(result.amount).toBe(100);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.accountId).toBe(account.id);
    });

    it('should create a transaction with inline category', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.transaction.create({
        mode: 'single',
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 50,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
          accountId: account.id,
          category: { name: 'Inline Cat' },
        },
      });

      expect(Array.isArray(result)).toBe(false);
      if (Array.isArray(result)) {
        throw new Error('Expected single transaction result');
      }

      expect(result.amount).toBe(50);
      expect(result.accountId).toBe(account.id);
    });

    it('should reject invalid input (negative amount)', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: -100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: account.id,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject without authentication', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        publicCaller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: account.id,
          },
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('create (batch)', () => {
    it('should create batch transactions', async () => {
      const usdAccount = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.transaction.create({
        mode: 'batch',
        transactions: [
          {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: usdAccount.id,
          },
          {
            type: TransactionType.INCOME,
            amount: 200,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: usdAccount.id,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should reject archived or foreign accounts', async () => {
      const archivedAccount = await seedAccount(userId, { archivedAt: new Date() });
      const otherUser = await seedUser({ email: 'accounts-foreign@example.com' });
      const foreignAccount = await seedAccount(otherUser.id);

      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: archivedAccount.id,
          },
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: foreignAccount.id,
          },
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject standard transactions on third-party destination accounts', async () => {
      const landlordAccount = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        ownership: 'third_party',
      });

      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            date: '2025-01-15',
            accountId: landlordAccount.id,
          },
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject currency mismatches', async () => {
      const usdAccount = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.EUR,
            date: '2025-01-15',
            accountId: usdAccount.id,
          },
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('importPreview', () => {
    it('rejects preview requests for foreign accounts', async () => {
      const otherUser = await seedUser({ email: 'import-foreign@example.com' });
      const foreignAccount = await seedAccount(otherUser.id, { currency: CurrencyEnum.USD });

      await expect(
        caller.transaction.importPreview({
          defaults: {
            accountId: foreignAccount.id,
            currency: CurrencyEnum.USD,
            typeStrategy: 'signed_amount',
          },
          source: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('rejects preview when required mappings cannot be resolved', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        caller.transaction.importPreview({
          defaults: {
            accountId: account.id,
            currency: CurrencyEnum.USD,
            typeStrategy: 'signed_amount',
          },
          source: 'Booked On,Money In,Reference\n2026-05-08,200,payroll',
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('marks invalid rows without blocking valid rows in the same preview', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source:
          'Date,Description,Amount\n2026-05-08,Coffee,-12.50\nnot-a-date,Invalid Row,-5.00\n2026-05-09,Salary,2000',
      });

      expect(result.summary).toEqual({
        duplicate: 0,
        invalid: 1,
        ready: 2,
        reviewRequired: 0,
        total: 3,
      });

      expect(result.rows.map((row) => row.status)).toEqual(['ready', 'invalid', 'ready']);
      expect(result.rows[1]?.issues).toEqual([
        expect.objectContaining({
          code: 'invalid_date',
          rowNumber: 3,
        }),
      ]);
    });

    it('rejects category defaults that do not match the row transaction type', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const incomeCategory = await seedCategory(userId, {
        name: 'Salary Bucket',
        type: TransactionType.INCOME,
      });

      const result = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          categoryId: incomeCategory.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        rowNumber: 2,
        status: 'invalid',
      });
      expect(result.rows[0]?.issues).toEqual([
        expect.objectContaining({
          code: 'category_type_mismatch',
          rowNumber: 2,
        }),
      ]);
    });

    it('classifies duplicate rows from existing transactions and repeated file rows', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      await seedTransaction(userId, {
        accountId: account.id,
        amount: 12.5,
        currency: CurrencyEnum.USD,
        date: '2026-05-08',
        note: 'Coffee',
        type: TransactionType.EXPENSE,
      });

      const result = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source:
          'Date,Description,Amount\n2026-05-08,Coffee,-12.50\n2026-05-10,Groceries,-40.00\n2026-05-10,Groceries,-40.00',
      });

      expect(result.summary).toEqual({
        duplicate: 2,
        invalid: 0,
        ready: 1,
        reviewRequired: 0,
        total: 3,
      });

      expect(result.rows[0]?.issues).toEqual([
        expect.objectContaining({
          code: 'duplicate_existing',
          rowNumber: 2,
        }),
      ]);
      expect(result.rows[1]).toMatchObject({ status: 'ready' });
      expect(result.rows[2]?.issues).toEqual([
        expect.objectContaining({
          code: 'duplicate_in_file',
          rowNumber: 4,
        }),
      ]);
    }, 15000);

    it('returns a parser issue before previewing rows when the CSV exceeds the row limit', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const oversizedSource = [
        'Date,Description,Amount',
        ...Array.from({ length: 501 }, (_, index) => {
          const day = String((index % 28) + 1).padStart(2, '0');

          return `2026-05-${day},Oversized Row ${index + 1},-1.00`;
        }),
      ].join('\n');

      const result = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source: oversizedSource,
      });

      expect(result).toMatchObject({
        parserIssues: [
          expect.objectContaining({
            code: 'row_limit_exceeded',
          }),
        ],
        rows: [],
        summary: {
          duplicate: 0,
          invalid: 0,
          ready: 0,
          reviewRequired: 0,
          total: 0,
        },
      });
    }, 15000);
  });

  describe('importCommit', () => {
    it('rolls back the whole commit when a preview-approved row becomes duplicate before insert', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const category = await seedCategory(userId, { type: TransactionType.EXPENSE });

      const preview = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source:
          'Date,Description,Amount,Reference\n2026-05-08,Coffee,-12.50,coffee-1\n2026-05-09,Groceries,-40.00,groceries-1',
      });

      expect(preview.summary).toEqual({
        duplicate: 0,
        invalid: 0,
        ready: 2,
        reviewRequired: 0,
        total: 2,
      });

      const approvedRows = buildApprovedRows(preview.rows, category.id);

      await seedTransaction(userId, {
        accountId: account.id,
        amount: 40,
        categoryId: category.id,
        currency: CurrencyEnum.USD,
        date: '2026-05-09',
        externalReference: 'groceries-1',
        importBatchId: 'competing-import-batch',
        importFingerprint: approvedRows[1]?.fingerprint,
        importSource: 'csv',
        note: 'Groceries',
        type: TransactionType.EXPENSE,
      });

      await expect(
        caller.transaction.importCommit({
          accountId: account.id,
          approvedRows,
          idempotencyKey: 'retry-blocked-batch',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });

      const importedTransactions = await AppDataSource.getRepository(Transaction).find({
        where: {
          importBatchId: 'retry-blocked-batch',
          userId,
        },
        order: { date: 'ASC' },
      });

      expect(importedTransactions).toEqual([]);
    }, 15000);

    it('returns the original batch result when the same idempotency key is retried', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const category = await seedCategory(userId, { type: TransactionType.EXPENSE });

      const preview = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source:
          'Date,Description,Amount,Reference\n2026-05-11,Coffee,-12.50,coffee-2\n2026-05-12,Groceries,-40.00,groceries-2',
      });

      const approvedRows = buildApprovedRows(preview.rows, category.id);

      const firstCommit = await caller.transaction.importCommit({
        accountId: account.id,
        approvedRows,
        idempotencyKey: 'stable-import-batch',
      });

      const secondCommit = await caller.transaction.importCommit({
        accountId: account.id,
        approvedRows,
        idempotencyKey: 'stable-import-batch',
      });

      expect(secondCommit).toEqual(firstCommit);

      const importedTransactions = await AppDataSource.getRepository(Transaction).find({
        where: {
          importBatchId: 'stable-import-batch',
          userId,
        },
        order: { date: 'ASC' },
      });

      expect(importedTransactions).toHaveLength(2);
      expect(importedTransactions.map((transaction) => transaction.importFingerprint)).toEqual(
        approvedRows.map((row) => row.fingerprint),
      );
    }, 15000);

    it('stores durable import metadata and reuses it for later duplicate previews', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const category = await seedCategory(userId, { type: TransactionType.EXPENSE });

      const preview = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source: 'Date,Description,Amount,Reference\n2026-05-13,Coffee,-12.50,coffee-3',
      });

      const approvedRows = buildApprovedRows(preview.rows, category.id);

      const commit = await caller.transaction.importCommit({
        accountId: account.id,
        approvedRows,
        idempotencyKey: 'traceable-import-batch',
      });

      const importedTransaction = await AppDataSource.getRepository(Transaction).findOneByOrFail({
        id: commit.createdTransactionIds[0],
        userId,
      });

      expect(importedTransaction).toMatchObject({
        externalReference: 'coffee-3',
        importBatchId: 'traceable-import-batch',
        importFingerprint: approvedRows[0]?.fingerprint,
        importSource: 'csv',
      });

      await AppDataSource.getRepository(Transaction).update(importedTransaction.id, {
        note: 'Edited note after import',
      });

      const duplicatePreview = await caller.transaction.importPreview({
        defaults: {
          accountId: account.id,
          currency: CurrencyEnum.USD,
          typeStrategy: 'signed_amount',
        },
        source: 'Date,Description,Amount,Reference\n2026-05-13,Coffee,-12.50,coffee-3',
      });

      expect(duplicatePreview.summary).toEqual({
        duplicate: 1,
        invalid: 0,
        ready: 0,
        reviewRequired: 0,
        total: 1,
      });
      expect(duplicatePreview.rows[0]?.issues).toEqual([
        expect.objectContaining({
          code: 'duplicate_existing',
          rowNumber: 2,
        }),
      ]);
    }, 15000);
  });

  describe('createTransfer', () => {
    it('should create same-currency transfer pairs', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Source' });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Destination' });

      const result = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 100,
        currency: CurrencyEnum.USD,
        date: '2025-01-15',
        note: 'Move cash',
      });

      expect(result).toHaveLength(2);
      expect(result[0].transferGroupId).toBe(result[1].transferGroupId);
      expect(result[0].transferDirection).toBe('OUTGOING');
      expect(result[1].transferDirection).toBe('INCOMING');
      expect(result[0].counterpartyAccountId).toBe(destination.id);
      expect(result[1].counterpartyAccountId).toBe(source.id);
    });

    it('should allow transfers from self accounts into third-party destinations', async () => {
      const source = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        name: 'Imported USD',
        ownership: 'self',
      });
      const destination = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        name: 'Landlord',
        ownership: 'third_party',
      });

      const result = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 100,
        currency: CurrencyEnum.USD,
        date: '2025-01-15',
        note: 'Rent transfer',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        accountId: source.id,
        counterpartyAccountId: destination.id,
      });
      expect(result[1]).toMatchObject({
        accountId: destination.id,
        counterpartyAccountId: source.id,
      });
    });

    it('should reject same-account and cross-currency transfers', async () => {
      const usdAccount = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const eurAccount = await seedAccount(userId, { currency: CurrencyEnum.EUR });

      await expect(
        caller.transaction.createTransfer({
          sourceAccountId: usdAccount.id,
          destinationAccountId: usdAccount.id,
          amount: 100,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.transaction.createTransfer({
          sourceAccountId: usdAccount.id,
          destinationAccountId: eurAccount.id,
          amount: 100,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message:
          'Cross-currency transfers are not supported in v1. Keep both transfer accounts in the same currency.',
      });
    });

    it('should reject third-party accounts as transfer sources', async () => {
      const landlordAccount = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        ownership: 'third_party',
      });
      const savingsAccount = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        ownership: 'self',
      });

      await expect(
        caller.transaction.createTransfer({
          sourceAccountId: landlordAccount.id,
          destinationAccountId: savingsAccount.id,
          amount: 100,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should update both transfer legs from one edit request', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Source' });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Destination' });
      const replacementSource = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        name: 'Replacement Source',
      });
      const replacementDestination = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        name: 'Replacement Destination',
      });

      const created = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 100,
        currency: CurrencyEnum.USD,
        date: '2025-01-15',
        note: 'Move cash',
      });

      const updated = await caller.transaction.updateTransfer({
        transactionId: created[0].id,
        sourceAccountId: replacementSource.id,
        destinationAccountId: replacementDestination.id,
        amount: 135,
        currency: CurrencyEnum.USD,
        date: '2025-02-01',
        note: 'Rebalanced',
      });

      expect(updated).toHaveLength(2);
      expect(updated[0].transferGroupId).toBe(created[0].transferGroupId);
      expect(updated[1].transferGroupId).toBe(created[0].transferGroupId);

      expect(updated[0]).toMatchObject({
        transferDirection: 'OUTGOING',
        accountId: replacementSource.id,
        counterpartyAccountId: replacementDestination.id,
        amount: 135,
        date: '2025-02-01',
        note: 'Rebalanced',
      });

      expect(updated[1]).toMatchObject({
        transferDirection: 'INCOMING',
        accountId: replacementDestination.id,
        counterpartyAccountId: replacementSource.id,
        amount: 135,
        date: '2025-02-01',
        note: 'Rebalanced',
      });
    }, 15000);

    it('should update the pair even when editing the incoming leg id', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Wallet' });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD, name: 'Savings' });

      const created = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 80,
        currency: CurrencyEnum.USD,
        date: '2025-01-18',
        note: 'First move',
      });

      const updated = await caller.transaction.updateTransfer({
        transactionId: created[1].id,
        sourceAccountId: destination.id,
        destinationAccountId: source.id,
        amount: 90,
        currency: CurrencyEnum.USD,
        date: '2025-01-19',
        note: 'Reverse move',
      });

      expect(updated).toHaveLength(2);

      const outgoing = updated.find(
        (item: (typeof updated)[number]) => item.transferDirection === 'OUTGOING',
      );
      const incoming = updated.find(
        (item: (typeof updated)[number]) => item.transferDirection === 'INCOMING',
      );

      expect(outgoing).toMatchObject({
        accountId: destination.id,
        counterpartyAccountId: source.id,
        amount: 90,
        date: '2025-01-19',
        note: 'Reverse move',
      });

      expect(incoming).toMatchObject({
        accountId: source.id,
        counterpartyAccountId: destination.id,
        amount: 90,
        date: '2025-01-19',
        note: 'Reverse move',
      });
    }, 15000);

    it('should reject transfer edits that collapse into one account', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const created = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 100,
        currency: CurrencyEnum.USD,
        date: '2025-01-15',
      });

      await expect(
        caller.transaction.updateTransfer({
          transactionId: created[0].id,
          sourceAccountId: source.id,
          destinationAccountId: source.id,
          amount: 100,
          currency: CurrencyEnum.USD,
          date: '2025-01-15',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll', () => {
    it('should return all transactions for the user', async () => {
      await seedTransaction(userId, { amount: 100 });
      await seedTransaction(userId, { amount: 200 });

      const result = await caller.transaction.getAll({});

      expect(result).toHaveLength(2);
    });

    it('should filter transactions by type', async () => {
      await seedTransaction(userId, { type: 'EXPENSE', amount: 100 });
      await seedTransaction(userId, { type: 'INCOME', amount: 200 });

      const result = await caller.transaction.getAll({ type: TransactionType.INCOME });

      expect(result).toHaveLength(1);
      expect(result?.[0].type).toBe(TransactionType.INCOME);
    });

    it('should return empty array when no transactions exist', async () => {
      const result = await caller.transaction.getAll({});

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a transaction by id', async () => {
      const transaction = await seedTransaction(userId, { amount: 150 });

      const result = await caller.transaction.getById({
        id: transaction.id,
      });

      expect(result).toBeDefined();
      expect(result?.amount).toBe(150);
    });

    it('should throw NOT_FOUND for missing transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.transaction.getById({
          id: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getBalance', () => {
    it('should return balance totals', async () => {
      await seedTransaction(userId, { type: 'EXPENSE', amount: 100, currency: 'USD', exchangeRate: 1 });
      await seedTransaction(userId, { type: 'INCOME', amount: 200, currency: 'USD', exchangeRate: 1 });

      const result = await caller.transaction.getBalance({});

      expect(result).toBeDefined();
      expect(result.expenses).toBeDefined();
      expect(result.incomes).toBeDefined();
      expect(result.savings).toBeDefined();
    });

    it('should ignore transfer rows in balance totals', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await seedTransaction(userId, {
        type: TransactionType.EXPENSE,
        amount: 40,
        currency: CurrencyEnum.USD,
        exchangeRate: 1,
        accountId: source.id,
      });

      await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 250,
        currency: CurrencyEnum.USD,
        date: '2025-01-20',
      });

      const result = await caller.transaction.getBalance({});

      expect(result.expenses.usd).toBe(40);
      expect(result.incomes.usd).toBe(0);
    }, 15000);
  });

  describe('setGoal', () => {
    it('should reject linking transfer rows to financial goals', async () => {
      const source = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const destination = await seedAccount(userId, { currency: CurrencyEnum.USD });
      const goal = await seedFinancialGoal(userId, {
        currency: CurrencyEnum.USD,
        type: 'SPEND_LESS',
      });

      const transfer = await caller.transaction.createTransfer({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 80,
        currency: CurrencyEnum.USD,
        date: '2025-01-22',
      });

      await expect(
        caller.transaction.setGoal({
          id: transfer[0].id,
          goalId: goal.id,
        }),
      ).rejects.toThrow(TRPCError);
    }, 15000);
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      const transaction = await seedTransaction(userId);

      const result = await caller.transaction.delete({
        id: transaction.id,
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw NOT_FOUND for missing transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.transaction.delete({
          id: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
