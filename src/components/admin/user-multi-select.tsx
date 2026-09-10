import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon, UserIcon, UserGroupIcon } from "@hugeicons/core-free-icons";

import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover";
import { Separator } from "#components/ui/separator";
import { cn } from "#lib/utils";

/**
 * 指定收件人：搜索 + 多选。
 *
 * 只列学生与教师（管理员不是受众 —— 接口层也会再挡一道）。
 * 选中项以 Badge 形式显示，超过两个折叠成「已选 N 人」。
 */

export type SelectableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  student: "学生",
  teacher: "教师",
};

export function UserMultiSelect({
  users,
  value,
  onChange,
  disabled,
}: {
  users: SelectableUser[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 w-full justify-start border-dashed"
        >
          <HugeiconsIcon icon={UserIcon} />
          {selected.size === 0 ? (
            <span className="font-normal text-muted-foreground">选择用户</span>
          ) : (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              {selected.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  已选 {selected.size} 人
                </Badge>
              ) : (
                <div className="flex gap-1">
                  {users
                    .filter((u) => selected.has(u.id))
                    .map((u) => (
                      <Badge key={u.id} variant="secondary" className="rounded-sm px-1 font-normal">
                        {u.name}
                      </Badge>
                    ))}
                </div>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索姓名或邮箱…" />
          <CommandList>
            <CommandEmpty>没有匹配的用户</CommandEmpty>
            <CommandGroup>
              {users.map((u) => {
                const isSelected = selected.has(u.id);
                return (
                  <CommandItem
                    key={u.id}
                    value={`${u.name} ${u.email}`}
                    onSelect={() => toggle(u.id)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input [&_svg]:invisible",
                      )}
                    >
                      <HugeiconsIcon
                        icon={CheckIcon}
                        className="size-3.5 text-primary-foreground"
                      />
                    </div>
                    <span className="truncate">{u.name}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** 角色多选（学生 / 教师）。 */
export function RoleMultiSelect({
  value,
  onChange,
  disabled,
}: {
  value: ("student" | "teacher")[];
  onChange: (next: ("student" | "teacher")[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);
  const toggle = (role: "student" | "teacher") => {
    const next = new Set(selected);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    onChange([...next] as ("student" | "teacher")[]);
  };

  return (
    <div className="flex gap-2">
      {(["student", "teacher"] as const).map((role) => {
        const on = selected.has(role);
        return (
          <Button
            key={role}
            type="button"
            variant={on ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className={cn("h-8", !on && "border-dashed")}
            onClick={() => toggle(role)}
          >
            <HugeiconsIcon icon={UserGroupIcon} />
            {ROLE_LABEL[role]}
          </Button>
        );
      })}
    </div>
  );
}
