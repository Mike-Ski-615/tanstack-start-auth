import {
  useField,
  type DeepKeys,
  type ReactFormExtendedApi,
} from "@tanstack/react-form";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";

/**
 * 文本输入字段的深模块：一个小 interface，吞掉全部表单接线。
 *
 * 实现内部消化：useField 绑定、isInvalid 计算（touched && !valid）、
 * Field data-invalid / FieldLabel htmlFor / Input aria-invalid / FieldError
 * 的整套无障碍与错误展示接线。
 *
 * 建在 shadcn Field 原语之上，不是替换它们。
 */

/** 只约束表单数据类型，其余 11 个表单泛型参数在实现内部消化。 */
type AnyReactForm<TFormData> = ReactFormExtendedApi<
  TFormData,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

export function TextField<
  TFormData,
  const TName extends DeepKeys<TFormData>,
>({
  form,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
}: {
  form: AnyReactForm<TFormData>;
  /** 编译期约束：只能是该表单 values 的字段名，写错直接报红 */
  name: TName;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const field = useField({ form, name });
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        // 本模块只服务文本类字段：value 与 handleChange 按 string 对待
        value={field.state.value as string}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(event.target.value as typeof field.state.value)
        }
        aria-invalid={isInvalid}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
