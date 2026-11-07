import { describe, expect, it } from "vitest";
import { EMAIL, PHONE_TEL, WHATSAPP, WHATSAPP_HELLO, contactMethod } from "./site";

describe("contactMethod", () => {
  it("names the way of reaching us", () => {
    expect(contactMethod(WHATSAPP)).toBe("whatsapp");
    expect(contactMethod(WHATSAPP_HELLO)).toBe("whatsapp");
    expect(contactMethod(PHONE_TEL)).toBe("phone");
    expect(contactMethod(`mailto:${EMAIL}?subject=Website enquiry`)).toBe("email");
  });

  it("ignores every other link", () => {
    expect(contactMethod("/#pricing")).toBeNull();
    expect(contactMethod("https://baobabwines.com")).toBeNull();
  });
});
