"use client";

import { extractApiErrorMessage } from "@/lib/client/api-envelope-client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
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

type State = {
  error: Error | null;
  /** Populated after commit phase (not available in getDerivedStateFromError). */
  errorInfo: ErrorInfo | null;
};

function ctxFromProps(p: MCAErrorBoundaryProps): McaLogContext {
  return {
    componentName: p.componentName,
    surfaceName: p.surfaceName,
    ...(p.traceId ? { traceId: p.traceId } : {}),
  };
}

/** Best-effort copy for API / network failures surfaced as strings on Error.message. */
function friendlyEnvelopeHint(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const apiMsg = extractApiErrorMessage(parsed);
    return apiMsg ?? null;
  } catch {
    return null;
  }
}

export class MCAErrorBoundary extends Component<MCAErrorBoundaryProps, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, errorInfo: null };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    this.setState({ errorInfo: info });
    mcaLog.error(
      "ui.errorBoundary",
      { err, componentStack: info.componentStack },
      ctxFromProps(this.props)
    );
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- Phase 33 dev-only diagnostics
      console.debug("[MCAErrorBoundary]", {
        surface: this.props.surfaceName,
        message: err.message,
        stack: err.stack,
      });
    }
  }

  private reset = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { children, title = "Something went wrong" } = this.props;
    const { error, errorInfo } = this.state;

    if (error) {
      const envelopeHint = friendlyEnvelopeHint(error.message);
      return (
        <Panel
          elevated
          className="border border-mca-error-border-strong/40 bg-mca-error-surface/25 p-mca-lg transition-[opacity,box-shadow] duration-200 ease-mca-standard"
        >
          <p className="text-mca-body font-semibold text-mca-error-text-strong">{title}</p>
          <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
            This section hit an unexpected error. Use Retry to remount this area, or return home to keep
            browsing.
          </p>
          {envelopeHint ? (
            <p className="mt-mca-sm text-mca-caption text-mca-ink-body">{envelopeHint}</p>
          ) : null}
          {process.env.NODE_ENV === "development" ? (
            <div className="mt-mca-md space-y-mca-xs rounded-mca-block border border-mca-border/80 bg-mca-surface-elevated/50 p-mca-sm text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                Diagnostics (dev only)
              </p>
              <p className="text-[11px] text-mca-ink-body">
                <span className="text-mca-ink-subtle">Name:</span> {error.name}
              </p>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-[11px] text-mca-ink-subtle">
                {error.message}
              </pre>
              {errorInfo?.componentStack ? (
                <pre className="max-h-24 overflow-auto text-[10px] text-mca-ink-subtle/90">
                  {errorInfo.componentStack}
                </pre>
              ) : null}
            </div>
          ) : null}
          <div className="mt-mca-lg flex flex-wrap gap-mca-sm">
            <Button type="button" variant="primary" onClick={this.reset}>
              Retry
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-[2.75rem] touch-manipulation items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-mca-standard hover:bg-mca-border-subtle hover:border-mca-border-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface active:scale-[0.98]"
            >
              Return home
            </Link>
          </div>
        </Panel>
      );
    }

    return children;
  }
}
