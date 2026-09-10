#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3be14ca5a3ec95f02add9150813dc729f38c8826731ea24d84b5d875bf2c4728/contract';
import endContract from '../../snapshots/3be14ca5a3ec95f02add9150813dc729f38c8826731ea24d84b5d875bf2c4728/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5d314dcfb0caf42e526949a2354cc8453903bae73705cc0cc612aedb9b4812b8/contract';
import startContract from '../../snapshots/5d314dcfb0caf42e526949a2354cc8453903bae73705cc0cc612aedb9b4812b8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      // Device 表：设置默认值和 NOT NULL
      this.setDefault({
        schema: 'public',
        table: 'Device',
        column: 'name',
        defaultSql: "DEFAULT 'Unknown Device'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Device',
        column: 'userAgent',
        defaultSql: "DEFAULT ''",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Device',
        column: 'ip',
        defaultSql: "DEFAULT 'unknown'",
      }),
      this.setNotNull({
        schema: 'public',
        table: 'Device',
        column: 'name',
      }),
      this.setNotNull({
        schema: 'public',
        table: 'Device',
        column: 'userAgent',
      }),
      this.setNotNull({
        schema: 'public',
        table: 'Device',
        column: 'ip',
      }),
      // Session 表：设置默认值和 NOT NULL
      this.setDefault({
        schema: 'public',
        table: 'Session',
        column: 'userAgent',
        defaultSql: "DEFAULT ''",
      }),
      this.setDefault({
        schema: 'public',
        table: 'Session',
        column: 'ip',
        defaultSql: "DEFAULT 'unknown'",
      }),
      this.setNotNull({
        schema: 'public',
        table: 'Session',
        column: 'userAgent',
      }),
      this.setNotNull({
        schema: 'public',
        table: 'Session',
        column: 'ip',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
