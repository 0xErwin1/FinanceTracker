import { TransactionType } from '../../src/enums';
import { type BodyRequest, CreateCategoryRequest } from '../../src/types/request/category';

const category: CreateCategoryRequest = new CreateCategoryRequest({
  name: 'Category example',
  note: 'Note Example',
  type: TransactionType.INCOME,
  userId: '',
});

function buildCategory(attributes: Partial<BodyRequest>): CreateCategoryRequest {
  return Object.assign({}, category, attributes);
}

export const categoryFactory = {
  category,
  buildCategory,
};
