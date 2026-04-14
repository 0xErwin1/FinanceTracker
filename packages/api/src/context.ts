// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Context {
  // biome-ignore lint/suspicious/noExplicitAny: Express req/res types are intentionally opaque in shared package
  req: any;
  // biome-ignore lint/suspicious/noExplicitAny: Express req/res types are intentionally opaque in shared package
  res: any;
  userId: string | null;
}

export async function createContext(opts: { req: any; res: any }): Promise<Context> {
  return {
    req: opts.req,
    res: opts.res,
    userId: null,
  };
}
