import type { AccountOwnership } from '@expenses/api';
import { AppDataSource } from '../data-source';
import { Account, InstallmentPlan, Institution, RecurringTransaction, Transaction } from '../entities';
import { ApiError, type CurrencyEnum, TransactionType } from '../enums';
import { CustomError, cacheInvalidateUser } from '../lib';
import type { AccountDTO, AccountSummaryDTO, InstitutionDTO } from '../types/DTOs';

interface CreateInstitutionInput {
  name: string;
  code?: string;
}

interface UpdateInstitutionInput {
  id: string;
  name: string;
  code?: string;
}

interface DeleteInstitutionInput {
  id: string;
}

interface CreateAccountInput {
  userId: string;
  name: string;
  currency: CurrencyEnum;
  institutionId?: string;
  kind: 'checking' | 'savings' | 'cash' | 'credit';
  ownership: AccountOwnership;
}

interface UpdateAccountInput {
  id: string;
  userId: string;
  name: string;
  institutionId?: string;
  kind: 'checking' | 'savings' | 'cash' | 'credit';
  ownership: AccountOwnership;
}

export interface AccountDeletionBlockers {
  linkedTransactions: number;
  transferReferences: number;
  recurringTemplates: number;
  installmentPlans: number;
}

export interface AccountDeletionState {
  accountId: string;
  canDelete: boolean;
  blockers: AccountDeletionBlockers;
  message: string;
}

const POSTING_OWNERSHIPS: AccountOwnership[] = ['self', 'custodial'];

const accountRepo = () => AppDataSource.getRepository(Account);
const institutionRepo = () => AppDataSource.getRepository(Institution);

function normalizeInstitutionName(name: string): string {
  return name.trim();
}

function normalizeInstitutionCode(code?: string): string | null {
  const normalized = code?.trim().toUpperCase() ?? '';

  return normalized.length > 0 ? normalized : null;
}

function normalizeAccountName(name: string): string {
  return name.trim();
}

function canPostDirectly(ownership: AccountOwnership): boolean {
  return POSTING_OWNERSHIPS.includes(ownership);
}

function buildOwnershipError(message: string) {
  const error = new CustomError(ApiError.Transaction.ACCOUNT_INVALID);
  error.message = message;

  return error;
}

