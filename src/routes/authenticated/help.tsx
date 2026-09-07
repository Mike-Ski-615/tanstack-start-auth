import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/_authenticated/loading";
import { ErrorPage } from "#components/status/_authenticated/error";
import { NotFoundPage } from "#components/status/_authenticated/not-found";
import { HookSidebar } from "#components/help/hook-sidebar";

export const Route = createFileRoute("/authenticated/help")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: HelpPage,
});

const sectionLabels = ["快速开始", "学生指南", "教师指南", "常见问题"];

function HelpPage() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

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
    <div className="flex h-[calc(100svh-4rem)] min-h-0 justify-center overflow-hidden px-6 py-6">
      <div className="grid h-full min-h-0 w-full max-w-3xl grid-cols-1 xl:max-w-[calc(48rem+13rem+2.5rem)] xl:grid-cols-[13rem_1fr] xl:gap-10">
        <HookSidebar
          label="目录"
          items={sectionLabels}
          value={active}
          onChange={(i) =>
            sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth" })
          }
          className="hidden xl:block"
        />

        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 min-w-0 max-w-3xl overflow-y-auto overscroll-contain scroll-smooth pb-40"
        >
          {" "}
          <article className="typeset typeset-docs">
            <h1>帮助文档</h1>
            <p className="text-muted-foreground">
              常见问题与操作说明，点击左侧目录跳转。
            </p>

            <section
              id="quick-start"
              ref={(el) => {
                sectionRefs.current[0] = el;
              }}
              className="scroll-mt-8"
            >
              <h2>快速开始</h2>
              <p>
                欢迎使用本平台。这里是一个面向学生与教师的协作学习空间，你可以在这里组织课程、分享资料、完成小组任务并展示学习成果。
              </p>
              <h3>登录与身份</h3>
              <p>
                登录成功后，系统会根据你的账号角色自动进入对应的工作台：学生进入「学生」工作台，教师进入「教师」工作台。如果你发现进入的页面与自己的身份不符，请联系管理员核对账号权限。
              </p>
              <h3>页面导航</h3>
              <ul>
                <li>「课程」：查看、加入或管理课程与教学内容。</li>
                <li>「协作」：参与小组任务，与同学或同事实时互动。</li>
                <li>「资源」：上传、整理和分享课件与学习资料。</li>
                <li>「展示」：浏览和发布学习成果与作品。</li>
              </ul>
            </section>

            <section
              id="student"
              ref={(el) => {
                sectionRefs.current[1] = el;
              }}
              className="scroll-mt-8"
            >
              <h2>学生指南</h2>
              <h3>加入课程</h3>
              <p>
                在「课程」页面可以浏览教师发布的课程。点击课程卡片即可查看详情，已经加入的课程会出现在你的课程列表中。如需加入新课程，请向任课教师获取邀请码或由教师直接将你加入班级。
              </p>
              <h3>学习与任务</h3>
              <ul>
                <li>在课程详情中按章节学习，完成教师布置的作业与练习。</li>
                <li>
                  在「协作」中接收小组任务，与组员共同编辑、讨论并提交成果。
                </li>
                <li>提交后可在任务页面查看教师反馈与评分。</li>
              </ul>
              <h3>展示成果</h3>
              <p>
                完成的优秀作品可以发布到「展示」区，与全班同学分享。发布前请确认内容不包含隐私信息，并符合课程要求。
              </p>
            </section>

            <section
              id="teacher"
              ref={(el) => {
                sectionRefs.current[2] = el;
              }}
              className="scroll-mt-8"
            >
              <h2>教师指南</h2>
              <h3>管理课程</h3>
              <p>
                在「课程」页面可以创建新课程、设置课程简介与章节结构，并邀请学生加入班级。你可以在课程设置中调整成员名单、开放或关闭课程报名。
              </p>
              <h3>上传资源</h3>
              <p>
                使用「资源」上传课件、讲义、视频等教学资料，并把它们关联到对应课程。资源上传后默认为课程成员可见，你也可以设置为仅自己可见。
              </p>
              <h3>组织课堂互动</h3>
              <ul>
                <li>
                  通过「协作」创建小组任务，指定分组、截止时间与评分标准。
                </li>
                <li>实时查看各组的进展，给予反馈与指导。</li>
                <li>任务结束后批量查看提交结果并完成评分。</li>
              </ul>
            </section>

            <section
              id="faq"
              ref={(el) => {
                sectionRefs.current[3] = el;
              }}
              className="scroll-mt-8"
            >
              <h2>常见问题</h2>
              <h3>忘记密码怎么办？</h3>
              <p>
                前往登录页点击「忘记密码」，按提示通过注册邮箱重设密码。若收不到邮件，请检查垃圾箱或联系管理员。
              </p>
              <h3>为什么我进入了错误的工作台？</h3>
              <p>
                工作台由账号角色决定。如果你的身份显示错误，请联系管理员核对并更正账号的角色设置。
              </p>
              <h3>找不到我的课程或资源？</h3>
              <p>
                请确认你已加入该课程，且资源对该课程成员开放。仍未解决时，可以联系任课教师或平台管理员。
              </p>
              <h3>其他问题</h3>
              <p>
                遇到本页未覆盖的问题，请联系管理员获取进一步支持，并尽量附上问题截图与相关课程信息，以便快速定位。
              </p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
