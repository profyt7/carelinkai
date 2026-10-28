export function shimmerSVG(w: number, h: number) {
  return `
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#f3f4f6" offset="20%"/>
        <stop stop-color="#e5e7eb" offset="50%"/>
        <stop stop-color="#f3f4f6" offset="70%"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#f3f4f6"/>
    <rect id="r" width="${w}" height="${h}" fill="url(#g)"/>
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite"  />
  </svg>`;
}

export function toBase64(str: string) {
  if (typeof window === 'undefined') {
    // Node.js
    return Buffer.from(str).toString('base64');
  }
  // Browser
  // btoa expects binary string
  return window.btoa(unescape(encodeURIComponent(str)));
}

export function getBlurDataURL(w: number, h: number) {
  return `data:image/svg+xml;base64,${toBase64(shimmerSVG(w, h))}`;
}
