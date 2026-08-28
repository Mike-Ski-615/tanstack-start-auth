import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "#components/ui/button";
import { toast } from "sonner";
import { resendVerificationFn } from "../../server/verification.functions";

// 与 verification.ts 的服务端冷却（RESEND_COOLDOWN_SECONDS）保持一致。
// 真正的强制在服务端（冷却期内静默跳过），客户端只负责展示。
const COOLDOWN_SECONDS = 60;

/**
 * 重发验证邮件按钮（深组件）。
 *
 * interface 只有一个 email。全部状态托管给 TanStack Query：
 * - 动作状态（pending/success）→ useMutation
 * - 倒计时走秒 → useQuery 的 refetchInterval 轮询充当计时器，
 *   冷却结束自动停表（refetchInterval 返回 false）
 * 不使用任何原生 React 钩子。
 */
export function ResendVerificationButton({ email }: { email: string }) {
  const resend = useMutation({
    mutationFn: () => resendVerificationFn({ data: { email } }),
    onSuccess: () => toast.info("验证邮件已重新发送，请查收"),
  });

  const cooldownEndsAt = resend.submittedAt + COOLDOWN_SECONDS * 1000;

  const tick = useQuery({
    queryKey: ["resend-cooldown", email, resend.submittedAt],
    queryFn: () => Date.now(),
    enabled: resend.isSuccess,
    refetchInterval: () => (Date.now() >= cooldownEndsAt ? false : 1000),
  });

  const remaining = resend.isSuccess
    ? Math.max(0, Math.ceil((cooldownEndsAt - (tick.data ?? Date.now())) / 1000))
    : 0;
  const coolingDown = remaining > 0;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={coolingDown || resend.isPending || !email}
      onClick={() => resend.mutate()}
    >
      {coolingDown ? `重新发送（${remaining}s）` : "重新发送验证邮件"}
    </Button>
  );
}
