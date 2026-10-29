#!/usr/bin/env node
/**
 * Regenerates every favicon / app icon from the CareLinkAI heart mark: the same crop the
 * sidebar icon rail uses (public/images/logo-mark.png), cut at full resolution from the
 * homepage logo public/images/logo.png. The mark itself is never redrawn or recoloured,
 * except the monochrome silhouettes that the formats require (Safari pinned tab, Android
 * notification badge), which keep its exact shape.
 *
 *   node scripts/generate-brand-icons.mjs
 *
 * Writes public/favicon.ico, public/favicon.png and public/icons/* (PNG + SVG).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'public/images/logo.png');
const ICONS = path.join(ROOT, 'public/icons');

// The rail mark's crop of logo.png: the heart, squared with a small transparent margin.
async function heartMark() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const occupied = (x) => { for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 20) return true; return false; };
  let heartEnd = 40;
  while (heartEnd < W && occupied(heartEnd)) heartEnd++; // first empty column after the heart
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < heartEnd; x++) {
    if (data[(y * W + x) * 4 + 3] > 20) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  const side = Math.max(maxX - minX + 1, maxY - minY + 1) + 8;
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const left = Math.max(0, cx - Math.floor(side / 2));
  const top = Math.max(0, cy - Math.floor(side / 2));
  const w = Math.min(side, W - left);
  const h = Math.min(side, H - top);
  return sharp(SRC)
    .extract({ left, top, width: w, height: h })
    .extend({ top: Math.floor((side - h) / 2), bottom: Math.ceil((side - h) / 2), left: Math.floor((side - w) / 2), right: Math.ceil((side - w) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** The mark centred on a size×size canvas, occupying `scale` of it. */
async function onCanvas(mark, size, scale, background) {
  const inner = Math.round(size * scale);
  const m = await sharp(mark).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer();
  const off = Math.floor((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: m, left: off, top: off }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** SVG wrapper around the PNG (no vector source exists; the artwork is not redrawn). */
function svgWrap(png, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>CareLinkAI</title><image width="${size}" height="${size}" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
}

/** ICO container holding PNG entries (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); e.writeUInt8(0, 3); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    offset += buf.length; entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

/** Monochrome silhouette of the mark as SVG rect runs (Safari mask-icon must be single-colour vector). */
async function silhouetteSvg(mark, grid = 96) {
  const { data } = await sharp(mark).resize(grid, grid).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let d = '';
  for (let y = 0; y < grid; y++) {
    let x = 0;
    while (x < grid) {
      if (data[(y * grid + x) * 4 + 3] > 110) {
        const start = x;
        while (x < grid && data[(y * grid + x) * 4 + 3] > 110) x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      } else x++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}"><path d="${d}"/></svg>\n`;
}

async function main() {
  const mark = await heartMark();
  const written = [];
  const write = (rel, buf) => { const p = path.join(ROOT, rel); fs.writeFileSync(p, buf); written.push([rel, buf.length]); };

  // Browser-tab favicons: transparent, the mark nearly edge to edge.
  for (const s of [16, 32, 48]) write(`public/icons/favicon-${s}x${s}.png`, await onCanvas(mark, s, 1, CLEAR));
  const fav32 = await onCanvas(mark, 32, 1, CLEAR);
  write('public/icons/favicon.png', fav32);
  write('public/favicon.png', fav32);
  write('public/icons/favicon.svg', svgWrap(await onCanvas(mark, 64, 1, CLEAR), 32));
  const icoBuf = ico(await Promise.all([16, 32, 48].map(async (s) => ({ size: s, buf: await onCanvas(mark, s, 1, CLEAR) }))));
  write('public/favicon.ico', icoBuf);
  write('public/icons/favicon.ico', icoBuf); // precached by public/sw.js

  // App / PWA icons: opaque white tile, mark at 80%.
  for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
    const png = await onCanvas(mark, s, 0.8, WHITE);
    write(`public/icons/icon-${s}x${s}.png`, png);
    write(`public/icons/icon-${s}x${s}.svg`, svgWrap(png, s));
  }
  // Maskable: the mark inside the 80% safe zone (60% of the tile).
  for (const s of [192, 512]) {
    const png = await onCanvas(mark, s, 0.6, WHITE);
    write(`public/icons/maskable-icon-${s}x${s}.png`, png);
    write(`public/icons/maskable-icon-${s}x${s}.svg`, svgWrap(png, s));
  }
  // Apple touch icons: opaque (iOS fills transparency with black), mark at 80%.
  for (const s of [120, 152, 167, 180]) write(`public/icons/apple-touch-icon-${s}x${s}.png`, await onCanvas(mark, s, 0.8, WHITE));
  const apple180 = await onCanvas(mark, 180, 0.8, WHITE);
  write('public/icons/apple-touch-icon.png', apple180); // linked from src/app/layout.tsx
  write('public/icons/apple-touch-icon.svg', svgWrap(apple180, 180));

  // Monochrome formats: same silhouette.
  write('public/icons/safari-pinned-tab.svg', await silhouetteSvg(mark));
  const sil = await sharp(mark).resize(77, 77).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < sil.data.length; i += 4) { sil.data[i] = sil.data[i + 1] = sil.data[i + 2] = 255; }
  const silPng = await sharp(sil.data, { raw: { width: 77, height: 77, channels: 4 } }).png().toBuffer();
  write('public/icons/badge-96x96.png', await sharp({ create: { width: 96, height: 96, channels: 4, background: CLEAR } }).composite([{ input: silPng, left: 9, top: 9 }]).png({ compressionLevel: 9 }).toBuffer());

  for (const [rel, n] of written) console.log(`${rel.padEnd(42)} ${n} B`);
}

main().catch((e) => { console.error(e); process.exit(1); });
