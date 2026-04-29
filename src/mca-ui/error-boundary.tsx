"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { Component, type ErrorInfo, type ReactNode } from "react";

export type MCAErrorBoundaryProps = {
  children: ReactNode;
  /** Shown in structured logs (required for observability). */
  componentName: string;
  surfaceName: string;
  traceId?: string;
  /** Optional heading override */
  title?: string;
};

type State = { error: Error | null };

function ctxFromProps(p: MCAErrorBoundaryProps): McaLogContext {
  return {
    componentName: p.componentName,
    surfaceName: p.surfaceName,
    ...(p.traceId ? { traceId: p.traceId } : {}),
  };
}

export class MCAErrorBoundary extends Component<MCAErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    mcaLog.error(
      "ui.errorBoundary",
      { err, componentStack: info.componentStack },
      ctxFromProps(this.props)
    );
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { children, title = "Something went wrong" } = this.props;
    const { error } = this.state;

    if (error) {
      return (
        <Panel
          elevated
          className="border border-mca-error-border-strong/40 bg-mca-error-surface/25 p-mca-lg transition-[opacity,box-shadow] duration-200 ease-mca-standard"
        >
          <p className="text-mca-body font-semibold text-mca-error-text-strong">{title}</p>
          <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
            This section hit an unexpected error. You can try again, or reload the page if the problem
            continues.
          </p>
          {process.env.NODE_ENV === "development" ? (
            <pre className="mt-mca-md max-h-32 overflow-auto rounded-mca-block border border-mca-border/80 bg-mca-surface-elevated/50 p-mca-sm text-[11px] text-mca-ink-subtle">
              {error.message}
            </pre>
          ) : null}
          <div className="mt-mca-lg">
            <Button type="button" variant="secondary" onClick={this.reset}>
              Try again
            </Button>
          </div>
        </Panel>
      );
    }

    return children;
  }
}
