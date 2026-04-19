import { CurrencyEnum, TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
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
      ).rejects.toThrow(TRPCError);
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
