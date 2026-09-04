#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/250b996a60e3c469bd4cad997fc2183de296232a21c67b541b0aa7de9e50d6a3/contract';
import startContract from '../../snapshots/250b996a60e3c469bd4cad997fc2183de296232a21c67b541b0aa7de9e50d6a3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d8645d038210b7b8da74eaa18c1846ec0e50b7d1781a552fec7387b422cf370a/contract';
import endContract from '../../snapshots/d8645d038210b7b8da74eaa18c1846ec0e50b7d1781a552fec7387b422cf370a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropTable({ schema: 'public', table: 'Post' })];
  }
}

MigrationCLI.run(import.meta.url, M);
