/**
 * PGliteRepository — Repository<T> adapter backed by PGlite (raw SQL).
 * Used in the preview Web Worker. Translates Repository calls into
 * parameterized SQL queries via sql-utils.
 *
 * NO DDL generation here. Schema SQL comes from `prisma migrate diff`.
 */
import { Repository, RepositoryFactory, GroupByArgs, AggregateArgs } from './repository';
import {
  buildSelectQuery,
  buildCountQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  buildGroupByQuery,
  buildAggregateQuery,
  reshapeAggregateRow,
} from './sql-utils';

export class PGliteRepository<T = any> implements Repository<T> {
  constructor(
    private db: any, // PGlite instance
    private tableName: string,
  ) {}

  async findMany(args?: {
    where?: Record<string, any>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    skip?: number;
    take?: number;
  }): Promise<T[]> {
    const { sql, params } = buildSelectQuery(this.tableName, args);
    const result = await this.db.query(sql, params);
    return result.rows as T[];
  }

  async findUnique(args: { where: Record<string, any> }): Promise<T | null> {
    const { sql, params } = buildSelectQuery(this.tableName, {
      where: args.where,
      take: 1,
    });
    const result = await this.db.query(sql, params);
    return (result.rows[0] as T) || null;
  }

  async findFirst(args: { where: Record<string, any> }): Promise<T | null> {
    return this.findUnique(args);
  }

  async count(args?: { where?: Record<string, any> }): Promise<number> {
    const { sql, params } = buildCountQuery(this.tableName, args);
    const result = await this.db.query(sql, params);
    return result.rows[0]?.count ?? 0;
  }

  async create(args: { data: Record<string, any> }): Promise<T> {
    const { sql, params } = buildInsertQuery(this.tableName, args.data);
    const result = await this.db.query(sql, params);
    return result.rows[0] as T;
  }

  async update(args: { where: Record<string, any>; data: Record<string, any> }): Promise<T> {
    const { sql, params } = buildUpdateQuery(this.tableName, args.where, args.data);
    const result = await this.db.query(sql, params);
    if (!result.rows[0]) throw new Error(`Record not found in ${this.tableName}`);
    return result.rows[0] as T;
  }

  async delete(args: { where: Record<string, any> }): Promise<T> {
    const { sql, params } = buildDeleteQuery(this.tableName, args.where);
    const result = await this.db.query(sql, params);
    if (!result.rows[0]) throw new Error(`Record not found in ${this.tableName}`);
    return result.rows[0] as T;
  }

  /**
   * Real SQL GROUP BY, not rows fetched and counted in JavaScript. Parity with the Prisma host
   * is the point: the agent's query tool is written once, and it must not give a different
   * answer — or fall over on a large table — depending on which host is serving the preview.
   */
  async groupBy(args: GroupByArgs): Promise<Array<Record<string, any>>> {
    const { sql, params } = buildGroupByQuery(this.tableName, args);
    const result = await this.db.query(sql, params);
    return (result.rows as Array<Record<string, any>>).map(reshapeAggregateRow);
  }

  async aggregate(args: AggregateArgs): Promise<Record<string, any>> {
    const { sql, params } = buildAggregateQuery(this.tableName, args);
    const result = await this.db.query(sql, params);
    // An aggregate over an empty table still returns one row, so this is never undefined in
    // practice; the fallback is only here so a driver quirk cannot produce a crash.
    return reshapeAggregateRow(result.rows[0] ?? {});
  }
}

/**
 * PGliteRepositoryFactory — creates PGliteRepository instances by model name.
 * Maps model names to table names (lowercase by convention, matching Prisma default).
 */
export class PGliteRepositoryFactory implements RepositoryFactory {
  constructor(
    private db: any,
    private tableMap: Record<string, string>, // modelName -> tableName
  ) {}

  getRepository(modelName: string): Repository {
    const tableName = this.tableMap[modelName] || this.tableMap[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    if (!tableName) throw new Error(`Model "${modelName}" not found in table map`);
    return new PGliteRepository(this.db, tableName);
  }
}
