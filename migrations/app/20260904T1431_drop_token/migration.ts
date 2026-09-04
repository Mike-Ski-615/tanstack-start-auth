#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d8645d038210b7b8da74eaa18c1846ec0e50b7d1781a552fec7387b422cf370a/contract';
import startContract from '../../snapshots/d8645d038210b7b8da74eaa18c1846ec0e50b7d1781a552fec7387b422cf370a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f8a15c98ae4ecd0bda75710414acf8bc626d8cac26d171e1c1cb789ef1030590/contract';
import endContract from '../../snapshots/f8a15c98ae4ecd0bda75710414acf8bc626d8cac26d171e1c1cb789ef1030590/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropTable({ schema: 'public', table: 'Token' })];
  }
}

MigrationCLI.run(import.meta.url, M);
