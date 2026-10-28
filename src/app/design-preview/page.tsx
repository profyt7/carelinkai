import type { Metadata } from 'next';
import DesignPreviewClient from './DesignPreviewClient';
import { buildDirectionDData } from './direction-d/fixtures';

// Internal design spec — never indexed (OL-202). Also disallowed in robots.ts.
export const metadata: Metadata = {
  title: 'Design preview',
  robots: { index: false, follow: false },
};

// Fixture dates are relative to "now" (verified 2 days ago, 14 days ago…), so render per request.
export const dynamic = 'force-dynamic';

export default function DesignPreviewPage() {
  // availabilityView / pricingView are server-side helpers, so the Direction D
  // fixture views are computed here and handed to the client preview as JSON.
  return <DesignPreviewClient directionD={buildDirectionDData()} />;
}
