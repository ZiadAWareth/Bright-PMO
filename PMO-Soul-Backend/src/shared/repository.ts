/**
 * Repository<T> — framework-agnostic data access interface.
 * Production: implemented by PrismaRepository (wraps Prisma delegate).
 * Preview:    implemented by PGliteRepository (raw SQL against PGlite).
 */

export interface FindManyArgs {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  include?: Record<string, boolean | object>;
}

export interface FindUniqueArgs {
  where: Record<string, any>;
  include?: Record<string, boolean | object>;
}

export interface CreateArgs {
  data: Record<string, any>;
}

export interface UpdateArgs {
  where: Record<string, any>;
  data: Record<string, any>;
}

export interface DeleteArgs {
  where: Record<string, any>;
}

/** Which columns to fold, in Prisma's shape: `{ _count: true, _sum: { amount: true } }`. */
export interface AggregateSpec {
  _count?: true | Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

export interface GroupByArgs extends AggregateSpec {
  /** Columns to bucket by. A row's group is the tuple of these values. */
  by: string[];
  where?: Record<string, any>;
  /** Single key — a `by` column, or `{ _count: 'desc' }` for "biggest group first". */
  orderBy?: Record<string, any>;
  skip?: number;
  take?: number;
}

export interface AggregateArgs extends AggregateSpec {
  where?: Record<string, any>;
}

export interface Repository<T = any> {
  findMany(args?: FindManyArgs): Promise<T[]>;
  findUnique(args: FindUniqueArgs): Promise<T | null>;
  findFirst(args: { where: Record<string, any>; include?: Record<string, boolean | object> }): Promise<T | null>;
  count(args?: { where?: Record<string, any> }): Promise<number>;
  create(args: CreateArgs): Promise<T>;
  update(args: UpdateArgs): Promise<T>;
  delete(args: DeleteArgs): Promise<T>;
  /** Bucket rows and fold each bucket — "how many per status", "total per month". */
  groupBy(args: GroupByArgs): Promise<Array<Record<string, any>>>;
  /** Fold the whole (filtered) table into one row of numbers. */
  aggregate(args: AggregateArgs): Promise<Record<string, any>>;
}

/**
 * RepositoryFactory — returns a Repository for a given model name.
 * Used by the workflow action executor to dynamically access any entity.
 */
export interface RepositoryFactory {
  getRepository(modelName: string): Repository;
}

/**
 * PrismaRepository — production adapter wrapping a Prisma delegate.
 * Each Prisma model delegate (e.g. prisma.user) satisfies the Repository interface
 * natively, so this is a thin pass-through.
 */
export class PrismaRepository<T = any> implements Repository<T> {
  constructor(private delegate: any) {}

  findMany(args?: FindManyArgs): Promise<T[]> {
    return this.delegate.findMany(args);
  }

  findUnique(args: FindUniqueArgs): Promise<T | null> {
    return this.delegate.findUnique(args);
  }

  findFirst(args: { where: Record<string, any>; include?: Record<string, boolean | object> }): Promise<T | null> {
    return this.delegate.findFirst(args);
  }

  count(args?: { where?: Record<string, any> }): Promise<number> {
    return this.delegate.count(args);
  }

  create(args: CreateArgs): Promise<T> {
    return this.delegate.create(args);
  }

  update(args: UpdateArgs): Promise<T> {
    return this.delegate.update(args);
  }

  delete(args: DeleteArgs): Promise<T> {
    return this.delegate.delete(args);
  }

  groupBy(args: GroupByArgs): Promise<Array<Record<string, any>>> {
    return this.delegate.groupBy(args);
  }

  aggregate(args: AggregateArgs): Promise<Record<string, any>> {
    return this.delegate.aggregate(args);
  }
}

/**
 * PrismaRepositoryFactory — production factory that wraps a PrismaService.
 */
export class PrismaRepositoryFactory implements RepositoryFactory {
  constructor(private prisma: any) {}

  getRepository(modelName: string): Repository {
    const delegate = (this.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    if (!delegate) throw new Error(`Model "${modelName}" not found in Prisma client`);
    return new PrismaRepository(delegate);
  }
}
