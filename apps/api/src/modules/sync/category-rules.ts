import { Injectable } from '@nestjs/common';
import {
  type CategoryNode,
  categoryViolations,
  OTHER_CATEGORY,
  rejectionKind,
} from '@zooloo/domain';
import { compareHlc, formatHlc, type Fields, parseHlc, receiveHlc } from '@zooloo/sync-core';
import { newId } from '../../providers/ids.js';
import type { Tx } from '../../providers/database/database.service.js';
import { MutationRejected } from './mutation-rejected.js';
import { type StoredRecord, SyncRepo, type WriteRecord } from './sync.repo.js';

/** Campos sincronizados de uma categoria vistos como nó das regras do domínio. */
export function toCategoryNode(id: string, fields: Fields): CategoryNode {
  return {
    id,
    profileId: String(fields['profileId']),
    type: fields['type'] === 'income' ? 'income' : 'expense',
    name: String(fields['name']),
    parentId: typeof fields['parentId'] === 'string' ? fields['parentId'] : null,
    isSystem: fields['isSystem'] === true,
    archived: typeof fields['archivedAt'] === 'string',
    deleted: typeof fields['deletedAt'] === 'string',
  };
}

interface Context {
  readonly userId: string;
  readonly version: number;
  readonly wallNow: number;
}

/**
 * Regras de categorias no push (RN-CAT-01, 02, 03 e 07), contra o estado atual do servidor: o
 * cliente pode estar adulterado ou desatualizado. Tudo roda no savepoint da mutação.
 */
@Injectable()
export class CategoryRules {
  constructor(private readonly repo: SyncRepo) {}

  /** Recusa a categoria resultante do merge se ela viola alguma regra. */
  async validate(tx: Tx, existing: StoredRecord | null, write: WriteRecord): Promise<void> {
    const after = toCategoryNode(write.id, write.fields);
    const before = existing && toCategoryNode(existing.id, existing.fields);
    const profile = await this.repo.categoriesOfProfile(tx, after.profileId);
    const violations = categoryViolations(
      before,
      after,
      profile.map((record) => toCategoryNode(record.id, record.fields)),
    );
    if (violations.length > 0) {
      throw new MutationRejected(rejectionKind(violations));
    }
  }

  /**
   * Excluir a mãe exclui as filhas vivas, inclusive as que o cliente não conhecia (RN-CAT-02).
   * O relógio da exclusão de cada filha fica à frente de tudo o que ela já tinha, para que nenhuma
   * réplica mantenha a filha viva no merge.
   */
  async cascadeDelete(tx: Tx, parent: WriteRecord, context: Context): Promise<void> {
    const deletedAt = parent.fields['deletedAt'];
    const clock = parent.fieldHlc['deletedAt'];
    if (typeof deletedAt !== 'string' || clock === undefined) {
      return;
    }
    const profileId = String(parent.fields['profileId']);
    const children = (await this.repo.categoriesOfProfile(tx, profileId)).filter(
      (record) => record.fields['parentId'] === parent.id && record.fields['deletedAt'] === null,
    );
    const remote = parseHlc(clock);
    for (const child of children) {
      // Linhas antigas sem `field_hlc` usam o HLC da linha para cada campo.
      const clocks: Record<string, string> = {};
      for (const name of Object.keys(child.fields)) {
        clocks[name] = child.fieldHlc[name] ?? child.hlc;
      }
      const latest = Object.values(clocks).reduce(
        (max, value) => (compareHlc(value, max) > 0 ? value : max),
        child.hlc,
      );
      const local = { ...parseHlc(latest), node: remote.node };
      const childClock = formatHlc(receiveHlc(local, remote, context.wallNow));
      await this.repo.update(tx, {
        entity: 'categories',
        id: child.id,
        userId: context.userId,
        version: context.version,
        hlc: childClock,
        fields: { deletedAt },
        fieldHlc: { ...clocks, deletedAt: childClock },
      });
    }
  }

  /** Perfil novo nasce com as duas "Outros", receita e despesa (RN-CAT-03). */
  async seedProfile(tx: Tx, profile: WriteRecord, context: Context): Promise<void> {
    for (const type of ['expense', 'income'] as const) {
      const fields: Fields = {
        profileId: profile.id,
        type,
        name: OTHER_CATEGORY.name,
        parentId: null,
        icon: OTHER_CATEGORY.icon,
        color: OTHER_CATEGORY.color,
        isSystem: true,
        archivedAt: null,
        sortOrder: 0,
        deletedAt: null,
      };
      const clocks = Object.fromEntries(Object.keys(fields).map((name) => [name, profile.hlc]));
      await this.repo.insert(tx, {
        entity: 'categories',
        id: newId(),
        userId: context.userId,
        version: context.version,
        hlc: profile.hlc,
        fields,
        fieldHlc: clocks,
      });
    }
  }
}
