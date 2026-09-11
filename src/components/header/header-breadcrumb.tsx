import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#components/ui/breadcrumb";

export function HeaderBreadcrumb() {
  return (
    // 窄屏整体收起：面包屑是位置提示，非操作目标 —— 空间不足时它先让位，
    // 优先保住搜索/通知这些能点的东西。min-w-0 + truncate 保证它不会
    // 把后面的控件顶出去。
    <Breadcrumb className="hidden min-w-0 sm:block">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink href="#">帮助</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">帮助文档</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
