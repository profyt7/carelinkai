import { ImageResponse } from 'next/og';
import { OG_LOGO_DATA_URL, OG_LOGO_SIZE } from '@/lib/seo/og-logo';

/**
 * OL-172 (b) — branded Open Graph / Twitter card images, one design per page
 * type: hub, care type, suburb, concierge. Brand gradient #3978FC → #7253B7,
 * the homepage logo on a white card, the page's own headline. Rendered by each
 * route's opengraph-image.tsx / twitter-image.tsx; no filesystem reads.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

export type OgKind = 'hub' | 'care-type' | 'suburb' | 'concierge';

const KIND_LABEL: Record<OgKind, string> = {
  hub: 'Greater Cleveland senior care directory',
  'care-type': 'Cleveland senior care by type',
  suburb: 'Assisted living by suburb',
  concierge: 'Family Concierge',
};

export function renderOgImage({ kind, title, subtitle }: { kind: OgKind; title: string; subtitle: string }): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #3978FC 0%, #7253B7 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: 20, padding: '18px 26px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
            <img src={OG_LOGO_DATA_URL} width={OG_LOGO_SIZE.width * 0.7} height={OG_LOGO_SIZE.height * 0.7} alt="" />
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, opacity: 0.92 }}>{KIND_LABEL[kind]}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: title.length > 34 ? 64 : 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 32, lineHeight: 1.3, opacity: 0.95 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, opacity: 0.9 }}>getcarelinkai.com · Licensed homes · Ohio inspection facts · Free for families</div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
