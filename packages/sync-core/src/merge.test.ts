import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatHlc } from './hlc.js';
import { type FieldValue, mergeRecord, type ReplicaRecord } from './merge.js';
import { mutationRecord } from './protocol.js';

const hlc = (wall: number, node = '00000000000000aa', counter = 0): string =>
  formatHlc({ wall, counter, node });

describe('mergeRecord', () => {
  const base: ReplicaRecord = {
    fields: { name: 'Lazer', color: '#2D6E85' },
    clocks: { name: hlc(10), color: hlc(10) },
  };

  it('sem registro local, adota tudo e marca todos os campos como alterados', () => {
    const { record, changed } = mergeRecord(undefined, base);
    expect(record).toEqual(base);
    expect(changed).toEqual(['name', 'color']);
  });

  it('campo com HLC maior vence; menor é ignorado', () => {
    const { record, changed } = mergeRecord(base, {
      fields: { name: 'Passeios', color: '#000000' },
      clocks: { name: hlc(20), color: hlc(5) },
    });
    expect(record.fields).toEqual({ name: 'Passeios', color: '#2D6E85' });
    expect(record.clocks).toEqual({ name: hlc(20), color: hlc(10) });
    expect(changed).toEqual(['name']);
  });

  it('edições em campos diferentes de dois dispositivos são combinadas (F6)', () => {
    const valueEdit = {
      fields: { color: '#BC4E26' },
      clocks: { color: hlc(20, '00000000000000aa') },
    };
    const nameEdit = {
      fields: { name: 'Passeios' },
      clocks: { name: hlc(21, '00000000000000bb') },
    };
    const one = mergeRecord(mergeRecord(base, valueEdit).record, nameEdit).record;
    const other = mergeRecord(mergeRecord(base, nameEdit).record, valueEdit).record;
    expect(one).toEqual(other);
    expect(one.fields).toEqual({ name: 'Passeios', color: '#BC4E26' });
  });

  it('reaplicar a mesma mudança não altera nada', () => {
    const { record } = mergeRecord(undefined, base);
    expect(mergeRecord(record, base)).toEqual({ record, changed: [] });
  });

  it('mesmo HLC com valores diferentes desempata pelo valor, nos dois sentidos', () => {
    const a = { fields: { name: 'A' }, clocks: { name: hlc(10) } };
    const b = { fields: { name: 'B' }, clocks: { name: hlc(10) } };
    expect(mergeRecord(a, b).record.fields['name']).toBe('B');
    expect(mergeRecord(b, a).record.fields['name']).toBe('B');
    expect(mergeRecord(b, a).changed).toEqual([]);
  });

  it('mesmo valor com HLC maior troca só o relógio e conta como alteração', () => {
    const { record, changed } = mergeRecord(base, {
      fields: { name: 'Lazer' },
      clocks: { name: hlc(30) },
    });
    expect(record.clocks['name']).toBe(hlc(30));
    expect(changed).toEqual(['name']);
  });

  it('campo ausente nos valores vale null', () => {
    const { record } = mergeRecord(base, { fields: {}, clocks: { parentId: hlc(30) } });
    expect(record.fields['parentId']).toBeNull();
  });

  it('edição feita antes da exclusão não ressuscita; só reverter a exclusão com HLC maior', () => {
    const deleted = mergeRecord(base, {
      fields: { deletedAt: '2026-11-19T12:00:00.000Z' },
      clocks: { deletedAt: hlc(20) },
    }).record;
    const staleEdit = mergeRecord(deleted, { fields: { name: 'X' }, clocks: { name: hlc(15) } });
    expect(staleEdit.record.fields['deletedAt']).toBe('2026-11-19T12:00:00.000Z');
    expect(staleEdit.record.fields['name']).toBe('X');
    const undelete = mergeRecord(deleted, {
      fields: { deletedAt: null },
      clocks: { deletedAt: hlc(25) },
    });
    expect(undelete.record.fields['deletedAt']).toBeNull();
  });

  it('não altera os registros de entrada', () => {
    const local = { fields: { name: 'A' }, clocks: { name: hlc(1) } };
    mergeRecord(local, { fields: { name: 'B' }, clocks: { name: hlc(2) } });
    expect(local).toEqual({ fields: { name: 'A' }, clocks: { name: hlc(1) } });
  });
});

const FIELD_NAMES = ['name', 'color', 'deletedAt'] as const;
const valueArb: fc.Arbitrary<FieldValue> = fc.oneof(
  fc.constantFrom('a', 'b', 'c'),
  fc.constant(null),
  fc.integer({ min: 0, max: 3 }),
);
const recordArb: fc.Arbitrary<ReplicaRecord> = fc
  .uniqueArray(fc.constantFrom(...FIELD_NAMES), { minLength: 1 })
  .chain((names) =>
    fc
      .tuple(
        fc.array(valueArb, { minLength: names.length, maxLength: names.length }),
        fc.array(fc.integer({ min: 0, max: 5 }), {
          minLength: names.length,
          maxLength: names.length,
        }),
        fc.constantFrom('00000000000000aa', '00000000000000bb'),
      )
      .map(([values, walls, node]) => ({
        fields: Object.fromEntries(names.map((name, index) => [name, values[index] ?? null])),
        clocks: Object.fromEntries(
          names.map((name, index) => [name, hlc(walls[index] ?? 0, node)]),
        ),
      })),
  );

const mergeAll = (records: readonly ReplicaRecord[]): ReplicaRecord | undefined =>
  records.reduce<ReplicaRecord | undefined>(
    (acc, next) => mergeRecord(acc, next).record,
    undefined,
  );

const normalize = (record: ReplicaRecord | undefined) =>
  record && {
    fields: Object.fromEntries(
      Object.entries(record.fields).sort(([a], [b]) => a.localeCompare(b)),
    ),
    clocks: Object.fromEntries(
      Object.entries(record.clocks).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };

describe('propriedades do merge (RNF-QA-02)', () => {
  it('convergente: qualquer ordem de entrega dá o mesmo resultado', () => {
    const permutedArb = fc
      .array(recordArb, { minLength: 1, maxLength: 6 })
      .chain((records) =>
        fc.tuple(fc.constant(records), fc.shuffledSubarray(records, { minLength: records.length })),
      );
    fc.assert(
      fc.property(permutedArb, ([records, shuffled]) => {
        expect(normalize(mergeAll(shuffled))).toEqual(normalize(mergeAll(records)));
      }),
    );
  });

  it('idempotente: entregar duas vezes é o mesmo que uma', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { minLength: 1, maxLength: 6 }), (records) => {
        expect(normalize(mergeAll([...records, ...records]))).toEqual(normalize(mergeAll(records)));
      }),
    );
  });

  it('cada campo final tem o maior HLC visto para ele', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { minLength: 1, maxLength: 6 }), (records) => {
        const merged = mergeAll(records);
        for (const name of FIELD_NAMES) {
          const clocks = records.flatMap((record) => record.clocks[name] ?? []).sort();
          expect(merged?.clocks[name]).toBe(clocks.at(-1));
        }
      }),
    );
  });
});

describe('mutationRecord', () => {
  it('aplica o HLC da mutação a cada campo', () => {
    expect(
      mutationRecord({
        entity: 'categories',
        id: 'x',
        op: 'upsert',
        fields: { name: 'Lazer', icon: 'tag' },
        hlc: hlc(1),
      }),
    ).toEqual({ fields: { name: 'Lazer', icon: 'tag' }, clocks: { name: hlc(1), icon: hlc(1) } });
  });
});
