describe('getDataSourceLogging', () => {
  it('uses verbose logging only for local development', async () => {
    const { getDataSourceLogging } = await import('../src/data-source');

    expect(getDataSourceLogging('LOCAL')).toBe('all');
  });

  it('limits test and production logging to errors', async () => {
    const { getDataSourceLogging } = await import('../src/data-source');

    expect(getDataSourceLogging('TEST')).toEqual(['error']);
    expect(getDataSourceLogging('PROD')).toEqual(['error']);
  });
});
