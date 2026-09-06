#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/569d897070f01c7c38060d9399805607290021d3c2f15d98594c1349a75015a9/contract';
import endContract from '../../snapshots/569d897070f01c7c38060d9399805607290021d3c2f15d98594c1349a75015a9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8a15c98ae4ecd0bda75710414acf8bc626d8cac26d171e1c1cb789ef1030590/contract';
import startContract from '../../snapshots/f8a15c98ae4ecd0bda75710414acf8bc626d8cac26d171e1c1cb789ef1030590/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('role', 'text', {
          notNull: true,
          default: lit('student'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_37b6aaf4',
        expression: "\"role\" IN ('teacher', 'student')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
