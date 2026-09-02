#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/250b996a60e3c469bd4cad997fc2183de296232a21c67b541b0aa7de9e50d6a3/contract';
import endContract from '../../snapshots/250b996a60e3c469bd4cad997fc2183de296232a21c67b541b0aa7de9e50d6a3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/eee469dd944a062224add01c4c928c3fcfa3bd88a095b5c8987d127abb5ae488/contract';
import startContract from '../../snapshots/eee469dd944a062224add01c4c928c3fcfa3bd88a095b5c8987d127abb5ae488/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Session' }),
      this.dropColumn({ schema: 'public', table: 'User', column: 'verifiedAt' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
