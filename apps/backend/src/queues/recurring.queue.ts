import { Queue, Worker } from 'bullmq';
import { AppDataSource } from '../data-source';
import { Account, Category, RecurringTransaction, Transaction } from '../entities';
import { logger } from '../lib';
import { closeBullMQConnection, getBullMQConnection } from './connection';

const QUEUE_NAME = 'recurring-transactions';

export interface RecurringJobData {
  recurringTransactionId: string;
  userId: string;
}

let queue: Queue<RecurringJobData> | undefined;
let worker: Worker<RecurringJobData> | undefined;

export function getQueue(): Queue<RecurringJobData> {
  if (!queue) {
    queue = new Queue<RecurringJobData>(QUEUE_NAME, {
      connection: getBullMQConnection(),
    });
  }

  return queue;
}

async function processor(job: { data: RecurringJobData }): Promise<void> {
  const { recurringTransactionId } = job.data;

  const templateRepo = AppDataSource.getRepository(RecurringTransaction);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  const template = await templateRepo.findOne({
    where: { id: recurringTransactionId },
  });

  if (!template) {
    logger.info({ recurringTransactionId }, 'recurring_template_not_found');
    return;
  }

  if (!template.active) {
    logger.info({ recurringTransactionId }, 'recurring_template_paused');
    return;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(template.dayOfMonth, daysInMonth);
  const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

  if (targetDate < template.startDate) {
    logger.info({ recurringTransactionId, targetDate }, 'recurring_before_start_date');
    return;
  }

  if (template.endDate && targetDate > template.endDate) {
    await templateRepo.update(recurringTransactionId, { active: false });
    await unscheduleRecurringJob(recurringTransactionId);
    logger.info({ recurringTransactionId, targetDate }, 'recurring_past_end_date_deactivated');
    return;
  }

  const existing = await transactionRepo
    .createQueryBuilder('transaction')
    .where('transaction.recurringTransactionId = :rid', { rid: recurringTransactionId })
    .andWhere('transaction.date = :date', { date: targetDate })
    .getOne();

  if (existing) {
    logger.info({ recurringTransactionId, targetDate }, 'recurring_already_generated');
    return;
  }

  if (template.categoryId) {
    const category = await AppDataSource.getRepository(Category).findOne({
      where: { id: template.categoryId },
    });

    if (!category) {
      logger.error(
        { recurringTransactionId, categoryId: template.categoryId },
        'recurring_category_not_found',
      );
      return;
    }
  }

  if (!template.accountId) {
    logger.error({ recurringTransactionId }, 'recurring_account_required');
    return;
  }

  const account = await AppDataSource.getRepository(Account).findOne({
    where: { id: template.accountId, userId: template.userId },
  });

  if (!account || account.archivedAt || account.currency !== template.currency) {
    logger.error({ recurringTransactionId, accountId: template.accountId }, 'recurring_account_invalid');
    return;
  }

  const transaction = transactionRepo.create({
    type: template.type,
    amount: template.amount,
    currency: template.currency,
    note: template.note ?? '',
    date: targetDate,
    exchangeRate: template.exchangeRate ?? null,
    userId: template.userId,
    accountId: template.accountId,
    categoryId: template.categoryId,
    goalId: template.goalId ?? null,
    recurringTransactionId: template.id,
  });

  await transactionRepo.save(transaction);

  await templateRepo.update(recurringTransactionId, { lastGeneratedAt: new Date() });

  logger.info(
    { recurringTransactionId, targetDate, transactionId: transaction.id },
    'recurring_transaction_generated',
  );
}

export function startWorker(): void {
  if (worker) return;

  worker = new Worker<RecurringJobData>(QUEUE_NAME, processor, {
    connection: getBullMQConnection(),
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, data: job?.data }, 'recurring_job_failed');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'recurring_job_completed');
  });
}

export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = undefined;
  }

  await closeBullMQConnection();
}

export async function scheduleRecurringJob(template: { id: string; dayOfMonth: number }): Promise<void> {
  try {
    const q = getQueue();
    const cron = `0 0 ${template.dayOfMonth} * *`;

    await q.removeRepeatableByKey(`recurring:${template.id}`);
    await q.add(
      'process',
      { recurringTransactionId: template.id, userId: '' },
      {
        jobId: `recurring:${template.id}`,
        repeat: { pattern: cron },
      },
    );
  } catch (err) {
    logger.error({ err, templateId: template.id }, 'schedule_recurring_job_failed');
  }
}

export async function unscheduleRecurringJob(templateId: string): Promise<void> {
  try {
    const q = getQueue();
    await q.removeRepeatableByKey(`recurring:${templateId}`);
  } catch (err) {
    logger.error({ err, templateId }, 'unschedule_recurring_job_failed');
  }
}

export async function reconcileRecurringJobs(): Promise<void> {
  const templateRepo = AppDataSource.getRepository(RecurringTransaction);
  const templates = await templateRepo.find({ where: { active: true } });

  logger.info({ count: templates.length }, 'recurring_reconciliation_start');

  for (const template of templates) {
    await scheduleRecurringJob(template);
  }

  logger.info('recurring_reconciliation_complete');
}
