import pino, { type TransportSingleOptions } from 'pino';
import { config } from '../config';

const transport: TransportSingleOptions | undefined = ['LOCAL', 'TEST'].includes(config.env ?? '')
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    }
  : undefined;

export const logger = pino({
  level: 'trace',
  base: null,
  transport,
  nestedKey: 'data',
  serializers: {
    // Needed because errors don't get serialized when using nestedKey
    // biome-ignore lint/suspicious/noExplicitAny: pino serializer requires generic data input
    data: (data: any | Error) => {
      if (data instanceof Error) {
        return { err: pino.stdSerializers.err(data) };
      }

      if (data.err) {
        data.err = pino.stdSerializers.err(data.err);
      }

      return data;
    },
  },
});
