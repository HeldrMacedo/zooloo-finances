import { Injectable } from '@nestjs/common';
import type { FieldValue, Fields } from '@zooloo/sync-core';
import type { SyncEntity } from '@zooloo/validation';
import { type SQL, sql } from 'drizzle-orm';
import type { Tx } from '../../providers/database/database.service.js';

type ColumnKind = 'text' | 'int' | 'bool' | 'timestamp' | 'category_type';

interface ColumnSpec {
  readonly column: string;
  readonly kind: ColumnKind;
}

/**
 * Colunas sincronizadas de cada entidade (campo do protocolo → coluna). Os nomes são constantes
 * deste arquivo, nunca vêm da requisição; por isso podem entrar como identificador no SQL.
 */
const ENTITIES: Record<SyncEntity, { table: string; columns: Record<string, ColumnSpec> }> = {
  profiles: {
    table: 'profiles',
    columns: {
      name: { column: 'name', kind: 'text' },
      currency: { column: 'currency', kind: 'text' },
      color: { column: 'color', kind: 'text' },
      icon: { column: 'icon', kind: 'text' },
      archivedAt: { column: 'archived_at', kind: 'timestamp' },
      sortOrder: { column: 'sort_order', kind: 'int' },
      deletedAt: { column: 'deleted_at', kind: 'timestamp' },
    },
  },
  categories: {
    table: 'categories',
    columns: {
      profileId: { column: 'profile_id', kind: 'text' },
      type: { column: 'type', kind: 'category_type' },
      name: { column: 'name', kind: 'text' },
      parentId: { column: 'parent_id', kind: 'text' },
      icon: { column: 'icon', kind: 'text' },
      color: { column: 'color', kind: 'text' },
      isSystem: { column: 'is_system', kind: 'bool' },
      archivedAt: { column: 'archived_at', kind: 'timestamp' },
      sortOrder: { column: 'sort_order', kind: 'int' },
      deletedAt: { column: 'deleted_at', kind: 'timestamp' },
    },
  },
};

export const SYNC_ENTITIES = Object.keys(ENTITIES) as SyncEntity[];

/** Registro como está no servidor. */
export interface StoredRecord {
  readonly entity: SyncEntity;
  readonly id: string;
  readonly version: number;
  readonly hlc: string;
  readonly fields: Fields;
  readonly fieldHlc: Readonly<Record<string, string>>;
}

export interface WriteRecord {
  readonly entity: SyncEntity;
  readonly id: string;
  readonly userId: string;
  readonly version: number;
  readonly hlc: string;
  readonly fields: Fields;
  readonly fieldHlc: Readonly<Record<string, string>>;
}

