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
