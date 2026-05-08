import { CurrencyEnum, type TransactionImportMappingDTO, TransactionType } from '@expenses/api';
import {
  buildImportFingerprint,
  resolveImportPreviewMapping,
  TransactionImportMappingError,
} from '../../src/services/transaction-import.service';

describe('transaction import preview helpers', () => {
  describe('resolveImportPreviewMapping', () => {
    it('infers required mappings from common bank headers', () => {
      const mapping = resolveImportPreviewMapping(['Booking Date', 'Details', 'Amount']);

      expect(mapping).toEqual({
        amount: 'Amount',
        date: 'Booking Date',
        description: 'Details',
      });
    });

    it('preserves explicit overrides and reports missing required fields', () => {
      const explicitMapping: TransactionImportMappingDTO = {
        credit: 'Money In',
        date: 'Booked On',
      };

      expect(() =>
        resolveImportPreviewMapping(['Booked On', 'Money In', 'Reference'], explicitMapping),
      ).toThrow(TransactionImportMappingError);

      try {
        resolveImportPreviewMapping(['Booked On', 'Money In', 'Reference'], explicitMapping);
      } catch (error) {
        expect(error).toBeInstanceOf(TransactionImportMappingError);

        if (!(error instanceof TransactionImportMappingError)) {
          throw error;
        }

        expect(error.issues).toEqual([
          expect.objectContaining({
            code: 'mapping_required',
            field: 'description',
          }),
        ]);
      }
    });
  });

  describe('buildImportFingerprint', () => {
    it('is deterministic for semantically equivalent rows', () => {
      const first = buildImportFingerprint({
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        normalized: {
          amount: 12.5,
          date: '2026-05-08',
          description: 'Coffee Shop',
          externalReference: 'abc-123',
          type: TransactionType.EXPENSE,
        },
        userId: 'user-1',
      });

      const second = buildImportFingerprint({
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        normalized: {
          amount: 12.5,
          date: '2026-05-08',
          description: '  coffee   shop ',
          externalReference: 'ABC-123',
          type: TransactionType.EXPENSE,
        },
        userId: 'user-1',
      });

      expect(first).toBe(second);
    });

    it('changes when the normalized transaction meaning changes', () => {
      const expenseFingerprint = buildImportFingerprint({
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        normalized: {
          amount: 50,
          date: '2026-05-08',
          description: 'Transfer',
          externalReference: null,
          type: TransactionType.EXPENSE,
        },
        userId: 'user-1',
      });

      const incomeFingerprint = buildImportFingerprint({
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        normalized: {
          amount: 50,
          date: '2026-05-08',
          description: 'Transfer',
          externalReference: null,
          type: TransactionType.INCOME,
        },
        userId: 'user-1',
      });

      expect(expenseFingerprint).not.toBe(incomeFingerprint);
    });
  });
});
