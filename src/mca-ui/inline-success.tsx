"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
};

export function InlineSuccess({ children, className = "", showIcon }: Props) {
  if (children == null || children === false || children === "") return null;
  return (
    <p
      role="status"
      className={`flex items-center gap-mca-sm rounded-mca-block border border-mca-success-surface-border/45 bg-mca-success-surface/20 px-mca-compact py-mca-tight text-sm text-mca-success-ink ${className}`}
    >
      {showIcon ? (
        <Icon
          src={McaIcons.ui.check}
          size="sm"
          alt=""
          className="shrink-0 opacity-90"
        />
      ) : null}
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}
