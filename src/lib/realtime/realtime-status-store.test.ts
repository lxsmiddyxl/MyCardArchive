import { describe, expect, it } from "vitest";
import {
  getRealtimeBannerPhase,
  reportMuxDisposed,
  reportMuxRetrying,
  subscribeRealtimeBanner,
} from "./realtime-status-store";

describe("realtime-status-store", () => {
  it("subscribe / unsubscribe keeps phase derivable and clears mux flags on dispose", () => {
    const unsub = subscribeRealtimeBanner(() => {});
    expect(typeof unsub).toBe("function");
    reportMuxRetrying("test-mux-key");
    expect(getRealtimeBannerPhase()).toBe("retrying");
    reportMuxDisposed("test-mux-key");
    expect(getRealtimeBannerPhase()).toBe("hidden");
    unsub();
  });
});
