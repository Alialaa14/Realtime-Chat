import { db } from "../index.ts";
import {
  SQL,
  type SQLWrapper,
  Column,
  asc,
  type BinaryOperator,
  desc,
  getTableColumns,
} from "drizzle-orm";
import ApiError from "./ApiError.ts";

// Impelement Query Class To Database
/*
Params of Constructor : 
1 : Model 
*/

class Query {
  model: any;
  constructor(model: any) {
    this.model = model;
  }

  async getAll(
    selector: {} = {},
    whereOperator?: SQL,
    limit: number = 10,
    page: number = 1,
    order: typeof asc = asc,
    sortBy?: Column,
  ) {
    const skip = (page - 1) * limit;
    const columns = getTableColumns(this.model);
    const column =
      sortBy ?? columns?.id ?? (Object.values(columns)[0] as Column);
    return await this.resolveRead(
      db
        .select(selector)
        .from(this.model)
        .where(whereOperator)
        .limit(limit)
        .offset(skip)
        .orderBy(order(column)),
      "Data Not Found",
      404,
    );
  }

  async getOne(selector: {} = {}, operator: SQL) {
    return await this.resolveRead(
      db.select(selector).from(this.model).where(operator),
      "Data Not Found",
      404,
    );
  }

  async create(data: {}[] | {}) {
    return this.resolveWrite(
      db.insert(this.model).values(data).$returningId(),
      "Error While Creating Data",
      500,
    );
  }

  async update(data: {}, operator: SQL) {
    return await this.resolveWrite(
      db.update(this.model).set(data).where(operator),
      "Error While Updating Data",
      500,
    );
  }

  async delete(operator: SQL) {
    return await this.resolveWrite(
      db.delete(this.model).where(operator),
      "Error While Deleting Data",
      500,
    );
  }

  async leftJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL,
    whereOperator?: SQL,
    limit: number = 10,
    page: number = 1,
    order: typeof asc = asc,
    sortBy?: Column,
  ) {
    const skip = (page - 1) * limit;
    const columns = getTableColumns(this.model);
    const column =
      sortBy ?? columns?.id ?? (Object.values(columns)[0] as Column);
    return await this.resolveRead(
      db
        .select(selector)
        .from(this.model)
        .leftJoin(s_model, joinOperator)
        .where(whereOperator)
        .limit(limit)
        .offset(skip)
        .orderBy(order(column)),
      "Data Not Found",
      404,
    );
  }

  async rightJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL,
    whereOperator?: SQL,
    limit: number = 10,
    page: number = 1,
    order: typeof asc = asc,
    sortBy?: Column,
  ) {
    const skip = (page - 1) * limit;
    const columns = getTableColumns(this.model);
    const column =
      sortBy ?? columns?.id ?? (Object.values(columns)[0] as Column);
    return await this.resolveRead(
      db
        .select(selector)
        .from(this.model)
        .rightJoin(s_model, joinOperator)
        .where(whereOperator)
        .limit(limit)
        .offset(skip)
        .orderBy(order(column)),
      "Data Not Found",
      404,
    );
  }

  async innerJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL,
    whereOperator?: SQL,
    limit: number = 10,
    page: number = 1,
    order: typeof asc = asc,
    sortBy?: Column,
  ) {
    const skip = (page - 1) * limit;
    const columns = getTableColumns(this.model);
    const column =
      sortBy ?? columns?.id ?? (Object.values(columns)[0] as Column);

    return await this.resolveRead(
      db
        .select(selector)
        .from(this.model)
        .innerJoin(s_model, joinOperator)
        .where(whereOperator)
        .limit(limit)
        .offset(skip)
        .orderBy(order(column)),
      "Data Not Found",
      404,
    );
  }

  private async resolveRead(
    query: Promise<any[]>,
    errMessage: string,
    statusCode: number = 404,
  ) {
    const result = await query;
    if (!result || result.length === 0) {
      throw new ApiError(errMessage || "Data Not Found", statusCode);
    }
    return result;
  }

  private async resolveWrite(
    query: Promise<any>,
    errMessage: string,
    statusCode: number = 500,
  ) {
    const result = await query;
    if (!result) {
      throw new ApiError(errMessage || "Operation Failed", statusCode);
    }
    return result;
  }
}

export default Query;
