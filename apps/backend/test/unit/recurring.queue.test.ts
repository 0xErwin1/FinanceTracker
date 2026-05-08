const queueRemoveRepeatableByKey = jest.fn().mockResolvedValue(undefined);
const queueAdd = jest.fn().mockResolvedValue(undefined);
const queueConstructor = jest.fn().mockImplementation(() => ({
  removeRepeatableByKey: queueRemoveRepeatableByKey,
  add: queueAdd,
}));

jest.mock('bullmq', () => ({
  Queue: queueConstructor,
  Worker: jest.fn(),
}));

import { scheduleRecurringJob, unscheduleRecurringJob } from '../../src/queues/recurring.queue';

describe('recurring queue test isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips scheduling recurring jobs when ENV=test', async () => {
    await scheduleRecurringJob({ id: 'recurring-1', dayOfMonth: 15 });

    expect(queueConstructor).not.toHaveBeenCalled();
    expect(queueRemoveRepeatableByKey).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('skips unscheduling recurring jobs when ENV=test', async () => {
    await unscheduleRecurringJob('recurring-1');

    expect(queueConstructor).not.toHaveBeenCalled();
    expect(queueRemoveRepeatableByKey).not.toHaveBeenCalled();
  });
});
