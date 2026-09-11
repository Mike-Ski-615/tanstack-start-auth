import * as React from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Button } from "#components/ui/button";

/**
 * 查询错误的边界。
 *
 * ## 为什么需要它
 *
 * 路由的 `errorComponent` **只接 loader 的错误**，组件内 `useQuery` 失败
 * 不会触发它。所以渲染期间抛出的查询错误（比如 `throwOnError: true`、
 * 或查询数据访问时抛错）此前**没有任何兜底** —— 直接是白屏。
 *
 * react-query 的官方方案是 `QueryErrorResetBoundary` 包一层错误边界：
 *
 *   <QueryErrorResetBoundary>
 *     {({ reset }) => (
 *       <ErrorBoundary onReset={reset} fallbackRender={...}>
 *
 * `reset` 会把被边界捕获的那些查询标记为可重试，点「重试」才能真正重查 ——
 * 否则边界复位了，查询还停在 error 状态，会立刻再抛一次，看起来像「点了没用」。
 *
 * ## 为什么自己写 class 而不装 react-error-boundary
 *
 * React 19 仍未提供函数式的错误边界（`ErrorBoundary` 不是 react 的导出），
 * 官方只能写 class 组件。这段不到 30 行，装一个依赖不值得。
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
  /** 自定义兜底渲染。默认给一句通用文案 + 重试。 */
  renderFallback?: (args: { error: Error; retry: () => void }) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  private retry = () => {
    // 顺序要紧：先清掉本地的 error（否则边界还停在兜底态），
    // 再调 react-query 的 reset（把被捕获的查询标记为可重试）。
    this.setState({ error: null });
    this.props.onReset();
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.renderFallback) {
      return this.props.renderFallback({ error, retry: this.retry });
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">出错了</h1>
        {/* 直接展示 error.message —— 服务端抛的是用户可读句子（见 lib/error-messages.ts） */}
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" onClick={this.retry}>
          重试
        </Button>
      </div>
    );
  }
}

/**
 * 包住可能抛查询错误的子树。
 *
 * 用法（与 skill 给的一致）：
 *
 *   <QueryErrorBoundary>
 *     <SomeQueryHeavyPage />
 *   </QueryErrorBoundary>
 */
export function QueryErrorBoundary({
  children,
  renderFallback,
}: {
  children: React.ReactNode;
  renderFallback?: ErrorBoundaryProps["renderFallback"];
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner onReset={reset} renderFallback={renderFallback}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