function formatBlockerLabel(count: number, singular: string, plural: string): string | null {
  if (count === 0) {
    return null;
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

function formatBlockedDeletionMessage(blockers: AccountDeletionBlockers): string {
  const parts = [
    formatBlockerLabel(blockers.linkedTransactions, 'transaction', 'transactions'),
    formatBlockerLabel(blockers.transferReferences, 'transfer link', 'transfer links'),
    formatBlockerLabel(blockers.recurringTemplates, 'recurring template', 'recurring templates'),
    formatBlockerLabel(blockers.installmentPlans, 'installment plan', 'installment plans'),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return 'This account is unused and can be deleted permanently.';
  }

  if (parts.length === 1) {
    return `This account cannot be deleted because it is still referenced by ${parts[0]}. Keep it archived instead of deleting it.`;
  }

  const lastPart = parts.at(-1);
  const leading = parts.slice(0, -1).join(', ');

  return `This account cannot be deleted because it is still referenced by ${leading}, and ${lastPart}. Keep it archived instead of deleting it.`;
}

async function createInstitution(input: CreateInstitutionInput): Promise<InstitutionDTO> {
  const institution = institutionRepo().create({
    name: normalizeInstitutionName(input.name),
    code: normalizeInstitutionCode(input.code),
  });

  return institutionRepo().save(institution);
}

async function updateInstitution(input: UpdateInstitutionInput): Promise<InstitutionDTO> {
  const institution = await institutionRepo().findOne({ where: { id: input.id } });

  if (!institution) {
    throw new CustomError(ApiError.Account.INSTITUTION_NOT_EXIST);
  }

  institution.name = normalizeInstitutionName(input.name);
  institution.code = normalizeInstitutionCode(input.code);

  return institutionRepo().save(institution);
}

async function getInstitutions(): Promise<InstitutionDTO[]> {
  return institutionRepo().find({ order: { name: 'ASC' } });
}

async function getInstitutionOrFail(institutionId: string): Promise<Institution> {
  const institution = await institutionRepo().findOne({ where: { id: institutionId } });

  if (!institution) {
    throw new CustomError(ApiError.Account.INSTITUTION_NOT_EXIST);
  }

  return institution;
}

async function deleteInstitution(input: DeleteInstitutionInput): Promise<InstitutionDTO> {
  const institution = await getInstitutionOrFail(input.id);
  const linkedAccounts = await accountRepo().count({ where: { institutionId: input.id } });

  if (linkedAccounts > 0) {
    throw new CustomError(ApiError.Account.INSTITUTION_IN_USE);
  }

  const deletedInstitution: InstitutionDTO = {
    id: institution.id,
    name: institution.name,
    code: institution.code,
    createdAt: institution.createdAt,
  };

  await institutionRepo().remove(institution);

  return deletedInstitution;
}

async function ensureInstitutionExists(institutionId?: string): Promise<void> {
  if (!institutionId) {
    return;
  }

  await getInstitutionOrFail(institutionId);
}

async function createAccount(input: CreateAccountInput): Promise<AccountDTO> {
  await ensureInstitutionExists(input.institutionId);

  const account = accountRepo().create({
    userId: input.userId,
    name: normalizeAccountName(input.name),
    currency: input.currency,
    institutionId: input.institutionId ?? null,
    kind: input.kind,
    ownership: input.ownership,
    archivedAt: null,
    importSource: null,
    externalReference: null,
  });

  const saved = await accountRepo().save(account);
  await cacheInvalidateUser(input.userId);

  return saved;
}

async function getAllAccounts(userId: string): Promise<AccountDTO[]> {
  return accountRepo().find({
    where: { userId },
    relations: ['institution'],
    order: { createdAt: 'ASC' },
  });
}

async function getActiveAccounts(userId: string, currency?: CurrencyEnum): Promise<AccountDTO[]> {
  const qb = accountRepo()
    .createQueryBuilder('account')
    .leftJoinAndSelect('account.institution', 'institution')
    .where('account.userId = :userId', { userId })
    .andWhere('account.archivedAt IS NULL')
    .orderBy('account.createdAt', 'ASC');

  if (currency) {
    qb.andWhere('account.currency = :currency', { currency });
  }

  return qb.getMany();
}

async function getAccountOrFail(accountId: string, userId: string): Promise<Account> {
  const account = await accountRepo().findOne({ where: { id: accountId, userId } });

  if (!account) {
    throw new CustomError(ApiError.Account.ACCOUNT_NOT_EXIST);
  }

  return account;
}

async function updateAccount(input: UpdateAccountInput): Promise<AccountDTO> {
  await ensureInstitutionExists(input.institutionId);

  const account = await getAccountOrFail(input.id, input.userId);

  account.name = normalizeAccountName(input.name);
  account.kind = input.kind;
  account.ownership = input.ownership;
  account.institutionId = input.institutionId ?? null;

  const updated = await accountRepo().save(account);
  await cacheInvalidateUser(input.userId);

  return updated;
}

async function getOwnedActiveAccount(
  accountId: string,
  userId: string,
  currency?: CurrencyEnum,
): Promise<Account> {
  const account = await getAccountOrFail(accountId, userId);

  if (account.archivedAt) {
    throw new CustomError(ApiError.Account.ACCOUNT_ARCHIVED);
  }

  if (currency && account.currency !== currency) {
    throw new CustomError(ApiError.Transaction.ACCOUNT_CURRENCY_MISMATCH);
  }

  return account;
}

async function getPostingAccount(
  accountId: string,
  userId: string,
  currency?: CurrencyEnum,
): Promise<Account> {
  const account = await getOwnedActiveAccount(accountId, userId, currency);

  if (!canPostDirectly(account.ownership)) {
    throw buildOwnershipError('Third-party accounts can only be used as transfer destinations.');
  }

  return account;
}

async function getTransferSourceAccount(
  accountId: string,
  userId: string,
  currency?: CurrencyEnum,
): Promise<Account> {
  const account = await getOwnedActiveAccount(accountId, userId, currency);

  if (!canPostDirectly(account.ownership)) {
    throw buildOwnershipError('Third-party accounts cannot fund transfers.');
  }

  return account;
}

async function getTransferDestinationAccount(
  accountId: string,
  userId: string,
  currency?: CurrencyEnum,
): Promise<Account> {
  return getOwnedActiveAccount(accountId, userId, currency);
}

async function archiveAccount(accountId: string, userId: string): Promise<AccountDTO> {
  const account = await getAccountOrFail(accountId, userId);

  if (!account.archivedAt) {
    account.archivedAt = new Date();
    await accountRepo().save(account);
    await cacheInvalidateUser(userId);
  }

  return account;
}

async function getAccountDeletionState(accountId: string, userId: string): Promise<AccountDeletionState> {
  const account = await getAccountOrFail(accountId, userId);

  const [linkedTransactions, transferReferences, recurringTemplates, installmentPlans] = await Promise.all([
    AppDataSource.getRepository(Transaction)
      .createQueryBuilder('transaction')
      .withDeleted()
      .where('transaction.accountId = :accountId', { accountId: account.id })
      .getCount(),
    AppDataSource.getRepository(Transaction)
      .createQueryBuilder('transaction')
      .withDeleted()
      .where('transaction.counterpartyAccountId = :accountId', { accountId: account.id })
      .getCount(),
    AppDataSource.getRepository(RecurringTransaction)
      .createQueryBuilder('recurring')
      .withDeleted()
      .where('recurring.accountId = :accountId', { accountId: account.id })
      .getCount(),
    AppDataSource.getRepository(InstallmentPlan)
      .createQueryBuilder('installmentPlan')
      .withDeleted()
      .where('installmentPlan.accountId = :accountId', { accountId: account.id })
      .getCount(),
  ]);

  const blockers = {
    linkedTransactions,
    transferReferences,
    recurringTemplates,
    installmentPlans,
  };

  return {
    accountId: account.id,
    canDelete: Object.values(blockers).every((count) => count === 0),
    blockers,
    message: formatBlockedDeletionMessage(blockers),
  };
}

async function deleteAccount(accountId: string, userId: string): Promise<AccountDTO> {
  const account = await getAccountOrFail(accountId, userId);
  const deletionState = await getAccountDeletionState(accountId, userId);

  if (!deletionState.canDelete) {
    const error = new CustomError(ApiError.Account.ACCOUNT_IN_USE);
    error.message = deletionState.message;

    throw error;
  }

  const deletedAccount: AccountDTO = {
    id: account.id,
    userId: account.userId,
    name: account.name,
    currency: account.currency,
    kind: account.kind,
    ownership: account.ownership,
    institutionId: account.institutionId,
    importSource: account.importSource,
    externalReference: account.externalReference,
    archivedAt: account.archivedAt,
    createdAt: account.createdAt,
  };

  await accountRepo().remove(account);
  await cacheInvalidateUser(userId);

  return deletedAccount;
}

async function getAccountSummaries(userId: string): Promise<AccountSummaryDTO[]> {
  const accounts = await accountRepo().find({
    where: { userId },
    relations: ['institution'],
    order: { createdAt: 'ASC' },
  });

  const rawSummaries = await AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .select('transaction.accountId', 'accountId')
    .addSelect(
      `COALESCE(SUM(CASE
        WHEN transaction.type = :incomeType THEN transaction.amount
        WHEN transaction.type = :expenseType THEN -transaction.amount
        ELSE 0
      END), 0)`,
      'currentBalance',
    )
    .addSelect('MAX(transaction.date)', 'lastTransactionDate')
    .where('transaction.userId = :userId', { userId })
    .andWhere('transaction.accountId IS NOT NULL')
    .groupBy('transaction.accountId')
    .setParameters({
      incomeType: TransactionType.INCOME,
      expenseType: TransactionType.EXPENSE,
    })
    .getRawMany<{ accountId: string; currentBalance: string; lastTransactionDate: string | null }>();

  const summaryMap = new Map(rawSummaries.map((summary) => [summary.accountId, summary]));

  return accounts.map((account) => {
    const summary = summaryMap.get(account.id);

    return {
      accountId: account.id,
      name: account.name,
      currency: account.currency,
      ownership: account.ownership,
      archivedAt: account.archivedAt,
      institutionId: account.institutionId,
      currentBalance: summary ? Number.parseFloat(summary.currentBalance) : 0,
      lastTransactionDate: summary?.lastTransactionDate ?? null,
    };
  });
}

export const accountService = {
  createInstitution,
  updateInstitution,
  getInstitutions,
  deleteInstitution,
  createAccount,
  updateAccount,
  getAllAccounts,
  getActiveAccounts,
  getOwnedActiveAccount,
  getPostingAccount,
  getTransferSourceAccount,
  getTransferDestinationAccount,
  archiveAccount,
  getAccountDeletionState,
  deleteAccount,
  getAccountSummaries,
};
