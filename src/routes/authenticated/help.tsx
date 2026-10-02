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
  "账号与认证",
  "角色与工作台",
  "导航与命令面板",
  "外观与偏好",
  "账户与安全",
  "通知与消息",
  "键盘快捷键",
  "常见问题",
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
            面向学生与教师的协作学习空间。本文覆盖从注册、邮箱验证、登录，
            到三种角色工作台、导航、外观偏好、账户安全与通知的完整说明。
            左侧目录可跳转，支持键盘浏览。
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
              <li>
                前往<a href="/auth/register">注册页</a>
                创建账号，或使用第三方账号注册；提交后会收到一封
                <b>邮箱验证码</b>，输入 6 位数字即完成注册并自动登录。
              </li>
              <li>
                系统按账号角色自动进入对应工作台：学生→「学生」，教师→「教师」，
                管理员→「教师管理」。
              </li>
              <li>
                从左侧栏进入各功能入口；账号、外观与安全设置见左下角<b>头像菜单</b>。
              </li>
            </ol>

            <h3>界面总览</h3>
            <p>登录后的界面由四块区域构成，理解它们就能定位到几乎所有功能：</p>
            <div className="typeset-scroll">
              <table>
                <thead>
                  <tr>
                    <th>区域</th>
                    <th>位置</th>
                    <th>作用</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>侧边栏</td>
                    <td>左侧</td>
                    <td>按角色分组的功能导航；可折叠、可键盘操作。</td>
                  </tr>
                  <tr>
                    <td>顶栏</td>
                    <td>顶部</td>
                    <td>搜索框（命令面板入口）与页面级操作。</td>
                  </tr>
                  <tr>
                    <td>主内容区</td>
                    <td>中部</td>
                    <td>当前页面正文，宽度可切换。</td>
                  </tr>
                  <tr>
                    <td>头像菜单</td>
                    <td>左下角</td>
                    <td>个人资料、设置、主题、外观与登出。</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
                <strong>admin</strong>（管理员）：访问「教师管理」后台 （
                <code>/authenticated/admin/teachers</code>）。
              </li>
            </ul>
            <p>
              系统按角色在<b>路由进入前</b>自动跳转：角色不符会被重定向到
              对应的工作台，而非报错。例如学生访问教师地址会被送回学生工作台。
            </p>
          </section>

          <section
            id="auth"
            ref={(el) => {
              sectionRefs.current[1] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>账号与认证</h2>

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
              注册页同时提供 <b>Apple / Google</b> 第三方入口（当前为占位按钮）。
              提交注册后系统会发送一封<b>6 位数字验证码</b>邮件。
            </p>

            <h3>验证邮箱</h3>
            <p>
              注册成功后进入验证页，输入邮件里的 6 位验证码即可完成验证并自动登录。
              验证码输入框支持逐格填写与键盘操作。
            </p>
            <ul>
              <li>
                验证码为 <b>6 位数字</b>；未收到可点击「重新发送」。
              </li>
              <li>
                验证状态可在<b>账户</b>与<b>隐私与安全</b>页查看；未验证账户可能受限。
              </li>
              <li>验证邮箱会记录验证时间，并在账户页显示「邮箱已验证 · 安全」标记。</li>
            </ul>

            <h3>登录</h3>
            <p>
              使用注册时的邮箱与密码登录。会话有效期为 7 天；若长时间未使用，
              重新登录即可，无需担心过期数据丢失。
            </p>
            <p>
              本平台采用<b>单设备登录</b>：同一时刻只允许一台设备在线，
              在别处登录会自动使旧设备下线（见<a href="#account">账户与安全</a>）。
            </p>

            <h3>重置密码</h3>
            <p>忘记密码时走「忘记密码」流程：</p>
            <ol>
              <li>输入注册邮箱并提交。</li>
              <li>
                查收邮件，取出其中的<b>6 位验证码</b>（15 分钟内有效）。
              </li>
              <li>在重置页填入验证码与新密码并提交。</li>
              <li>重置成功后系统直接建立登录会话，无需再次登录。</li>
            </ol>
            <blockquote>
              <p>
                <b>隐私提示</b>
                ：无论该邮箱是否已注册，系统都会返回同样的成功提示，
                防止他人探测你的账号是否存在。若迟迟收不到邮件，请检查垃圾箱， 或联系管理员。
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
          </section>

          <section
            id="workspace"
            ref={(el) => {
              sectionRefs.current[2] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>角色与工作台</h2>
            <p>
              登录后进入的仪表盘会根据当前账号自动区分面向对象， 多数页面的可用入口与你的身份相关。
            </p>

            <h3>三种角色</h3>
            <div className="typeset-scroll">
              <table>
                <thead>
                  <tr>
                    <th>工作台</th>
                    <th>角色代码</th>
                    <th>落地地址</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>学生</td>
                    <td>
                      <code>student</code>
                    </td>
                    <td>
                      <code>/authenticated/student</code>
                    </td>
                    <td>面向学习者，浏览资源、参与课堂活动。</td>
                  </tr>
                  <tr>
                    <td>教师</td>
                    <td>
                      <code>teacher</code>
                    </td>
                    <td>
                      <code>/authenticated/teacher</code>
                    </td>
                    <td>面向授课者，管理内容与协作。</td>
                  </tr>
                  <tr>
                    <td>管理员</td>
                    <td>
                      <code>admin</code>
                    </td>
                    <td>
                      <code>/authenticated/admin/teachers</code>
                    </td>
                    <td>管理教师与学生账号、下发站内通知。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>侧边栏分组</h3>
            <p>侧边栏按角色提供不同分组的入口：</p>
            <dl>
              <dt>学习资源（学生）/ 教学资源（教师）</dt>
              <dd>资源、课例——资料与教案的存放区。</dd>
              <dt>课堂活动</dt>
              <dd>小组合作、展评、拓展——课堂组织的承载区。</dd>
            </dl>
            <p>
              若点击某入口后主区域仍显示占位文案，说明该模块尚未开放， 但导航本身仍可用于占位演示。
            </p>

            <h3>管理员后台</h3>
            <p>管理员角色的侧边栏切换到后台分组，包含以下页面：</p>
            <ul>
              <li>
                <b>教师管理</b>（<code>/admin/teachers</code>）：查看教师列表，
                调整角色、重置密码或编辑资料。
              </li>
              <li>
                <b>学生管理</b>（<code>/admin/students</code>）：与学生用户同样的管理能力。
              </li>
              <li>
                <b>通知下发</b>（<code>/admin/notifications</code>）：撰写站内通知，
                可按全部、按角色或按指定用户发送，并可附带站内链接。
              </li>
            </ul>
            <p>
              管理员对用户的操作以服务端校验为准：可设置的目标角色限于
              <code>student</code> 与 <code>teacher</code>。
            </p>
          </section>

          <section
            id="navigation"
            ref={(el) => {
              sectionRefs.current[3] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>导航与命令面板</h2>

            <h3>侧边栏</h3>
            <ul>
              <li>
                桌面端默认展开；点击顶栏的侧栏图标或按 <kbd>Ctrl</kbd> +<kbd>B</kbd> 展开 / 收起。
              </li>
              <li>移动端（窄屏）侧边栏收起为抽屉，点按图标展开，选择条目后自动关闭。</li>
              <li>
                侧边栏右缘有一个<b>调整手柄</b>：按住拖动可临时改变宽度，松开后回弹到默认宽度；
                拖到足够窄则会<b>折叠</b>侧边栏。该手柄获得焦点后， 也可用 <kbd>←</kbd> /{" "}
                <kbd>Home</kbd> 收起、
                <kbd>→</kbd> / <kbd>End</kbd> 展开。
              </li>
            </ul>

            <h3>账户菜单</h3>
            <p>左下角头像菜单是账号相关操作的集中入口，自上而下包含：</p>
            <ul>
              <li>
                <b>用户信息</b>：头像、名称与邮箱。
              </li>
              <li>
                <b>设置入口</b>：主页、账户、个人信息、修改密码、通知、隐私与安全。
              </li>
              <li>
                <b>主题</b>：在<b>亮色 / 暗色</b>间切换。
              </li>
              <li>
                <b>外观</b>：跳转到主题色、圆角、字号三个外观页。
              </li>
              <li>
                <b>登出</b>：附带 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> 快捷键提示。
              </li>
            </ul>
            <p>菜单在移动端自底部弹出，桌面端从右侧贴出头像菜单，条目内容一致。</p>

            <h3>命令面板</h3>
            <p>
              按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 或点击顶栏<b>搜索框</b>
              打开命令面板。它把全站的入口汇成一处可搜索的列表：
            </p>
            <ul>
              <li>
                <b>帮助主题</b>：快速跳到本文的对应章节。
              </li>
              <li>
                <b>导航</b>：当前角色可用的侧边栏入口。
              </li>
              <li>
                <b>设置</b>：全部设置页，选择后直接跳转。
              </li>
            </ul>
            <p>
              面板支持纯键盘操作：输入关键词过滤、方向键选择、回车执行、<kbd>Esc</kbd> 关闭。
              在输入框内也能用 <kbd>Ctrl</kbd> + <kbd>K</kbd> 触发。
            </p>

            <h3>查阅设置</h3>
            <p>
              设置页之间可以随时切换：进入设置后，左侧（或移动端顶部）会列出全部分组 ——
              主页、账户、个人信息、修改密码、通知，以及「外观」下的主题色、圆角、字号，
              还有隐私与安全。
            </p>
          </section>

          <section
            id="appearance"
            ref={(el) => {
              sectionRefs.current[4] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>外观与偏好</h2>
            <p>
              外观设置集中在<b>头像菜单 → 外观</b>，以及<b>主题</b>子菜单中。
              所有选择会即时生效，并保存在浏览器本地。
            </p>

            <h3>主题（亮色 / 暗色）</h3>
            <ul>
              <li>
                入口：头像菜单 →「主题」，或按 <kbd>Ctrl</kbd> +<kbd>J</kbd> 直接切换。
              </li>
              <li>切换会同步到整个页面，包括图表、代码块等。</li>
            </ul>

            <h3>主题色</h3>
            <p>
              在<b>设置 → 外观 → 主题色</b>中选择主色调，可选<b>橙、蓝、绿、紫、玫红</b>五色。
              主题色会作用于按钮、链接、标签、开关、图表等所有使用主色的组件。
              页面下方的实时预览以真实组件展示效果。
            </p>

            <h3>圆角</h3>
            <p>
              在<b>设置 → 外观 → 圆角</b>中调整全局圆角半径，共四个锚点：
              <code>0rem</code>（直角）、<code>0.45rem</code>、<code>0.625rem</code>（默认）、
              <code>0.875rem</code>（圆润）。 该值写入 <code>--radius</code>
              ，卡片、按钮、输入框、标签等会按比例联动。
            </p>

            <h3>字号</h3>
            <p>
              在<b>设置 → 外观 → 字号</b>中缩放全局文字，范围 <b>90%–115%</b>，连续可调。
              它作用于根元素的字体缩放（<code>--app-font-scale</code>），所有 <code>rem</code>{" "}
              尺寸随之变化，因此不仅影响正文，也影响间距与控件高度。
            </p>

            <h3>内容宽度</h3>
            <p>
              顶栏提供<b>内容宽度</b>切换（通栏 / 宽 / 窄），控制正文区域的最大宽度。
              该设置同样会持久化，并与侧边栏间距配合，使长文阅读更舒适。
            </p>

            <details open>
              <summary>这些外观选择保存在哪里？</summary>
              <p>
                全部存于浏览器本地存储（<code>localStorage</code>），刷新后依然生效。
                清除浏览器站点数据会恢复默认（亮色主题、橙色主题色、默认圆角与字号）。
              </p>
            </details>
          </section>

          <section
            id="account"
            ref={(el) => {
              sectionRefs.current[5] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>账户与安全</h2>
            <p>
              设置页中的<b>账户</b>、<b>个人信息</b>、<b>修改密码</b>、<b>隐私与安全</b>
              四页共同管理你的账号。
            </p>

            <h3>账户信息</h3>
            <p>「账户」页展示只读的基本信息与安全状态：</p>
            <ul>
              <li>
                <b>基本信息</b>：用户 ID、邮箱、注册时间、角色。
              </li>
              <li>
                <b>验证状态</b>：邮箱是否已验证，已验证会显示验证时间与「安全」标记。
              </li>
              <li>
                <b>登录状态</b>：单设备登录开关状态、设备绑定情况、会话版本号 （密码修改后递增）。
              </li>
            </ul>

            <h3>修改个人信息</h3>
            <p>在「个人信息」页编辑：</p>
            <ul>
              <li>
                <b>用户名</b>：1–50 个字符，会显示在头像与页面各处。
              </li>
              <li>
                <b>个人介绍</b>：最多 200 个字符。
              </li>
            </ul>
            <p>保存后立即生效，并会刷新账号相关的缓存数据。</p>

            <h3>修改密码</h3>
            <p>
              在「修改密码」页填写<b>当前密码</b>与<b>新密码</b>（6–32 位）即可更新。
            </p>
            <blockquote>
              <p>
                修改密码会<b>递增会话版本号</b>，使其他设备上的旧会话立即失效（配合单设备登录）。
                请优先在可信设备上操作，修改后可能需要重新登录其他设备。
              </p>
            </blockquote>

            <h3>隐私与安全</h3>
            <p>「隐私与安全」页汇总了当前的设备与会话详情：</p>
            <div className="typeset-scroll">
              <table>
                <thead>
                  <tr>
                    <th>区块</th>
                    <th>内容</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>邮箱验证</td>
                    <td>验证状态与验证时间。</td>
                  </tr>
                  <tr>
                    <td>当前设备</td>
                    <td>设备名、平台、IP、登录时间与最后活动时间。</td>
                  </tr>
                  <tr>
                    <td>当前会话</td>
                    <td>会话 ID、版本号、创建时间与过期时间。</td>
                  </tr>
                  <tr>
                    <td>撤销全部会话</td>
                    <td>一键使所有设备下线，需二次确认。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>单设备登录与撤销</h3>
            <ul>
              <li>
                <b>单设备登录</b>：同一时刻仅一台设备在线，新登录会踢出旧设备。
              </li>
              <li>
                <b>撤销全部会话</b>：在「隐私与安全」页点击按钮并确认后，
                所有设备（含当前）都将需要重新登录，且操作无法撤销。
                怀疑账号被盗时这是第一处置手段。
              </li>
            </ul>
          </section>

          <section
            id="notifications"
            ref={(el) => {
              sectionRefs.current[6] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>通知与消息</h2>

            <h3>通知偏好</h3>
            <p>
              在<b>设置 → 通知</b>中用开关控制「新通知弹窗提醒」。
              关闭后仍会收到站内消息，只是不再弹出即时提醒。
            </p>

            <h3>通知历史</h3>
            <p>
              同一页面下方是<b>通知历史</b>列表，展示已收到的站内消息。
              列表可滚动查看，并可标记为已读。
            </p>

            <h3>未读与即时提醒</h3>
            <ul>
              <li>侧边栏与通知入口会体现未读数量。</li>
              <li>收到新消息时，在偏好开启的情况下会在页面右上弹出提醒（toast）。</li>
              <li>未读数量会在后台定期刷新，无需手动刷新页面。</li>
            </ul>

            <h3>管理员下发通知</h3>
            <p>
              管理员可在<b>后台 → 通知下发</b>撰写通知，内容包含标题（最多 100 字） 与正文（最多
              1000 字），并可选填一个<b>站内链接</b>（须以 <code>/</code> 开头）。 发送范围可按
              <b>全部用户</b>、<b>按角色</b>或<b>按指定用户</b>选择。
            </p>
          </section>

          <section
            id="shortcuts"
            ref={(el) => {
              sectionRefs.current[7] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>键盘快捷键</h2>
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
                      打开 / 关闭<b>命令面板</b>（可搜索帮助主题、导航项与设置）。
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
                  <tr>
                    <td>
                      <kbd>Esc</kbd>
                    </td>
                    <td>关闭命令面板、下拉菜单或对话框。</td>
                    <td>浮层打开时</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h4>上手建议</h4>
            <blockquote>
              <p>
                先用 <kbd>Ctrl</kbd> + <kbd>K</kbd> 打开命令面板探索——
                它能以最小试错成本带你熟悉全部可导航区域与内置快捷键的入口； 记住 <kbd>Ctrl</kbd> +{" "}
                <kbd>B</kbd>（侧栏）与 <kbd>Ctrl</kbd> +<kbd>J</kbd>
                （换肤）这两个高频动作能最快提升日常效率。
              </p>
            </blockquote>
          </section>

          <section
            id="faq"
            ref={(el) => {
              sectionRefs.current[8] = el;
            }}
            className="scroll-mt-8"
          >
            <h2>常见问题</h2>

            <h3>登录与注册</h3>

            <details open>
              <summary>登录提示邮箱或密码错误</summary>
              <ul>
                <li>密码为 6–32 位，请检查大小写与多余空格。</li>
                <li>若多次忘记，请走「忘记密码」重置。</li>
              </ul>
            </details>

            <details>
              <summary>收不到验证码或重置邮件</summary>
              <p>
                验证码/重置邮件可能被当作垃圾邮件拦截，也请确认填入了注册邮箱。
                当前环境可能仅输出到控制台（本地开发时请查看运行服务端的终端日志）。
                验证页可点击「重新发送」重试。
              </p>
            </details>

            <details>
              <summary>邮箱一直显示未验证</summary>
              <p>
                未完成验证的账号可能在功能上受限。请回到验证页输入 6 位验证码完成验证；
                验证成功后「账户」页会显示验证时间与「安全」标记。
              </p>
            </details>

            <h3>身份与权限</h3>

            <details>
              <summary>进入的工作台与身份不符</summary>
              <p>
                工作台由账号角色决定且按角色跳转。若身份显示错误，
                请确认注册的角色，或联系管理员核对账号的角色设置 （<code>student</code> /{" "}
                <code>teacher</code> / <code>admin</code>）。
              </p>
            </details>

            <details>
              <summary>为什么我在别处登录后，这台设备被退出了？</summary>
              <p>
                本平台启用<b>单设备登录</b>，同一时刻只保留一台在线设备。
                这是有意为之的安全策略；如需彻底下线所有设备，可在「隐私与安全」页撤销全部会话。
              </p>
            </details>

            <h3>界面与外观</h3>

            <details>
              <summary>我的主题、主题色或圆角没有生效</summary>
              <p>
                这些偏好保存在 <code>localStorage</code>。若浏览器开启了无痕模式、
                禁用了站点存储，或清除了站点数据，设置会在下次访问时恢复默认。
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
              <li>验证码 / 重置码请勿转发，收到后请及时使用。</li>
              <li>若怀疑账号被盗，请立即在可信设备上重置密码并撤销全部会话，并联系管理员。</li>
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
              sectionRefs.current[9] = el;
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
                适合收纳「常见问题」长条目；<code>mark</code> 可高亮重点。
              </li>
              <li>
                <strong>键位</strong>：<code>kbd</code> 渲染为按键式样。
              </li>
              <li>
                <strong>描述列表</strong>：<code>dl</code> / <code>dt</code> /<code>dd</code>
                用于「名称—释义」式条目。
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
            <h3>如何新增章节</h3>
            <ol>
              <li>
                在 <code>sectionLabels</code> 数组末尾按顺序补一个中文标题。
              </li>
              <li>
                在 <code>&lt;article&gt;</code> 内新增一个{" "}
                <code>&lt;section id="…" ref=&#123;…&#125;&gt;</code>， 并让{" "}
                <code>sectionRefs</code> 的索引与标签数组一致。
              </li>
              <li>按标题层级组织正文，无需额外写样式。</li>
            </ol>
            <p>
              左侧目录（<code>HookSidebar</code>）与滚动高亮由 <code>sectionRefs</code>
              自动驱动；命令面板中的「帮助主题」来自 <code>HELP_SECTIONS</code>，
              如需在面板中发现新章节，请同步补充该数据。
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
