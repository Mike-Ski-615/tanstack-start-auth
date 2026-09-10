#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0bf10a5e8b5084b93686549a32c70d401f2837bcdefc161d3acc68cf4e811aef/contract';
import startContract from '../../snapshots/0bf10a5e8b5084b93686549a32c70d401f2837bcdefc161d3acc68cf4e811aef/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4bb068fc8b074a2d60509d8ed51f72caf9064a9ad1da177824625ebaed1ba020/contract';
import endContract from '../../snapshots/4bb068fc8b074a2d60509d8ed51f72caf9064a9ad1da177824625ebaed1ba020/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'EmailVerificationToken',
        index: 'EmailVerificationToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ResetToken',
        index: 'ResetToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Device',
        foreignKey: {
          name: 'Device_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmailVerificationToken',
        foreignKey: {
          name: 'EmailVerificationToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ResetToken',
        foreignKey: {
          name: 'ResetToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
