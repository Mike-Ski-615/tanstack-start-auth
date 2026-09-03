import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserFn } from "../server/user.functions";
import type { User } from "../server/user.functions";

/**
 * 认证上下文（文档 §3 Authentication Context）：
 * 在客户端共享当前登录用户状态。
 *
 * 本版本（1.x）的 useServerFn 仅返回可调用函数，不提供
 * { data, isLoading, refetch } 形态，故用 useQuery 承载
 * （项目根上下文已注入 queryClient），语义与文档一致。
 */
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getUserFn(),
  });

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
