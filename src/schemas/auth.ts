import z from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "请输入邮箱").pipe(z.email("邮箱格式不正确")),
  password: z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "请输入用户名").max(50, "用户名最多 50 个字符"),
  email: z.string().min(1, "请输入邮箱").pipe(z.email("邮箱格式不正确")),
  password: z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位"),
});
export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
