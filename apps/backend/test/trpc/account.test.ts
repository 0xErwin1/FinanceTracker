import { CurrencyEnum, TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { AppDataSource } from '../../src/data-source';
import { FxRate } from '../../src/entities';
import {
  createAuthenticatedCaller,
  seedAccount,
  seedInstallmentPlan,
  seedInstitution,
  seedRecurring,
  seedTransaction,
  seedUser,
  truncateAllTables,
} from './setup';

jest.setTimeout(15000);

describe('account router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.id;
    caller = createAuthenticatedCaller(userId);
  });

  it('creates an account with an optional institution', async () => {
    const institution = await seedInstitution();

    const result = await caller.account.create({
      name: 'Main Checking',
      currency: CurrencyEnum.USD,
      kind: 'checking',
      ownership: 'self',
      institutionId: institution.id,
    });

    expect(result.name).toBe('Main Checking');
    expect(result.currency).toBe(CurrencyEnum.USD);
    expect(result.kind).toBe('checking');
    expect(result.ownership).toBe('self');
    expect(result.institutionId).toBe(institution.id);
    expect(result.archivedAt).toBeNull();
  });

  it('creates third-party destination accounts without counting them as owned accounts implicitly', async () => {
    const result = await caller.account.create({
      name: 'Landlord',
      currency: CurrencyEnum.USD,
      kind: 'checking',
      ownership: 'third_party',
    });

    expect(result).toMatchObject({
      name: 'Landlord',
      ownership: 'third_party',
      currency: CurrencyEnum.USD,
    });

    const summaries = await caller.account.getSummaries();

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      accountId: result.id,
      ownership: 'third_party',
      currentBalance: 0,
    });
  });

  it('updates institution metadata for management screens', async () => {
    const institution = await seedInstitution({ name: 'Old Bank', code: 'OLD' });

    const result = await caller.account.updateInstitution({
      id: institution.id,
      name: 'New Bank',
      code: 'NEW',
    });

    expect(result.name).toBe('New Bank');
    expect(result.code).toBe('NEW');

    const institutions = await caller.account.getInstitutions();

    expect(institutions).toHaveLength(1);
    expect(institutions[0]).toMatchObject({
      id: institution.id,
      name: 'New Bank',
      code: 'NEW',
    });
  });

  it('deletes an institution when no accounts still reference it', async () => {
    const institution = await seedInstitution({ name: 'Disposable Bank', code: 'DISP' });

    await expect(caller.account.deleteInstitution({ id: institution.id })).resolves.toMatchObject({
      id: institution.id,
      name: 'Disposable Bank',
    });

    await expect(caller.account.deleteInstitution({ id: institution.id })).rejects.toThrow(TRPCError);

    const institutions = await caller.account.getInstitutions();

    expect(institutions).toEqual([]);
  });

  it('rejects deleting an institution while accounts still reference it', async () => {
    const institution = await seedInstitution({ name: 'Sticky Bank', code: 'STICKY' });

    await seedAccount(userId, {
      name: 'Primary checking',
      institutionId: institution.id,
      archivedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    await expect(caller.account.deleteInstitution({ id: institution.id })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Institution is still linked to one or more accounts',
    });

    const institutions = await caller.account.getInstitutions();

    expect(institutions).toHaveLength(1);
    expect(institutions[0]).toMatchObject({
      id: institution.id,
      name: 'Sticky Bank',
    });
  });

  it('updates account metadata and linked institution without changing account identity', async () => {
    const originalInstitution = await seedInstitution({ name: 'First Bank', code: 'FIRST' });
    const replacementInstitution = await seedInstitution({ name: 'Second Bank', code: 'SECOND' });
    const account = await seedAccount(userId, {
      name: 'Daily Cash',
      currency: CurrencyEnum.USD,
      kind: 'cash',
      ownership: 'self',
      institutionId: originalInstitution.id,
    });

    const updated = await caller.account.update({
      id: account.id,
      name: 'Primary Checking',
      kind: 'checking',
      ownership: 'custodial',
      institutionId: replacementInstitution.id,
    });

    expect(updated).toMatchObject({
      id: account.id,
      name: 'Primary Checking',
      kind: 'checking',
      ownership: 'custodial',
      institutionId: replacementInstitution.id,
    });
    expect(updated.archivedAt).toBeNull();

    const allAccounts = await caller.account.getAll();

    expect(allAccounts).toHaveLength(1);
    expect(allAccounts[0]).toMatchObject({
      id: account.id,
      name: 'Primary Checking',
      kind: 'checking',
      ownership: 'custodial',
      institutionId: replacementInstitution.id,
    });
  });

  it('returns summaries with signed balances and archived visibility', async () => {
    const activeAccount = await seedAccount(userId, { name: 'Daily', currency: CurrencyEnum.USD });
    const archivedAccount = await seedAccount(userId, {
      name: 'Old Savings',
      currency: CurrencyEnum.USD,
      archivedAt: new Date(),
    });

    await seedTransaction(userId, {
      accountId: activeAccount.id,
      type: TransactionType.INCOME,
      amount: 200,
      currency: CurrencyEnum.USD,
    });
    await seedTransaction(userId, {
      accountId: activeAccount.id,
      type: TransactionType.EXPENSE,
      amount: 50,
      currency: CurrencyEnum.USD,
    });
    await seedTransaction(userId, {
      accountId: archivedAccount.id,
      type: TransactionType.INCOME,
      amount: 10,
      currency: CurrencyEnum.USD,
    });

    const summaries = await caller.account.getSummaries();

    expect(summaries).toHaveLength(2);

    const daily = summaries.find((summary) => summary.accountId === activeAccount.id);
    const oldSavings = summaries.find((summary) => summary.accountId === archivedAccount.id);

    expect(daily).toMatchObject({ currentBalance: 150, archivedAt: null });
    expect(oldSavings).toMatchObject({ currentBalance: 10 });
    expect(oldSavings?.archivedAt).not.toBeNull();
  });

  it('returns an estimated valuation snapshot without counting third-party destinations', async () => {
    const user = await seedUser({
      email: 'valuation-account@example.com',
      reportingCurrency: CurrencyEnum.USD,
      valuationFreshnessDays: 3,
    });
    const valuationCaller = createAuthenticatedCaller(user.id);

    const ownedUsd = await seedAccount(user.id, {
      name: 'Checking',
      currency: CurrencyEnum.USD,
      ownership: 'self',
    });
    const ownedEur = await seedAccount(user.id, {
      name: 'Brokerage',
      currency: CurrencyEnum.EUR,
      ownership: 'custodial',
    });
    const destination = await seedAccount(user.id, {
      name: 'Landlord',
      currency: CurrencyEnum.EUR,
      ownership: 'third_party',
    });

    await seedTransaction(user.id, {
      accountId: ownedUsd.id,
      type: TransactionType.INCOME,
      amount: 200,
      currency: CurrencyEnum.USD,
      date: '2026-04-18',
    });
    await seedTransaction(user.id, {
      accountId: ownedEur.id,
      type: TransactionType.INCOME,
      amount: 50,
      currency: CurrencyEnum.EUR,
      date: '2026-04-18',
    });
    await seedTransaction(user.id, {
      accountId: destination.id,
      type: TransactionType.INCOME,
      amount: 999,
      currency: CurrencyEnum.EUR,
      date: '2026-04-18',
    });

    await AppDataSource.getRepository(FxRate).save(
      AppDataSource.getRepository(FxRate).create({
        userId: user.id,
        baseCurrency: CurrencyEnum.EUR,
        quoteCurrency: CurrencyEnum.USD,
        rate: 1.1,
        effectiveDate: '2026-04-18',
        sourceLabel: 'Manual close',
      }),
    );

    await expect(valuationCaller.account.getValuationSnapshot()).resolves.toEqual({
      reportingCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-19',
      coverage: 'complete',
      estimatedTotal: 255,
      nativeTotals: {
        EUR: 50,
        USD: 200,
      },
      coveredCurrencies: [CurrencyEnum.EUR, CurrencyEnum.USD],
      missingCurrencies: [],
      staleCurrencies: [],
      sourceLabels: ['Manual close'],
      effectiveDates: ['2026-04-18'],
    });
  });

  it('archives accounts without removing them from summaries', async () => {
    const account = await seedAccount(userId, { name: 'Archive Me' });

    const archived = await caller.account.archive({ id: account.id });
    const activeAccounts = await caller.account.getActive({});
    const allAccounts = await caller.account.getAll();

    expect(archived.archivedAt).not.toBeNull();
    expect(activeAccounts).toHaveLength(0);
    expect(allAccounts).toHaveLength(1);
    expect(allAccounts[0].archivedAt).not.toBeNull();
  });

  it('returns a deletable state and permanently deletes an unused account', async () => {
    const account = await seedAccount(userId, {
      name: 'Temporary cash envelope',
      archivedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    await expect(caller.account.getDeletionState({ id: account.id })).resolves.toEqual({
      accountId: account.id,
      canDelete: true,
      blockers: {
        linkedTransactions: 0,
        transferReferences: 0,
        recurringTemplates: 0,
        installmentPlans: 0,
      },
      message: 'This account is unused and can be deleted permanently.',
    });

    await expect(caller.account.delete({ id: account.id })).resolves.toMatchObject({
      id: account.id,
      name: 'Temporary cash envelope',
    });

    await expect(caller.account.getDeletionState({ id: account.id })).rejects.toThrow(TRPCError);
    await expect(caller.account.delete({ id: account.id })).rejects.toThrow(TRPCError);
    await expect(caller.account.getAll()).resolves.toEqual([]);
  });

  it('blocks deleting accounts that still fund transactions, recurring templates, or installment plans', async () => {
    const account = await seedAccount(userId, {
      name: 'Protected checking',
    });

    await seedTransaction(userId, {
      accountId: account.id,
      currency: account.currency,
    });

    await seedRecurring(userId, {
      accountId: account.id,
      currency: account.currency,
    });

    await seedInstallmentPlan(userId, {
      accountId: account.id,
      currency: account.currency,
    });

    await expect(caller.account.getDeletionState({ id: account.id })).resolves.toEqual({
      accountId: account.id,
      canDelete: false,
      blockers: {
        linkedTransactions: 1,
        transferReferences: 0,
        recurringTemplates: 1,
        installmentPlans: 1,
      },
      message:
        'This account cannot be deleted because it is still referenced by 1 transaction, 1 recurring template, and 1 installment plan. Keep it archived instead of deleting it.',
    });

    await expect(caller.account.delete({ id: account.id })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('counts transfer counterpart references when deciding whether deletion is safe', async () => {
    const sourceAccount = await seedAccount(userId, { name: 'Source checking' });
    const destinationAccount = await seedAccount(userId, {
      name: 'Landlord destination',
      ownership: 'third_party',
    });

    await seedTransaction(userId, {
      accountId: sourceAccount.id,
      counterpartyAccountId: destinationAccount.id,
      transferGroupId: 'd6703cf8-e1a2-4305-834f-b822f7ff82a6',
      transferDirection: 'OUTGOING',
      currency: sourceAccount.currency,
      categoryId: null,
      type: TransactionType.EXPENSE,
    });

    await expect(caller.account.getDeletionState({ id: destinationAccount.id })).resolves.toEqual({
      accountId: destinationAccount.id,
      canDelete: false,
      blockers: {
        linkedTransactions: 0,
        transferReferences: 1,
        recurringTemplates: 0,
        installmentPlans: 0,
      },
      message:
        'This account cannot be deleted because it is still referenced by 1 transfer link. Keep it archived instead of deleting it.',
    });

    await expect(caller.account.delete({ id: destinationAccount.id })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('rejects creating an account with a missing institution', async () => {
    const { v4: uuidv4 } = await import('uuid');

    await expect(
      caller.account.create({
        name: 'Broken Account',
        currency: CurrencyEnum.USD,
        kind: 'checking',
        ownership: 'self',
        institutionId: uuidv4(),
      }),
    ).rejects.toThrow(TRPCError);
  });

  it('rejects updating an account with a missing institution', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const account = await seedAccount(userId, { name: 'Broken Update' });

    await expect(
      caller.account.update({
        id: account.id,
        name: 'Still Broken',
        kind: 'checking',
        ownership: 'self',
        institutionId: uuidv4(),
      }),
    ).rejects.toThrow(TRPCError);
  });
});
