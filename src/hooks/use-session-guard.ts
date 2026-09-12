import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { currentUserQueryOptions } from "#lib/queries/user";

const SESSION_POLL_INTERVAL_MS = 30_000;

export function useSessionGuard() {
  const navigate = useNavigate();

  const { data, error } = useQuery({
    ...currentUserQueryOptions,
    refetchInterval: SESSION_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (data === null) {
      toast.error("账号已在其他设备登录，请重新登录");
      navigate({ to: "/auth/login" });
      return;
    }

    if (error) {
      toast.error("无法确认登录状态，请重新登录");
      navigate({ to: "/auth/login" });
    }
  }, [data, error, navigate]);
}
