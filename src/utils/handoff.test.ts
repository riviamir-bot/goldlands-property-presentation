import { describe, expect, it } from "vitest";
import { readHandoffToken, shareTokenFromPath, whatsappUrl, toWhatsAppNumber } from "./handoff";

describe("handoff", () => {
  it("reads the one-time token from the URL fragment", () => {
    expect(readHandoffToken("#handoff=abc_123-x")).toBe("abc_123-x");
    expect(readHandoffToken("#handoff=")).toBeNull();
    expect(readHandoffToken("#other=1")).toBeNull();
    expect(readHandoffToken("")).toBeNull();
    expect(readHandoffToken("#handoff=bad%20value")).toBeNull();
  });

  it("recognises client summary paths", () => {
    const token = "A".repeat(43);
    expect(shareTokenFromPath(`/s/${token}`)).toBe(token);
    expect(shareTokenFromPath(`/s/${token}/`)).toBe(token);
    expect(shareTokenFromPath("/s/short")).toBeNull();
    expect(shareTokenFromPath("/")).toBeNull();
  });
});

describe("whatsapp", () => {
  it("normalises Israeli numbers to the international format", () => {
    expect(toWhatsAppNumber("050-123-4567")).toBe("972501234567");
    expect(toWhatsAppNumber("+972 50 123 4567")).toBe("972501234567");
    expect(toWhatsAppNumber("972501234567")).toBe("972501234567");
    expect(toWhatsAppNumber("+33 6 12 34 56 78")).toBe("33612345678");
    expect(toWhatsAppNumber("123")).toBeNull();
    expect(toWhatsAppNumber("")).toBeNull();
  });

  it("builds a chat link with or without a number", () => {
    expect(whatsappUrl("0501234567", "שלום")).toBe("https://wa.me/972501234567?text=%D7%A9%D7%9C%D7%95%D7%9D");
    expect(whatsappUrl("", "hi")).toBe("https://wa.me/?text=hi");
  });
});
