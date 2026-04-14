import type { Response } from 'supertest';
import { Helper } from '.';
import type { TransactionType } from '../../src/enums';
import { CategoryModel } from '../../src/models';
import type { CategoryCSV } from '../../src/types/csv';
import type { CreateCategoryRequest } from '../../src/types/request/category';
import { genericFactory } from '../factories';
import type { RequestOptions } from '../types/generic';
import { parseCSV } from '../utils';

export class CategoryHelper extends Helper {
  private endpoint = '/api/categories';
  readonly categoryIdByType: Map<TransactionType, string> = new Map<TransactionType, string>();

  public async createCategory(category: CreateCategoryRequest, options?: RequestOptions): Promise<Response> {
    const request = this.request.post(this.endpoint).set(genericFactory.buildHeader());

    if (!options?.notIncludeToken) {
      request.set('Cookie', this.cookieMock);
    }

    return await request.send(category);
  }

  public async getCategories(options: RequestOptions): Promise<Response> {
    const request = this.request.get(this.endpoint).set(genericFactory.buildHeader());

    if (!options.notIncludeToken) {
      request.set('Cookie', this.cookieMock);
    }

    return await request.send();
  }

  public async deleteCategory(categoryId: string, options: RequestOptions): Promise<Response> {
    const request = this.request.delete(`${this.endpoint}/${categoryId}`).set(genericFactory.buildHeader());

    if (!options.notIncludeToken) {
      request.set('Cookie', this.cookieMock);
    }

    return await request.send();
  }

  public async getCategory(categoryId: string, options: RequestOptions): Promise<Response> {
    const request = this.request.get(`${this.endpoint}/${categoryId}`).set(genericFactory.buildHeader());

    if (!options.notIncludeToken) {
      request.set('Cookie', this.cookieMock);
    }

    return await request.send();
  }

  public async createUserFromCSV(userId: string) {
    const categories: CategoryCSV[] = await parseCSV<CategoryCSV>('../mock/seeds/categories.csv');

    for (const category of categories) {
      this.categoryIdByType.set(category.type as TransactionType, category.category_id);

      await CategoryModel.create({
        categoryId: category.category_id,
        type: category.type,
        name: category.name,
        userId,
      } as CategoryModel);
    }
  }
}
