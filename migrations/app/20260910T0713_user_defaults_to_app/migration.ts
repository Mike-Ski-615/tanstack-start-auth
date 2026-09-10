#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0bf10a5e8b5084b93686549a32c70d401f2837bcdefc161d3acc68cf4e811aef/contract';
import endContract from '../../snapshots/0bf10a5e8b5084b93686549a32c70d401f2837bcdefc161d3acc68cf4e811aef/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/3f677cfd335e82c7e10e4a4dc2bcae36e833f3c6230c1feec15168236c079cc8/contract';
import startContract from '../../snapshots/3f677cfd335e82c7e10e4a4dc2bcae36e833f3c6230c1feec15168236c079cc8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

/**
 * User.image / User.bio 的初始值从 DB DEFAULT 移到应用层
 * （register.functions.ts 的 DEFAULT_IMAGE / DEFAULT_BIO）。
 *
 * 理由：这两个值是文案与 web 资源路径，不是 schema 约束；放在 create 处
 * 才能靠 ORM 的 insert 类型强制所有创建路径都传，改文案也不必写迁移。
 *
 * planner 为 setNotNull 预留了 handle-nulls dataTransform placeholder。
 * 这里不填：迁移前已确认两列 0 个 NULL，`SET NOT NULL` 本身就是断言 ——
 * 若某个库真有 NULL，会当场失败而不是静默回填成某个默认值。
 */
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropDefault({ schema: 'public', table: 'User', column: 'bio' }),
      this.dropDefault({ schema: 'public', table: 'User', column: 'image' }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'bio' }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'image' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