/** Timestamp sempre em ISO 8601 UTC com milissegundos e `Z`, igual ao cliente. */
const selectColumn = ({ column, kind }: ColumnSpec): SQL =>
  kind === 'timestamp'
    ? sql`to_char(${sql.identifier(column)} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
    : kind === 'category_type'
      ? sql`${sql.identifier(column)}::text`
      : sql`${sql.identifier(column)}`;

const writeValue = (spec: ColumnSpec, value: FieldValue | undefined): SQL => {
  const param = sql`${value ?? null}`;
  switch (spec.kind) {
    case 'timestamp':
      return sql`${param}::timestamptz`;
    case 'category_type':
      return sql`${param}::category_type`;
    case 'int':
      return sql`${param}::integer`;
    case 'bool':
      return sql`${param}::boolean`;
    default:
      return param;
  }
};

interface Row extends Record<string, unknown> {
  id: string;
  server_version: string | number;
  hlc: string;
  field_hlc: Record<string, string>;
}

function toRecord(entity: SyncEntity, row: Row): StoredRecord {
  const fields: Record<string, FieldValue> = {};
  for (const name of Object.keys(ENTITIES[entity].columns)) {
    fields[name] = (row[name] ?? null) as FieldValue;
  }
  return {
    entity,
    id: row.id,
    version: Number(row.server_version),
    hlc: row.hlc,
    fields,
    fieldHlc: row.field_hlc,
  };
}

function selectFrom(entity: SyncEntity): SQL {
  const { table, columns } = ENTITIES[entity];
  const projected = Object.entries(columns).map(
    ([name, spec]) => sql`${selectColumn(spec)} as ${sql.identifier(name)}`,
  );
  return sql`select id::text as id, server_version, hlc, field_hlc, ${sql.join(projected, sql`, `)}
    from ${sql.identifier(table)}`;
}

/** Camada Repo do sync: SQL das entidades sincronizadas, sempre dentro de `withUser` (RLS). */
@Injectable()
export class SyncRepo {
  /** Incrementa e devolve a versão do usuário; a linha travada serializa pushes concorrentes. */
  async nextVersion(tx: Tx, userId: string): Promise<number> {
    const { rows } = await tx.execute<{ version: string }>(sql`
      insert into sync_state (user_id, version) values (${userId}, 1)
      on conflict (user_id) do update
        set version = sync_state.version + 1, updated_at = now()
      returning version`);
    return Number(rows[0]?.version);
  }

  /** Registro com trava de linha, para o merge não perder escrita concorrente. */
  async findForUpdate(tx: Tx, entity: SyncEntity, id: string): Promise<StoredRecord | null> {
    const { rows } = await tx.execute<Row>(sql`${selectFrom(entity)} where id = ${id} for update`);
    const [row] = rows;
    return row ? toRecord(entity, row) : null;
  }

  async find(tx: Tx, entity: SyncEntity, id: string): Promise<StoredRecord | null> {
    const { rows } = await tx.execute<Row>(sql`${selectFrom(entity)} where id = ${id}`);
    const [row] = rows;
    return row ? toRecord(entity, row) : null;
  }

  /** Categorias do perfil, inclusive excluídas, para validar as regras com o estado atual. */
  async categoriesOfProfile(tx: Tx, profileId: string): Promise<StoredRecord[]> {
    const { rows } = await tx.execute<Row>(
      sql`${selectFrom('categories')} where profile_id = ${profileId} for update`,
    );
    return rows.map((row) => toRecord('categories', row));
  }

  async insert(tx: Tx, record: WriteRecord): Promise<void> {
    const { table, columns } = ENTITIES[record.entity];
    const specs = Object.entries(columns).filter(([name]) => name in record.fields);
    const names = specs.map(([, spec]) => sql.identifier(spec.column));
    const values = specs.map(([name, spec]) => writeValue(spec, record.fields[name]));
    await tx.execute(sql`
      insert into ${sql.identifier(table)}
        (id, user_id, hlc, field_hlc, server_version, ${sql.join(names, sql`, `)})
      values (${record.id}, ${record.userId}, ${record.hlc}, ${JSON.stringify(record.fieldHlc)}::jsonb,
        ${record.version}, ${sql.join(values, sql`, `)})`);
  }

  async update(tx: Tx, record: WriteRecord): Promise<void> {
    const { table, columns } = ENTITIES[record.entity];
    const assignments = Object.entries(columns)
      .filter(([name]) => name in record.fields)
      .map(
        ([name, spec]) =>
          sql`${sql.identifier(spec.column)} = ${writeValue(spec, record.fields[name])}`,
      );
    await tx.execute(sql`
      update ${sql.identifier(table)}
         set ${sql.join(assignments, sql`, `)}, hlc = ${record.hlc},
             field_hlc = ${JSON.stringify(record.fieldHlc)}::jsonb,
             server_version = ${record.version}, updated_at = now()
       where id = ${record.id}`);
  }

  /** Registros com versão maior que `since`, em ordem de versão. */
  async changedSince(
    tx: Tx,
    entity: SyncEntity,
    since: number,
    limit: number,
  ): Promise<StoredRecord[]> {
    const { rows } = await tx.execute<Row>(
      sql`${selectFrom(entity)} where server_version > ${since} order by server_version, id limit ${limit}`,
    );
    return rows.map((row) => toRecord(entity, row));
  }

  async hasChangesAfter(tx: Tx, entity: SyncEntity, version: number): Promise<boolean> {
    const { table } = ENTITIES[entity];
    const { rows } = await tx.execute<{ found: boolean }>(
      sql`select exists (select 1 from ${sql.identifier(table)} where server_version > ${version}) as found`,
    );
    return rows[0]?.found === true;
  }

  async atVersion(tx: Tx, entity: SyncEntity, version: number): Promise<StoredRecord[]> {
    const { rows } = await tx.execute<Row>(
      sql`${selectFrom(entity)} where server_version = ${version} order by id`,
    );
    return rows.map((row) => toRecord(entity, row));
  }
}
