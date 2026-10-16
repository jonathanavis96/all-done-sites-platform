import { afterEach, describe, expect, it, vi } from "vitest";
import { countryFromTrace, detectRegionFromIp, regionForCountry, regionFromBrowser } from "./pricing";

describe("regionForCountry", () => {
  it("prices the rand zone in rand and the rest of Africa in USD", () => {
    expect(regionForCountry("ZA")).toBe("ZA");
    expect(regionForCountry("NA")).toBe("ZA");
    expect(regionForCountry("NG")).toBe("OTHER");
    expect(regionForCountry("KE")).toBe("OTHER");
  });

  it("maps the UK, US and euro countries", () => {
    expect(regionForCountry("GB")).toBe("UK");
    expect(regionForCountry("US")).toBe("US");
    expect(regionForCountry("de")).toBe("EU");
    expect(regionForCountry("IE")).toBe("EU");
    expect(regionForCountry("AU")).toBe("OTHER");
  });

  it("returns null for unknown, Tor and malformed codes", () => {
    expect(regionForCountry("XX")).toBeNull();
    expect(regionForCountry("T1")).toBeNull();
    expect(regionForCountry("")).toBeNull();
    expect(regionForCountry(null)).toBeNull();
    expect(regionForCountry("ZAF")).toBeNull();
  });
});

describe("countryFromTrace", () => {
  it("reads the loc line", () => {
    expect(countryFromTrace("fl=1\nh=alldonesites.com\nip=1.2.3.4\nloc=NG\ntls=TLSv1.3\n")).toBe("NG");
  });

  it("does not match a loc= inside another field", () => {
    expect(countryFromTrace("uag=x?loc=ZA\nfl=1\n")).toBeNull();
  });
});

describe("regionFromBrowser", () => {
  it("no longer puts every African timezone on rand pricing", () => {
    expect(regionFromBrowser("Africa/Johannesburg", "en-US")).toBe("ZA");
    expect(regionFromBrowser("Africa/Lagos", "en-NG")).toBe("OTHER");
    expect(regionFromBrowser("Africa/Nairobi", "en-ZA")).toBe("OTHER");
  });

  it("keeps the existing timezone and language rules", () => {
    expect(regionFromBrowser("Europe/London", "en-GB")).toBe("UK");
    expect(regionFromBrowser("Europe/Berlin", "de-DE")).toBe("EU");
    expect(regionFromBrowser("America/New_York", "en-US")).toBe("US");
    expect(regionFromBrowser("", "en-ZA")).toBe("ZA");
    expect(regionFromBrowser("Asia/Tokyo", "ja-JP")).toBe("OTHER");
  });
});

describe("detectRegionFromIp", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the Cloudflare trace country", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ip=1.2.3.4\nloc=NG\n")));
    expect(await detectRegionFromIp()).toBe("OTHER");
  });

  it("resolves null when the trace endpoint is missing or fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await detectRegionFromIp()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await detectRegionFromIp()).toBeNull();
  });
});
