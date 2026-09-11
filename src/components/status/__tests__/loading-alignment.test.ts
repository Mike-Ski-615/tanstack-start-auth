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
 * ## 三条规则
 *
 * 1. **页面用了常数 → 三件套必须用**（下面第一条用例）。URL 映射见 statusDirFor。
 * 2. **照组件的骨架**：少数骨架照的不是路由文件，而是某个组件 —— 容器的来源在
 *    那个组件里，路由文件上什么都没有（`$userId` 就是：容器在 `UserView`）。
 *    这类骨架由 MIRRORS_COMPONENT 显式登记，否则规则 1 看不见它们。
 * 3. **状态文件里不得出现常数的字面值**（下面第三条用例）。这一条才抓得住
 *    「抄了值」：`lg:ps-7` 抄进去看不出问题、也永远不会报错 ——
 *    `components/status/` 下曾有 7 处是这么来的（含 error/not-found/help）。
 *
 * ## 它不证明什么
 *
 * 它只证明「引用了该引用的常数」。它不检查状态页内部结构与页面是否一致
 * （那部分靠骨架用真组件来保证，见各个 loading.tsx 的注释），也抓不住
 * 「既没引用常数、也没抄字面值」的整类漏掉 —— 除非那个骨架登记在
 * MIRRORS_COMPONENT 里（规则 2）。`$userId/loading.tsx` 漏 `content-region`
 * 就是这么漏的，所以才有规则 2。
 *
 * ## 刻意没做的事
 *
 * 没有为工具栏那种「骨架照一个耦合很深的组件」发明机制：`DataTableToolbar`
 * 要一个 TanStack table 实例才能渲染，骨架拿不到，那部分仍是手写近似
 * （见 admin 下 students / teachers 两个 loading.tsx 的注释）。
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
 * 少数骨架照的不是路由文件，而是组件 —— 容器的来源在那些组件里。
 *
 * 键是 status 目录（相对 STATUS），值是它镜像的组件。加上新条目就等于多查一份
 * 文件；路径写错会因读不到文件而直接失败，不会静默跳过。
 */
const MIRRORS_COMPONENT: Record<string, string> = {
  // 用户主页的容器在 UserView 里（路由文件只渲染 <UserView />）
  "authenticated/$userId": "src/components/user/user-view.tsx",
};

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

describe("照组件的骨架也要跟上（容器的来源在组件里）", () => {
  it.each(Object.entries(MIRRORS_COMPONENT))("%s 的骨架引用了 %s 用的常数", (dir, file) => {
    const source = codeOnly(readFileSync(file, "utf8"));
    const wanted = LAYOUT_CONSTANTS.filter(([name]) => source.includes(name)).map(([n]) => n);
    expect(wanted.length, `${file} 没引用任何布局常数，这条映射该删了`).toBeGreaterThan(0);

    for (const kind of KINDS) {
      const path = join(STATUS, dir, `${kind}.tsx`).replace(/\\/g, "/");
      const src = codeOnly(readFileSync(path, "utf8"));
      for (const name of wanted) {
        expect(src.includes(name), `${path} 没引用 ${name} —— ${file} 用了它`).toBe(true);
      }
    }
  });
});

describe("状态文件不抄布局常数的字面值", () => {
  const statusFiles = walk(STATUS).filter((f) => f.endsWith(".tsx") && !f.includes("__tests__"));

  it("范围非空", () => {
    expect(statusFiles.length).toBeGreaterThan(20);
  });

  it.each(LAYOUT_CONSTANTS)("%s 的值没有被抄进任何状态文件", (_name, value) => {
    for (const file of statusFiles) {
      const src = codeOnly(readFileSync(file, "utf8"));
      expect(
        src.includes(value),
        `${file} 里出现了 ${_name} 的字面值（"${value}"）—— 应改用它本身；` +
          `抄字面值不会报错，只会让两边慢慢分叉`,
      ).toBe(false);
    }
  });
});
