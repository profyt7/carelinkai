import { getOriginFromHeaders, HeaderGetter } from "@/lib/http";

function makeHeaders(map: Record<string, string | undefined>): HeaderGetter {
  return {
    get: (k: string) => (map[k.toLowerCase()] ?? null) as any,
  };
}

describe("getOriginFromHeaders", () => {
  it("prefers x-forwarded-proto and x-forwarded-host", () => {
    const h = makeHeaders({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "example.com",
      host: "ignored.local",
    });
    expect(getOriginFromHeaders(h)).toBe("https://example.com");
  });

  it("falls back to host when x-forwarded-host missing", () => {
    const h = makeHeaders({
      "x-forwarded-proto": "http",
      host: "localhost:3000",
    });
    expect(getOriginFromHeaders(h)).toBe("http://localhost:3000");
  });

  it("returns empty string when no host available", () => {
    const h = makeHeaders({});
    expect(getOriginFromHeaders(h)).toBe("");
  });
});
