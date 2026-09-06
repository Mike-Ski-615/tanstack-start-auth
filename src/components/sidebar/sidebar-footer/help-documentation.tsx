import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { BookText, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog";
import { Button } from "#components/ui/button";

export function HelpDocumentation() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog>
          <DialogTrigger asChild>
            <SidebarMenuButton>
              <BookText />
              <span className="flex-1">帮助文档</span>
              <ExternalLink />
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>帮助文档</DialogTitle>
              <DialogDescription>
                快速了解平台的基本操作与常见问题。
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-4 no-scrollbar max-h-[50vh] space-y-6 overflow-y-auto px-4">
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">账号与登录</h3>
                <p className="text-sm leading-normal text-muted-foreground">
                  使用注册的邮箱和密码登录。忘记密码时，可在登录页点击「忘记密码」，通过邮箱验证后重置。
                </p>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">学生与教师角色</h3>
                <p className="text-sm leading-normal text-muted-foreground">
                  系统会根据账号角色自动跳转：学生进入「学生」页面，教师进入「教师」页面，无需手动切换。
                </p>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">侧边栏操作</h3>
                <p className="text-sm leading-normal text-muted-foreground">
                  拖动侧边栏右侧的竖向分隔条可展开或收起侧边栏：向右拖动超过阈值后松手即展开，向左拖动超过阈值后松手即收起；未达到阈值时会自动回弹到原位。
                </p>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">账户菜单</h3>
                <p className="text-sm leading-normal text-muted-foreground">
                  点击左下角的头像可打开账户菜单，在其中查看个人信息、升级套餐或退出登录。
                </p>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">退出登录</h3>
                <p className="text-sm leading-normal text-muted-foreground">
                  在账户菜单中点击「登出」即可安全退出并返回首页。
                </p>
              </section>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button variant="outline">关闭</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
