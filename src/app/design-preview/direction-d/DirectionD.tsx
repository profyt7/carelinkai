'use client';

import type { DirectionDData } from './fixtures';
import FacilityProfilePreview from './FacilityProfilePreview';
import FamilyDashboardPreview from './FamilyDashboardPreview';
import FamilySearchPreview from './FamilySearchPreview';
import OperatorDashboardPreview from './OperatorDashboardPreview';
import { PreviewFrame } from './shared';

/**
 * OL-202 — Direction D, "CareLinkAI Signature": B's professional shell, C's
 * family layout, A's ivory as background/hero tint only, built from the real
 * components (AvailabilityBadge, PriceLine/pricingView, GoogleRatingBadge,
 * HomeImagePlaceholder, StatCard, EmptyState) over real data states.
 */
export default function DirectionD({ data }: { data?: DirectionDData }) {
  if (!data) return null;
  return (
    <div className="space-y-12 rounded-2xl border border-neutral-200 bg-white p-6" data-testid="direction-d">
      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        <strong className="font-semibold text-neutral-900">Fixture data.</strong> Every card shows a real data state the rollout must handle, captioned
        underneath. At least half of each grid is the no-photo / no-price case. Availability and price come from the same server helpers the app uses.
      </div>

      <PreviewFrame id="family-search" title="Family — public search (logged out)" description="Top nav only · DM Serif hero · filter chips · result count from the data">
        {(mode) => <FamilySearchPreview mode={mode} cards={data.grid} />}
      </PreviewFrame>

      <PreviewFrame id="family-dashboard" title="Family — logged-in home" description="Light sidebar · ivory page · white cards · care-team help card">
        {(mode) => <FamilyDashboardPreview mode={mode} cards={data.featured} />}
      </PreviewFrame>

      <PreviewFrame
        id="facility-profile"
        title="Facility profile (family view)"
        description="Gallery header · key stats · sticky section nav · one inquiry pathway · sticky CTA bar under 1024px (device-height frames)"
        viewportHeight={{ tablet: 1180, mobile: 660 }}
        viewerToggle
      >
        {(mode, viewer) => <FacilityProfilePreview mode={mode} home={data.profile} viewer={viewer} />}
      </PreviewFrame>

      <PreviewFrame id="operator-dashboard" title="Professional — operator dashboard" description="Navy sidebar · white workspace · needs-attention list · single-hue pipeline">
        {(mode) => <OperatorDashboardPreview mode={mode} />}
      </PreviewFrame>
    </div>
  );
}
