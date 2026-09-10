#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3be14ca5a3ec95f02add9150813dc729f38c8826731ea24d84b5d875bf2c4728/contract';
import startContract from '../../snapshots/3be14ca5a3ec95f02add9150813dc729f38c8826731ea24d84b5d875bf2c4728/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3f677cfd335e82c7e10e4a4dc2bcae36e833f3c6230c1feec15168236c079cc8/contract';
import endContract from '../../snapshots/3f677cfd335e82c7e10e4a4dc2bcae36e833f3c6230c1feec15168236c079cc8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

/**
 * id / 外键列从 character(36) 与 text 改为 Postgres 原生 uuid。
 *
 * 这些列本来存的都是 uuid v7 文本，`::uuid` 是无损转换，因此不需要
 * planner 预留的 dataTransform placeholder —— 显式 `using` 就够了。
 * 表都很小，TABLE_REWRITE 可接受。
 * planner 为 setNotNull 预留的 placeholder（见 0713）不适用于此；这里额外的
 * dropConstraint 是手工补的：重放整条链时，早期的 20260909T1746 会建出 4 个 FK，
 * 而之后再没有任何迁移删过它们（当年是手工从 contract.ts 删掉 FK 声明后用
 * `db update` 清的库，没补迁移）。改列类型前必须先卸掉引用这些列的 FK，
 * 否则 Postgres 报 42804「引用列与被引用列类型不兼容」。
 * 其中 Session_deviceId_fkey 不再重建（契约里故意没有这个 FK）。
 */
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_deviceId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Device',
        constraint: 'Device_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'EmailVerificationToken',
        constraint: 'EmailVerificationToken_userId_fkey',
        kind: 'foreignKey',
      }),
      // Device.id 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'Device',
        column: 'id',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"id"::uuid',
        },
      }),
      // Device.userId 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'Device',
        column: 'userId',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"userId"::uuid',
        },
      }),
      // EmailVerificationToken.id 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'EmailVerificationToken',
        column: 'id',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"id"::uuid',
        },
      }),
      // EmailVerificationToken.userId 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'EmailVerificationToken',
        column: 'userId',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"userId"::uuid',
        },
      }),
      // ResetToken.id 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'ResetToken',
        column: 'id',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"id"::uuid',
        },
      }),
      // ResetToken.userId 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'ResetToken',
        column: 'userId',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"userId"::uuid',
        },
      }),
      // Session.deviceId 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'Session',
        column: 'deviceId',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"deviceId"::uuid',
        },
      }),
      // Session.id 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'Session',
        column: 'id',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"id"::uuid',
        },
      }),
      // Session.userId 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'Session',
        column: 'userId',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"userId"::uuid',
        },
      }),
      // User.id 原本存的就是 UUID 文本（character(36) / text），
      // 显式 USING 转换即可，无需数据 backfill。
      this.alterColumnType({
        schema: 'public',
        table: 'User',
        column: 'id',
        options: {
          qualifiedTargetType: 'uuid',
          formatTypeExpected: 'uuid',
          rawTargetTypeForLabel: 'uuid',
          using: '"id"::uuid',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
