#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/569d897070f01c7c38060d9399805607290021d3c2f15d98594c1349a75015a9/contract';
import startContract from '../../snapshots/569d897070f01c7c38060d9399805607290021d3c2f15d98594c1349a75015a9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/952e11f7e495f6f7c034b676b50e05205efd735fe86ced6ff557de5e75e9a3fa/contract';
import endContract from '../../snapshots/952e11f7e495f6f7c034b676b50e05205efd735fe86ced6ff557de5e75e9a3fa/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Connection',
        columns: [
          col('active', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('connectedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('disconnectedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('duration', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('userid', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Connection',
        constraint: 'Connection_userid_key',
        columns: ['userid'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Connection',
        foreignKey: {
          name: 'Connection_userid_fkey',
          columns: ['userid'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
