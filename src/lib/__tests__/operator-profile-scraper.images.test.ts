import { extractImageCandidates } from "@/lib/operator-profile-scraper";

const BASE = "https://sunshinevalleycare.example.com/about";

describe("extractImageCandidates", () => {
  it("keeps facility photos and resolves relative URLs to absolute", () => {
    const html = `
      <main>
        <img src="/images/dining-room.jpg" alt="Our dining room" width="800" height="600" />
        <img src="https://cdn.example.com/garden.jpg" alt="Garden courtyard" />
      </main>`;
    const out = extractImageCandidates(html, BASE);
    const urls = out.map((c) => c.url);
    expect(urls).toContain("https://sunshinevalleycare.example.com/images/dining-room.jpg");
    expect(urls).toContain("https://cdn.example.com/garden.jpg");
    expect(out.find((c) => c.url.endsWith("dining-room.jpg"))?.altText).toBe("Our dining room");
  });

  it("drops images in nav/header/footer and logos/icons/social/award", () => {
    const html = `
      <header><img src="/logo.png" alt="Company logo" /></header>
      <nav><img src="/menu-icon.png" alt="menu" /></nav>
      <main>
        <img src="/facebook-badge.png" alt="Find us on Facebook" />
        <img src="/award-2023.png" alt="Best of award" />
        <img src="/real-photo.jpg" alt="Common lounge" />
      </main>
      <footer><img src="/footer-logo.png" alt="logo" /></footer>`;
    const urls = extractImageCandidates(html, BASE).map((c) => c.url);
    expect(urls).toEqual(["https://sunshinevalleycare.example.com/real-photo.jpg"]);
  });

  it("skips images explicitly smaller than 300x200 via attributes", () => {
    const html = `
      <main>
        <img src="/tiny.jpg" alt="thumb" width="120" height="90" />
        <img src="/big.jpg" alt="suite" width="1024" height="768" />
      </main>`;
    const urls = extractImageCandidates(html, BASE).map((c) => c.url);
    expect(urls).toEqual(["https://sunshinevalleycare.example.com/big.jpg"]);
  });

  it("handles lazy-loading via data-src and srcset (largest)", () => {
    const html = `
      <main>
        <img data-src="/lazy-suite.jpg" alt="suite" />
        <img srcset="/small.jpg 320w, /large.jpg 1200w" alt="patio" />
      </main>`;
    const urls = extractImageCandidates(html, BASE).map((c) => c.url);
    expect(urls).toContain("https://sunshinevalleycare.example.com/lazy-suite.jpg");
    expect(urls).toContain("https://sunshinevalleycare.example.com/large.jpg");
    expect(urls).not.toContain("https://sunshinevalleycare.example.com/small.jpg");
  });

  it("filters stock/placeholder/data hosts and data: URIs", () => {
    const html = `
      <main>
        <img src="https://images.unsplash.com/photo-123.jpg" alt="stock" />
        <img src="https://placehold.co/600x400" alt="placeholder" />
        <img src="data:image/png;base64,iVBORw0KGgo=" alt="inline" />
        <img src="/authentic.jpg" alt="bedroom" />
      </main>`;
    const urls = extractImageCandidates(html, BASE).map((c) => c.url);
    expect(urls).toEqual(["https://sunshinevalleycare.example.com/authentic.jpg"]);
  });

  it("de-duplicates and caps at 12 candidates", () => {
    const imgs = Array.from({ length: 20 }, (_, i) => `<img src="/p${i}.jpg" alt="room ${i}" />`).join("");
    const dup = `<img src="/p0.jpg" alt="dup" />`;
    const out = extractImageCandidates(`<main>${imgs}${dup}</main>`, BASE);
    expect(out.length).toBe(12);
    expect(new Set(out.map((c) => c.url)).size).toBe(12);
  });

  it("returns an empty array for JS-only / empty bodies", () => {
    expect(extractImageCandidates("<div id='root'></div>", BASE)).toEqual([]);
  });
});
