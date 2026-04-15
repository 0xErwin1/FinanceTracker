import { TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedCategory,
  seedTransaction,
  seedUser,
  truncateAllTables,
} from './setup';

describe('category router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.id;
    caller = createAuthenticatedCaller(userId);
  });

  describe('create', () => {
    it('should create a category', async () => {
      const result = await caller.category.create({
        type: TransactionType.EXPENSE,
        name: 'Food',
        note: 'Groceries',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Food');
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.note).toBe('Groceries');
    });

    it('should create a category with icon and color', async () => {
      const result = await caller.category.create({
        type: TransactionType.EXPENSE,
        name: 'Food',
        icon: '🍔',
        color: '#FF5733',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Food');
      expect(result.icon).toBe('🍔');
      expect(result.color).toBe('#FF5733');
    });

    it('should reject invalid input (empty name)', async () => {
      await expect(
        caller.category.create({
          type: TransactionType.EXPENSE,
          name: '',
        }),
      ).rejects.toThrow();
    });

    it('should reject without authentication', async () => {
      await expect(
        publicCaller.category.create({
          type: TransactionType.EXPENSE,
          name: 'Food',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll', () => {
    it('should return all categories for the user', async () => {
      await seedCategory(userId, { name: 'Food' });
      await seedCategory(userId, { name: 'Transport', type: 'INCOME' });

      const result = await caller.category.getAll();

      expect(result).toHaveLength(2);
      expect(result.map((c: { name: string }) => c.name)).toEqual(
        expect.arrayContaining(['Food', 'Transport']),
      );
    });

    it('should return empty array when no categories exist', async () => {
      const result = await caller.category.getAll();

      expect(result).toEqual([]);
    });

    it('should reject without authentication', async () => {
      await expect(publicCaller.category.getAll()).rejects.toThrow(TRPCError);
    });
  });

  describe('getById', () => {
    it('should return a category by id', async () => {
      const category = await seedCategory(userId, { name: 'Food' });

      const result = await caller.category.getById({
        id: category.id,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Food');
    });

    it('should throw NOT_FOUND for missing category', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.category.getById({
          id: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid input (non-uuid)', async () => {
      await expect(
        caller.category.getById({
          id: 'not-a-uuid',
        }),
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a category without transactions', async () => {
      const category = await seedCategory(userId);

      const result = await caller.category.delete({
        id: category.id,
      });

      expect(result).toEqual({ success: true });
    });

    it('should delete a category with transactions when deleteTransactions=true', async () => {
      const category = await seedCategory(userId);

      await seedTransaction(userId, {
        categoryId: category.id,
      });

      const result = await caller.category.delete({
        id: category.id,
        deleteTransactions: true,
      });

      expect(result).toEqual({ success: true });
    });

    it('should reject without authentication', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        publicCaller.category.delete({
          id: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
