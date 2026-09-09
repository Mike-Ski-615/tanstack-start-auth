#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7275e723628c13da420326fe2fe2285e0363162660962eeafb02fd31038533a5/contract';
import endContract from '../../snapshots/7275e723628c13da420326fe2fe2285e0363162660962eeafb02fd31038533a5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/edb8580e82733c882697d218b5ac1b29ecae2c2dcd10285b51a32e2b4f649132/contract';
import startContract from '../../snapshots/edb8580e82733c882697d218b5ac1b29ecae2c2dcd10285b51a32e2b4f649132/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      // ============================================================
      // User: 加 sessionVersion，删 connectedAt / disconnectedAt
      //         改 image / bio 为 nullable
      // ============================================================
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('sessionVersion', 'int4', {
          notNull: true,
          default: fn('0'),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.dropColumn({
        schema: 'public',
        table: 'User',
        column: 'connectedAt',
      }),
      this.dropColumn({
        schema: 'public',
        table: 'User',
        column: 'disconnectedAt',
      }),
      this.dropNotNull({
        schema: 'public',
        table: 'User',
        column: 'image',
      }),
      this.dropNotNull({
        schema: 'public',
        table: 'User',
        column: 'bio',
      }),

      // ============================================================
      // Session: 加 deviceId / sessionVersion / userId UNIQUE
      // ============================================================
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('deviceId', 'text', {
          notNull: true,
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('sessionVersion', 'int4', {
          notNull: true,
          default: fn('0'),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_deviceId_key',
        columns: ['deviceId'],
      }),

      // ============================================================
      // Device: 新建
      // ============================================================
      this.createTable({
        schema: 'public',
        table: 'Device',
        columns: [
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('deviceKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('platform', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastSeenAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Device',
        constraint: 'Device_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Device',
        constraint: 'Device_deviceKey_key',
        columns: ['deviceKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Device',
        constraint: 'Device_platform_check_0a8795aa',
        expression: "\"platform\" IN ('web', 'android', 'ios', 'desktop')",
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

      // ============================================================
      // EmailVerificationToken: 新建
      // ============================================================
      this.createTable({
        schema: 'public',
        table: 'EmailVerificationToken',
        columns: [
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('verifiedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'EmailVerificationToken',
        constraint: 'EmailVerificationToken_tokenHash_key',
        columns: ['tokenHash'],
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

      // ============================================================
      // Session 外键：关联 Device
      // ============================================================
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_deviceId_fkey',
          columns: ['deviceId'],
          references: { schema: 'public', table: 'Device', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
