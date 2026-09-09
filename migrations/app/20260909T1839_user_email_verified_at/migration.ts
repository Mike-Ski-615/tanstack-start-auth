#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/16c1e39e27c7b65dfe6064dc9e654daf7e98199f08f16db13197f885b893e8a2/contract';
import startContract from '../../snapshots/16c1e39e27c7b65dfe6064dc9e654daf7e98199f08f16db13197f885b893e8a2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5d314dcfb0caf42e526949a2354cc8453903bae73705cc0cc612aedb9b4812b8/contract';
import endContract from '../../snapshots/5d314dcfb0caf42e526949a2354cc8453903bae73705cc0cc612aedb9b4812b8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      // User.emailVerifiedAt: 邮箱验证状态（账户级）
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('emailVerifiedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
