import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HookSidebar } from "#components/help/hook-sidebar";
import { LoadingPage } from "#components/status/authenticated/help/loading";
import { ErrorPage } from "#components/status/authenticated/help/error";
import { NotFoundPage } from "#components/status/authenticated/help/not-found";

export const Route = createFileRoute("/authenticated/help")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: HelpPage,
});

const sectionLabels = [
  "快速开始",
  "账号与身份",
  "工作台与导航",
  "界面操作",
  "安全与故障排查",
  "致开发者",
];

function HelpPage() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let idx = 0;
      sectionRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top - containerTop <= 80) idx = i;
      });
      setActive(idx);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // relative：下面两个渐隐遮罩是 absolute inset-x-0，需要以**这个滚动区**
    // 为定位祖先，否则会落到 SidebarInset/视口上，跟随不到本页的滚动容器。
    <div className="relative grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)] grid-cols-1 gap-y-6 xl:gap-x-10 2xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)]">
      <div
        className="
            pointer-events-none
            absolute inset-x-0 top-0 z-10 h-20
            bg-linear-to-b from-background to-transparent
          "
      />
      <HookSidebar
        label="目录"
        items={sectionLabels}
        value={active}
        onChange={(i) => sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth" })}
        className="hidden w-fit justify-self-end self-start 2xl:flex mx-auto mt-20"
      />

      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl xl:max-w-2xl overflow-y-auto pt-20 pb-40 scrollbar-none"
      >
        <article className="typeset typeset-docs">
          <h1>帮助文档</h1>
          <p className="text-muted-foreground">
            面向学生与教师的协作学习空间。本文覆盖注册登录、两种身份的工作台、
            界面操作与常见问题。左侧目录可跳转，支持键盘浏览。
          </p>
          <blockquote>
            <p>
              本帮助页的正文（标题层级、表格、代码、引用块等）由
              <code>typeset.css</code>
              排版；若样式缺失或错乱，通常是该样式层未加载。
            </p>
          </blockquote>

          <section
            id="quick-start"
            ref={(el) => {
              sectionRefs.current[0] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>快速开始</h2>
            <p>
              本平台是一套<b>协作学习空间</b>
              ：学生与教师按角色进入各自的工作台， 在这里注册登录、管理账号、浏览资源与课堂入口。
            </p>

            <h3>三步上手</h3>
            <ol>
              <li>前往注册页或用社交账号创建一个账号（注册成功即直接登录）。</li>
              <li>根据账号角色自动进入对应工作台：学生→「学生」，教师→「教师」。</li>
              <li>从左侧栏进入各功能入口；更多账号操作见左下角头像菜单。</li>
            </ol>

            <h3>身份对应</h3>
            <p>
              账号<b>角色</b>决定你进入的工作台，两者一一对应，无法随意切换：
            </p>
            <ul>
              <li>
                <strong>student</strong>（学生）：访问「学生」工作台 （
                <code>/authenticated/student</code>）。
              </li>
              <li>
                <strong>teacher</strong>（教师）：访问「教师」工作台 （
                <code>/authenticated/teacher</code>）。
              </li>
              <li>
                <strong>admin</strong>（管理员）：访问「管理员」工作台 （
                <code>/authenticated/admin</code>）。目前与其他角色权限相同。
              </li>
            </ul>
            <p>
              系统按角色在<b>路由进入前</b>自动跳转：角色不符会被重定向到
              对应的工作台，而非报错。例如学生访问教师地址会被送回学生工作台。
            </p>
          </section>

          <section
            id="account"
            ref={(el) => {
              sectionRefs.current[1] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>账号与身份</h2>

            <h3>注册</h3>
            <p>注册需要三项信息：</p>
            <ul>
              <li>
                <strong>名称</strong>：1–50 个字符，用于头像与页面的展示。
              </li>
              <li>
                <strong>邮箱</strong>
                ：须为合法邮箱格式，全站唯一，重复注册会被拒绝。
              </li>
              <li>
                <strong>密码</strong>：6–32 位，哈希存储，服务端不保存明文。
              </li>
            </ul>
            <p>
              注册即登录：账号创建成功的同时会直接建立会话，无需二次登录。 注册
              <b>不验证邮箱所有权</b>，仅需确保填写的邮箱可用即可。
            </p>

            <h3>登录</h3>
            <p>
              使用注册时的邮箱与密码登录。会话有效期为 7 天；若长时间未使用，
              重新登录即可，无需担心过期数据丢失。
            </p>

            <h3>重置密码</h3>
            <p>忘记密码时走「忘记密码」流程：</p>
            <ol>
              <li>输入注册邮箱并提交。</li>
              <li>查收邮件，打开其中的重置链接（15 分钟内有效）。</li>
              <li>输入新密码并提交。</li>
              <li>重置成功后系统直接建立登录会话，无需再次登录。</li>
            </ol>
            <blockquote>
              <p>
                <b>隐私提示</b>
                ：无论该邮箱是否已注册，系统都会返回同样的成功提示，
                防止他人探测你的账号是否存在。若迟迟收不到邮件，请检查垃圾箱， 或联系管理员。
              </p>
            </blockquote>
          </section>

          <section
            id="workspace"
            ref={(el) => {
              sectionRefs.current[2] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>工作台与导航</h2>
            <p>
              登录后进入的仪表盘会根据当前账号自动区分面向对象。 多数页面的可用入口与你的身份相关。
            </p>

            <h3>主要区域</h3>
            <ul>
              <li>
                <b>工作台</b>：登录后落地页面，按角色展示欢迎信息与身份。
              </li>
              <li>
                <b>学习资源 / 课堂活动</b>：侧边栏分组，含资源、课例、 小组合作、展评、拓展等入口。
              </li>
              <li>
                <b>头像菜单</b>：位于左下角，集中了个人中心、通知、主题与登出。
              </li>
            </ul>

            <h3>两种工作台</h3>
            <div className="typeset-scroll">
              <table>
                <thead>
                  <tr>
                    <th>工作台</th>
                    <th>适用角色</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>学生</td>
                    <td>
                      <code>student</code>
                    </td>
                    <td>面向学习者，浏览资源、参与课堂活动。</td>
                  </tr>
                  <tr>
                    <td>教师</td>
                    <td>
                      <code>teacher</code>
                    </td>
                    <td>面向授课者，管理内容与协作。</td>
                  </tr>
                  <tr>
                    <td>管理员</td>
                    <td>
                      <code>admin</code>
                    </td>
                    <td>预留角色。目前不比其他角色多任何权限，等待接入管理功能。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>侧边栏分组</h3>
            <dl>
              <dt>学习资源</dt>
              <dd>资源、课例——资料与教案的存放区。</dd>
              <dt>课堂活动</dt>
              <dd>小组合作、展评、拓展——课堂组织的承载区。</dd>
            </dl>
            <h5>暂无独立页面时</h5>
            <p>
              若点击某入口后主区域仍显示占位文案，说明该模块尚未开放， 但导航本身仍可用于占位演示。
            </p>
          </section>

          <section
            id="interface"
            ref={(el) => {
              sectionRefs.current[3] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>界面操作</h2>

            <h3>键盘快捷键</h3>
            <p>
              以下快捷键在桌面端的已登录工作区全局生效，可将鼠标拖拽、层层点击
              缩成几下按键。本文统一以 Windows 的<kbd>Ctrl</kbd> 写法示意（macOS 上通常对应{" "}
              <kbd>⌘</kbd> / <kbd>⌃</kbd>）。
            </p>
            <div className="typeset-scroll">
              <table>
                <thead>
                  <tr>
                    <th>按键</th>
                    <th>作用</th>
                    <th>在哪儿用</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <kbd>Ctrl</kbd> + <kbd>K</kbd>
                    </td>
                    <td>
                      打开 / 关闭<b>命令面板</b>（可搜索帮助主题与导航项）。
                    </td>
                    <td>任意位置（输入框内也可）</td>
                  </tr>
                  <tr>
                    <td>
                      <kbd>Ctrl</kbd> + <kbd>B</kbd>
                    </td>
                    <td>
                      展开 / 收起<b>侧边栏</b>。
                    </td>
                    <td>任意位置</td>
                  </tr>
                  <tr>
                    <td>
                      <kbd>Ctrl</kbd> + <kbd>J</kbd>
                    </td>
                    <td>
                      在<b>亮色 / 暗色</b>主题间切换。
                    </td>
                    <td>任意位置</td>
                  </tr>
                  <tr>
                    <td>
                      <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd>
                    </td>
                    <td>
                      <b>退出登录</b>。
                    </td>
                    <td>任意位置</td>
                  </tr>
                  <tr>
                    <td>
                      <kbd>→</kbd> / <kbd>End</kbd>
                    </td>
                    <td>展开被折叠的侧边栏。</td>
                    <td>侧边栏边缘的调整手柄获得焦点后</td>
                  </tr>
                  <tr>
                    <td>
                      <kbd>←</kbd> / <kbd>Home</kbd>
                    </td>
                    <td>收起侧边栏。</td>
                    <td>同上（拖拽缩放的替代）</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              顶栏的<b>搜索框</b>本身就是命令面板入口：点击它或在任意处按
              <kbd>Ctrl</kbd> + <kbd>K</kbd>
              ，即可输入关键词检索文档主题或浏览导航项。 命令面板也支持仅用键盘上下选择、回车执行。
            </p>
            <h4>上手建议</h4>
            <blockquote>
              <p>
                先用 <kbd>Ctrl</kbd> + <kbd>K</kbd> 打开命令面板探索——
                它能以最小试错成本带你熟悉全部可导航区域与内置快捷键的入口； 记住 <kbd>Ctrl</kbd> +{" "}
                <kbd>B</kbd>（侧栏）与 <kbd>Ctrl</kbd> +<kbd>J</kbd>
                （换肤）这两个高频动作能最快提升日常效率。
              </p>
            </blockquote>

            <h3>登出</h3>
            <ol>
              <li>
                点击左下角你的<b>头像</b>。
              </li>
              <li>在弹出菜单中选择「登出」。</li>
            </ol>
            <p>
              快捷方式：任意处按 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> +<kbd>L</kbd>
              。登出会清除本机会话；公共或共享电脑离开前请务必登出。
            </p>

            <h3>切换配色主题</h3>
            <ol>
              <li>
                点击左下角<b>头像</b> → <b>主题</b>。
              </li>
              <li>在「亮色主题」「暗色主题」间选择。</li>
            </ol>

            <details>
              <summary>主题设置会保存到哪里？</summary>
              <p>
                选择会存入浏览器本地存储（<code>localStorage</code>），
                并在刷新时同步到整个页面。清除浏览器站点数据后会恢复默认（亮色）。
              </p>
            </details>

            <h3>查看个人中心与通知</h3>
            <ul>
              <li>个人中心：头像菜单 →「个人中心」。</li>
              <li>通知：头像菜单 →「通知」。</li>
            </ul>
            <p>这些页面展示当前登录账号的相关信息；若尚未实装文案，会显示占位内容。</p>
          </section>

          <section
            id="troubleshoot"
            ref={(el) => {
              sectionRefs.current[4] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>安全与故障排查</h2>

            <h3>常见问题</h3>

            <details open>
              <summary>登录提示邮箱或密码错误</summary>
              <ul>
                <li>密码至少 6 位，请检查大小写与多余空格。</li>
                <li>若多次忘记，请走「忘记密码」重置。</li>
              </ul>
            </details>

            <details>
              <summary>忘记密码收不到邮件</summary>
              <p>
                重置邮件可能被当作垃圾邮件拦截，也请检查是否填入了注册邮箱。
                当前环境可能仅输出到控制台（本地开发时请查看运行服务端的终端日志）。
              </p>
            </details>

            <details>
              <summary>进入的工作台与身份不符</summary>
              <p>
                工作台由账号角色决定且按角色跳转。若身份显示错误，
                请确认注册的角色，或联系管理员核对账号的角色设置 （<code>student</code> /{" "}
                <code>teacher</code> / <code>admin</code>）。
              </p>
            </details>

            <details>
              <summary>页面是否一定要 HTTPS？</summary>
              <p>
                生产环境会强制安全请求（<code>SameSite</code> 与仅 HTTPS Cookie）；本地开发运行在{" "}
                <code>localhost</code> 时不受影响。
              </p>
            </details>

            <h3>安全要点</h3>
            <ul>
              <li>请勿在他人设备上保持登录；登出使用 Ctrl+Shift+L。</li>
              <li>
                会话 Cookie 为 <code>httpOnly</code>
                ，脚本无法读取，但仍请保管好账号。
              </li>
              <li>重置令牌 15 分钟有效，逾期请重新申请；收到后请及时处理。</li>
              <li>若怀疑账号被盗，请立即在可信设备上重置密码，并联系管理员。</li>
            </ul>
            <h3>其他问题</h3>
            <p>
              遇到本页未覆盖的问题，请附上问题截图、操作步骤及相关页面路径，
              联系管理员以便快速定位。
            </p>
          </section>

          <section
            id="dev"
            ref={(el) => {
              sectionRefs.current[5] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>致开发者</h2>
            <p>
              本帮助文档由 <code>typeset.css</code>
              提供排版，以下是本页用到的主要类型， 便于后续扩充时对号入座。
            </p>
            <ul>
              <li>
                <strong>标题层级</strong>：<code>h1</code>–<code>h6</code>
                自带等比字号与纵向节奏，页面应遵从层级而非随意选用。
              </li>
              <li>
                <strong>代码</strong>：行内 <code>code</code>、代码块
                <code>pre</code> 均有独立底色与字体。
              </li>
              <li>
                <strong>引用 &amp; 警示</strong>：<code>blockquote</code>
                左侧带线条，适合作提示、隐私声明。
              </li>
              <li>
                <strong>折叠</strong>：<code>details</code> +<code>summary</code>
                适合收纳"常见问题"长条目；<code>mark</code> 可高亮重点。
              </li>
              <li>
                <strong>键位</strong>：<code>kbd</code> 渲染为按键式样。
              </li>
              <li>
                <strong>表格滚动</strong>：宽表外加 <code>.typeset-scroll</code>
                可横向滚动而不挤破版心。
              </li>
              <li>
                <strong>局部逃生舱</strong>：在任意节点加
                <code>.not-typeset</code> 可跳过本文范式的容器排版。
              </li>
            </ul>
            <p>
              若你需要新增章节，将对应内容放入 <code>article.typeset</code>
              内、按标题层级组织即可，无需额外写样式。
            </p>
            <h6>End of Document</h6>
          </section>
        </article>
      </div>
      <div
        className="
            pointer-events-none
            absolute inset-x-0 bottom-0 z-10 h-20
            bg-linear-to-t from-background to-transparent
          "
      />
    </div>
  );
}
