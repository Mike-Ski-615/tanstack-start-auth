import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 状态页必须与它服务的那个路由用同一组布局常数。
 *
 * ## 抓的是什么错
 *
 * 一个状态页（loading / error / not-found）会**替换本路由自己的组件**
 * （router-core 的 Match：`match.status === "pending" | "error"` 时直接返回
 * 那个元素），所以页面那层包裹不在 —— 状态页得自己带上。
 *
 * 而「自己带上」这件事已经错过三次：`student` / `teacher` 的 loading、error、
 * not-found 都写死了 `p-4 lg:ps-7`（那是 `SIDEBAR_GUTTER_CLASS` 的值），
 * 漏了 `content-region` —— 于是内容宽度不是「铺满」时，状态页全宽、页面居中，
 * 切换瞬间跳一下。同理 `admin` 的三个文件漏了整层 `p-4 sm:p-5 …`。
 *
 * 手抄字面值的代价就是这个：常数改了两边不一致，而**不会报错**。
 *
 * ## 规则
 *
 * 路由的页面引用了某个布局常数 → 这个路由的三件套必须引用**同一个**常数。
 * 常数列表从 `content-width-provider` import（不是抄一遍值），所以将来新增
 * 一个布局常数，这条测试自动覆盖它。
 *
 * ## 刻意没做的事
 *
 * 没有加「状态文件里不得出现常数字面值」那条更宽的规则：`lg:ps-7` 在
 * `components/status/` 下有 13 处历史硬编码（含 error/not-found），而它们对应的
 * 页面并没有用常数 —— 那条规则会变成一次 13 文件的大扫除，超出「修已知漂移」
 * 的范围。等那些文件被别的原因碰到时再顺手收。
 *
 * ## 它不证明什么
 *
 * 只证明「引用了同一个常数」。它不检查状态页内部结构与页面是否一致
 * （那部分靠骨架用真组件来保证，见各个 loading.tsx 的注释）。
 */

const ROUTES = "src/routes";
const STATUS = "src/components/status";
const KINDS = ["loading", "error", "not-found"] as const;

/** 会被状态页引用的布局常数（值从模块 import，不抄）。 */
const LAYOUT_CONSTANTS: ReadonlyArray<readonly [name: string, value: string]> = [
  ["SIDEBAR_GUTTER_CLASS", SIDEBAR_GUTTER_CLASS],
  ["CONTENT_WIDTH_CLASS", CONTENT_WIDTH_CLASS],
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** 路由 id（去扩展名，统一 `/` 分隔以免平台差异）。 */
const routeIds = walk(ROUTES)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) =>
    relative(ROUTES, f)
      .replace(/\.tsx$/, "")
      .replace(/\\/g, "/"),
  )
  .sort();

/** 路由 id → status 目录。与 route-states.test.ts 同一条映射（含那个唯一的例外）。 */
function statusDirFor(routeId: string): string {
  return routeId.replace(/^authenticated\/users\//, "authenticated/");
}

/**
 * 去掉注释与 import 后再查。
 *
 * 注释：说明性注释里会引用写法本身，不该被算作证据。
 * import：这个很关键 —— 只查「常数名是否出现」的话，文件里只要有
 * `import { CONTENT_WIDTH_CLASS } from …` 就会通过，于是「引了但没用」这种
 * 真正的漂移完全测不出来。（第一版就是这么写的，把漂移人为放回去后测试照样绿。）
 */
const codeOnly = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^import[^;]*;/gm, "");

describe("状态页与页面用同一组布局常数", () => {
  /** 页面引用了哪些布局常数。 */
  const pagesUsing = routeIds
    .map((id) => {
      const src = codeOnly(readFileSync(join(ROUTES, `${id}.tsx`), "utf8"));
      return { id, names: LAYOUT_CONSTANTS.filter(([name]) => src.includes(name)).map(([n]) => n) };
    })
    .filter((x) => x.names.length > 0);

  it("范围非空（防止路径写错导致空跑）", () => {
    expect(pagesUsing.length, "没有任何页面引用布局常数，检查扫描路径").toBeGreaterThan(0);
  });

  it.each(pagesUsing.map(({ id, names }) => [id, names] as const))(
    "%s 的三件套都引用了 %s",
    (routeId, names) => {
      for (const kind of KINDS) {
        const file = join(STATUS, statusDirFor(routeId), `${kind}.tsx`).replace(/\\/g, "/");
        const src = codeOnly(readFileSync(file, "utf8"));

        for (const name of names) {
          expect(
            src.includes(name),
            `${file} 没引用 ${name} —— 页面用了它，而状态页会替换页面，` +
              `漏掉会让加载/出错时与正常状态宽度不同`,
          ).toBe(true);
        }
      }
    },
  );

  it("被检查的常数确实是内容宽度那组（防止 import 到空值）", () => {
    for (const [name, value] of LAYOUT_CONSTANTS) {
      expect(value, `${name} 取到空值，规则会永远通过`).toBeTruthy();
    }
  });
});
