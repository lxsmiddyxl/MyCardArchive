/** @vitest-environment jsdom */
import GlobalError from "@/app/global-error";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/mca-utils/errors/capture-client", () => ({
  captureClientException: vi.fn(),
}));

describe("launch prep phase 3 — global error boundary", () => {
  it("renders fallback with error message", () => {
    render(
      <GlobalError
        error={new Error("Test failure")}
        reset={() => undefined}
      />
    );
    expect(screen.getByText(/Application error/i)).toBeTruthy();
    expect(screen.getByText(/Test failure/i)).toBeTruthy();
  });
});
