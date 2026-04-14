import { check, param } from 'express-validator';
import { TransactionType } from '../enums';

const createCategory = [
  check('type', 'Please enter a type').notEmpty().trim().isIn(Object.values(TransactionType)),
  check('name', 'Please enter a name').notEmpty().isString().trim(),
  check('note', 'Please enter a note').optional().notEmpty().trim(),
];

const getCategory = [param('categoryId', 'Please enter a category Id').isUUID()];

export const categoryValidation = {
  createCategory,
  getCategory,
};
