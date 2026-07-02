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
    errMsg: string = "Data Not Found",
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
      errMsg,
      404,
    );
  }

  async getOne(
    selector: {} = {},
    operator: SQL | undefined,
    errMsg: string = "Data Not Found",
  ) {
    return await this.resolveRead(
      db.select(selector).from(this.model).where(operator).limit(1),
      errMsg,
      404,
    );
  }
  async exists(operator: SQL | undefined) {
    const result = await db.select().from(this.model).where(operator).limit(1);
    return result.length > 0;
  }

  async create(data: {}[] | {}, errMsg: string = "Error While Creating Data") {
    return this.resolveWrite(
      db.insert(this.model).values(data).$returningId(),
      errMsg,
      500,
    );
  }

  async update(
    data: {},
    operator: SQL | undefined,
    errMsg: string = "Error While Updating Data",
  ) {
    return await this.resolveWrite(
      db.update(this.model).set(data).where(operator),
      errMsg,
      500,
    );
  }

  async delete(
    operator: SQL | undefined,
    errMsg: string = "Error While Deleting Data",
  ) {
    return await this.resolveWrite(
      db.delete(this.model).where(operator),
      errMsg,
      500,
    );
  }

  async leftJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL,
    whereOperator?: SQL,
    errMsg: string = "Data Not Found in database",
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
      errMsg,
      404,
    );
  }

  async rightJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL,
    whereOperator?: SQL,
    errMsg: string = "Data Not Found",
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
      errMsg,
      404,
    );
  }

  async innerJoin(
    s_model: any,
    selector: {},
    joinOperator: SQL | undefined,
    whereOperator?: SQL,
    errMsg: string = "Data Not Found",
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
      errMsg,
      404,
    );
  }

  private async resolveRead(
    query: Promise<any[]>,
    errMessage: string,
    statusCode: number = 404,
  ) {
    const result = await query;
    console.log(result);
    if (!result || result.length === 0) {
      throw new ApiError(errMessage, statusCode);
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
      throw new ApiError(errMessage, statusCode);
    }
    return result;
  }
}

export default Query;
