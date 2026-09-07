import { SidebarHeader } from "#components/ui/sidebar";
import { SidebarBrand } from "#components/sidebar/sidebar-header/brand";
import { SearchForm } from "#components/sidebar/sidebar-header/search-form";

export function AppSidebarHeader() {
  return (
    <SidebarHeader>
      <SidebarBrand />
      <SearchForm />
    </SidebarHeader>
  );
}
