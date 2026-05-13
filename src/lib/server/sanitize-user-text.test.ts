import { describe, expect, it } from "vitest";
import { sanitizePlainTextUserInput } from "./sanitize-user-text";

describe("sanitizePlainTextUserInput", () => {
  it("removes simple HTML tags", () => {
    expect(sanitizePlainTextUserInput("hello<b>x</b>world", 100)).toBe("helloxworld");
  });

  it("respects max length after sanitization", () => {
    expect(sanitizePlainTextUserInput("abcdefghij", 4)).toBe("abcd");
  });
});
