"use client";

import { BinderPresenceBar } from "@/mca-ui/binder/BinderPresenceBar";

export function BinderOwnerPresence({ binderId }: { binderId: string }) {
  return <BinderPresenceBar binderId={binderId} mode="editing" enabled />;
}
