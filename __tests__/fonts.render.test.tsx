/**
 * @jest-environment jsdom
 *
 * Fonts are served from the repo via next/font/local (OL-146 — no build-time
 * Google fetch). This guards the contract the rest of the styling relies on:
 *
 *  - the two CSS variables keep their names (`--font-inter`, `--font-dm-serif`)
 *    and still resolve on <html> once the font classes are applied, exactly the
 *    way layout.tsx applies them;
 *  - globals.css and tailwind.config.js still build their stacks (and their
 *    unchanged fallbacks) on those two variables;
 *  - every declared woff2 file is committed under src/app/fonts and is a real
 *    WOFF2 file, so the build can never need the network for fonts.
 *
 * `next/font/local` is replaced by a stand-in for the webpack loader: outside
 * `next build` the real export just throws. The stand-in mirrors what the
 * loader emits — a scoped class that sets the requested variable to the font
 * family (plus its metric-adjusted fallback) — so the cascade under test is the
 * one the browser sees.
 */

import fs from 'fs';
import path from 'path';

const FONTS_DIR = path.join(process.cwd(), 'src', 'app', 'fonts');

type LocalFontSrc = { path: string; weight?: string; style?: string };
type LocalFontOptions = {
  src: string | LocalFontSrc[];
  display?: string;
  variable?: string;
  adjustFontFallback?: string | false;
  fallback?: string[];
};

// Every next/font/local call made while the module under test loads.
const calls: LocalFontOptions[] = [];
// CSS the stand-in "loader" would emit (one rule per call).
const emittedCss: string[] = [];

jest.mock('next/font/local', () => ({
  __esModule: true,
  default: (options: LocalFontOptions) => {
    calls.push(options);
    const src = Array.isArray(options.src) ? options.src : [{ path: options.src }];
    // next/font/local names the family after the first file.
    const family = path.basename(src[0]!.path).replace(/\.[^.]+$/, '');
    const className = `__font_${calls.length}`;
    const fontFamily =
      options.adjustFontFallback === false
        ? `'${family}'`
        : `'${family}', '${family} Fallback'`;
    if (options.variable) {
      emittedCss.push(`.${className} { ${options.variable}: ${fontFamily}; }`);
    }
    return { className, variable: options.variable ? className : '', style: { fontFamily } };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fonts = require('@/app/fonts') as typeof import('@/app/fonts');

describe('site fonts (next/font/local)', () => {
  it('declares Inter 300–700 and DM Serif Display 400 with the same CSS variable names as before', () => {
    expect(calls).toHaveLength(2);
    const [inter, dmSerif] = calls as [LocalFontOptions, LocalFontOptions];

    expect(inter.variable).toBe('--font-inter');
    expect(inter.display).toBe('swap');
    expect((inter.src as LocalFontSrc[]).map((s) => s.weight)).toEqual(['300', '400', '500', '600', '700']);
    expect((inter.src as LocalFontSrc[]).every((s) => s.style === 'normal')).toBe(true);

    expect(dmSerif.variable).toBe('--font-dm-serif');
    expect(dmSerif.display).toBe('swap');
    expect((dmSerif.src as LocalFontSrc[]).map((s) => s.weight)).toEqual(['400']);

    // Nothing may still import from Google (comments may mention it; imports may not).
    for (const file of ['src/app/layout.tsx', 'src/app/fonts/index.ts']) {
      expect(fs.readFileSync(path.join(process.cwd(), file), 'utf8')).not.toMatch(/from\s+['"]next\/font\/google['"]/);
    }
  });

  it('commits every declared font file as a real WOFF2 under src/app/fonts', () => {
    const declared = calls.flatMap((c) => (Array.isArray(c.src) ? c.src : [{ path: c.src }])).map((s) => s.path);
    expect(declared.length).toBe(6);
    for (const rel of declared) {
      const abs = path.join(FONTS_DIR, rel);
      expect(fs.existsSync(abs)).toBe(true);
      const head = fs.readFileSync(abs).subarray(0, 4).toString('latin1');
      expect(head).toBe('wOF2'); // WOFF2 signature
      expect(fs.statSync(abs).size).toBeGreaterThan(1000);
    }
    expect(fs.existsSync(path.join(FONTS_DIR, 'LICENSE-Inter.txt'))).toBe(true);
    expect(fs.existsSync(path.join(FONTS_DIR, 'LICENSE-DM-Serif-Display.txt'))).toBe(true);
  });

  it('resolves --font-inter / --font-dm-serif on <html> the way layout.tsx applies them', () => {
    const globals = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    // The real :root font stacks from globals.css (fallbacks unchanged).
    const fontSans = globals.match(/--font-sans:\s*([^;]+);/)?.[1]?.replace(/\s+/g, ' ');
    const fontSerif = globals.match(/--font-serif:\s*([^;]+);/)?.[1]?.replace(/\s+/g, ' ');
    expect(fontSans).toContain("var(--font-inter, 'Inter')");
    expect(fontSerif).toContain("var(--font-dm-serif, 'DM Serif Display')");

    const style = document.createElement('style');
    style.textContent = `${emittedCss.join('\n')}\n:root { --font-sans: ${fontSans}; --font-serif: ${fontSerif}; }`;
    document.head.appendChild(style);

    // layout.tsx: <html className={`${inter.variable} ${dmSerif.variable}`}>
    const html = document.documentElement;
    html.className = `${fonts.inter.variable} ${fonts.dmSerif.variable}`;

    const computed = getComputedStyle(html);
    expect(computed.getPropertyValue('--font-inter')).toMatch(/inter-latin-300-normal/);
    expect(computed.getPropertyValue('--font-inter')).toMatch(/Fallback/);
    expect(computed.getPropertyValue('--font-dm-serif')).toMatch(/dm-serif-display-latin-400-normal/);
    expect(computed.getPropertyValue('--font-sans')).toMatch(/^var\(--font-inter, 'Inter'\)/);
    expect(computed.getPropertyValue('--font-serif')).toMatch(/^var\(--font-dm-serif, 'DM Serif Display'\)/);

    expect({
      variables: { inter: calls[0]!.variable, dmSerif: calls[1]!.variable },
      fontSans,
      fontSerif,
    }).toMatchInlineSnapshot(`
{
  "fontSans": "var(--font-inter, 'Inter'), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  "fontSerif": "var(--font-dm-serif, 'DM Serif Display'), Georgia, Cambria, serif",
  "variables": {
    "dmSerif": "--font-dm-serif",
    "inter": "--font-inter",
  },
}
`);
  });

  it('tailwind font stacks still start from the two variables', () => {
    const tw = fs.readFileSync(path.join(process.cwd(), 'tailwind.config.js'), 'utf8');
    expect(tw).toMatch(/sans:\s*\[\s*"var\(--font-inter\)"/);
    expect(tw).toMatch(/serif:\s*\[\s*"var\(--font-dm-serif\)"/);
  });
});
