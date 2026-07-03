/**
 * @jest-environment jsdom
 *
 * Render tests for the State Inspection History listing-page section (OL-113):
 * with records, the honest empty state (with/without a data snapshot), and the
 * FTC guardrail — no grading language ever appears.
 */

import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import InspectionHistory from '@/components/homes/InspectionHistory';

const withRecords = {
  success: true,
  data: {
    odhLicenseNumber: '2318R',
    records: [
      {
        id: 'insp-1',
        surveyDate: '2026-03-14',
        surveyType: 'Standard',
        citationCount: 2,
        citations: [{ rule: '3701-16-09', scopeSeverity: null, summary: 'Medication storage finding' }],
        sourceUrl: 'https://aging.ohio.gov/x',
      },
      {
        id: 'insp-2',
        surveyDate: '2025-09-02',
        surveyType: 'Complaint',
        citationCount: 0,
        citations: [],
        sourceUrl: null,
      },
    ],
    dataAsOf: '2026-07-01T00:00:00.000Z',
  },
};

const empty = (dataAsOf: string | null) => ({
  success: true,
  data: { odhLicenseNumber: null, records: [], dataAsOf },
});

function mockFetch(payload: unknown) {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe('InspectionHistory', () => {
  it('renders survey dates, types, citation counts, and the state source link', async () => {
    mockFetch(withRecords);
    render(<InspectionHistory homeId="home-1" />);

    expect(await screen.findByText('March 14, 2026')).toBeTruthy();
    expect(screen.getByText(/Standard survey\s*·\s*2 citations/)).toBeTruthy();
    expect(screen.getByText('September 2, 2025')).toBeTruthy();
    expect(screen.getByText(/Complaint survey\s*·\s*No citations in this survey/)).toBeTruthy();

    const sourceLink = screen.getByRole('link', { name: /view state record/i });
    expect(sourceLink.getAttribute('href')).toBe('https://aging.ohio.gov/x');

    // Disclaimer with the data-as-of date is always present.
    expect(screen.getByText(/Ohio Department of Health public records/)).toBeTruthy();
    expect(screen.getByText(/as of July 1, 2026/)).toBeTruthy();
  });

  it('renders the honest empty state with the ODH data-as-of date', async () => {
    mockFetch(empty('2026-07-01T00:00:00.000Z'));
    render(<InspectionHistory homeId="home-1" />);

    expect(
      await screen.findByText(
        /No inspection records were found for this facility in Ohio Department of Health data as of July 1, 2026/,
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ohio Long-Term Care Quality Navigator/i })).toBeTruthy();
  });

  it('says records are not loaded yet (never implies a clean record) before first ingestion', async () => {
    mockFetch(empty(null));
    render(<InspectionHistory homeId="home-1" />);

    expect(
      await screen.findByText(/State inspection records haven't been loaded for this facility yet/),
    ).toBeTruthy();
  });

  it('never renders grading or endorsement language (FTC guardrail)', async () => {
    mockFetch(withRecords);
    const { container } = render(<InspectionHistory homeId="home-1" />);
    await screen.findByText('March 14, 2026');

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/grade|rating|score|CareLinkAI verified|approved|recommended/i);
  });

  it('renders nothing when the fetch fails (no alarming error in a trust section)', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    const { container } = render(<InspectionHistory homeId="home-1" />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });
});
