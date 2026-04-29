"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** e.g. form field id */
  id?: string;
  /** Show warning icon (solid) before text */
  showIcon?: boolean;
};

export function InlineError({ children, className = "", id, showIcon }: Props) {
  if (children == null || children === false || children === "") return null;
  return (
    <p
      id={id}
      role="alert"
      className={`flex items-center gap-mca-sm rounded-mca-block border border-mca-error-border/50 bg-mca-error-surface/25 px-mca-compact py-mca-tight text-sm text-mca-error-text ${className}`}
    >
      {showIcon ? (
        <Icon
          src={McaIcons.ui.warning}
          size="sm"
          alt=""
          className="shrink-0 opacity-90"
        />
      ) : null}
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}
