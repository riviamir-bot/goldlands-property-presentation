import { describe, expect, it } from "vitest";
import { cleanSecret, describeErrorForLog } from "./safety";

describe("safety", () => {
  it("removes line breaks and spaces that sneak into a pasted key", () => {
    expect(cleanSecret("sb_secret_abc\n  def \r\n")).toBe("sb_secret_abcdef");
    expect(cleanSecret(undefined)).toBe("");
  });

  it("never writes key material to the log", () => {
    const error = new TypeError('Headers.append: "sb_secret_abc\ndef" is an invalid header value.');
    const text = describeErrorForLog(error);
    expect(text).not.toContain("abc");
    expect(text).not.toContain("def");
    expect(text).toContain("TypeError");
    expect(describeErrorForLog(new Error("Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig failed"))).not.toContain("eyJ");
    expect(describeErrorForLog("plain")).toBe("unknown error");
  });

  it("keeps ordinary messages readable", () => {
    expect(describeErrorForLog(new Error('column "x" does not exist'))).toBe('Error: column "x" does not exist');
  });
});
