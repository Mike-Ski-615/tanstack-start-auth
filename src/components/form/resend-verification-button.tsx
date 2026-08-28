import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import { toast } from "sonner";
import { resendVerificationFn } from "../../server/verification.functions";

/**
 * 重发验证邮件按钮（深组件）。
 *
 * interface 只有一个 email：60 秒倒计时、禁用态、文案切换、
 * 服务端调用与 toast 全部沉入实现——倒计时钩子的唯一住所。
 */
export function ResendVerificationButton({ email }: { email: string }) {
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleResend = async () => {
    setPending(true);
    try {
      await resendVerificationFn({ data: { email } });
      toast.info("验证邮件已重新发送，请查收");
      setSeconds(60);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={seconds > 0 || pending || !email}
      onClick={handleResend}
    >
      {seconds > 0 ? `重新发送（${seconds}s）` : "重新发送验证邮件"}
    </Button>
  );
}
