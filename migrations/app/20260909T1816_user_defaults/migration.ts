#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/16c1e39e27c7b65dfe6064dc9e654daf7e98199f08f16db13197f885b893e8a2/contract';
import endContract from '../../snapshots/16c1e39e27c7b65dfe6064dc9e654daf7e98199f08f16db13197f885b893e8a2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7275e723628c13da420326fe2fe2285e0363162660962eeafb02fd31038533a5/contract';
import startContract from '../../snapshots/7275e723628c13da420326fe2fe2285e0363162660962eeafb02fd31038533a5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      // User.image: 加默认值 "/default-user.webp"
      this.setDefault({
        schema: 'public',
        table: 'User',
        column: 'image',
        defaultSql: "DEFAULT '/default-user.webp'",
      }),
      // User.bio: 加默认值 "这个人很懒,什么也没有留下"
      this.setDefault({
        schema: 'public',
        table: 'User',
        column: 'bio',
        defaultSql: "DEFAULT '这个人很懒,什么也没有留下'",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
