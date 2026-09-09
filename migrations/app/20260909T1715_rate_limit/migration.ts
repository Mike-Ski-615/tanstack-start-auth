#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/e979680900a2686ad0adc6440f3d6853035f2e83a428d45ea7b582f8181c3446/contract';
import startContract from '../../snapshots/e979680900a2686ad0adc6440f3d6853035f2e83a428d45ea7b582f8181c3446/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/edb8580e82733c882697d218b5ac1b29ecae2c2dcd10285b51a32e2b4f649132/contract';
import endContract from '../../snapshots/edb8580e82733c882697d218b5ac1b29ecae2c2dcd10285b51a32e2b4f649132/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'RateLimit',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('windowStart', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RateLimit',
        constraint: 'RateLimit_key_key',
        columns: ['key'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
