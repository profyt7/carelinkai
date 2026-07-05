/**
 * @jest-environment jsdom
 *
 * Render tests for the read-only admin payer-source/fee-lane display (OL-114):
 * tagged records show the friendly label + derived lane; untagged records show
 * an honest "Not captured" (row) or nothing (badge). Display only.
 */

import { render, screen } from '@testing-library/react';
import { PayerLaneBadge, PayerLaneRow } from '@/components/admin/PayerLaneBadge';

describe('PayerLaneBadge', () => {
  it('renders the friendly label for a tagged record', () => {
    render(<PayerLaneBadge payerSource="MEDICAID_WAIVER" />);
    expect(screen.getByText('Medicaid or Medicaid waiver (Assisted Living Waiver)')).toBeTruthy();
  });

  it('renders nothing when untagged or invalid', () => {
    const { container } = render(
      <>
        <PayerLaneBadge payerSource={null} />
        <PayerLaneBadge payerSource={undefined} />
        <PayerLaneBadge payerSource="private" />
      </>,
    );
    expect(container.textContent).toBe('');
  });
});

describe('PayerLaneRow', () => {
  it('shows label + FEE_ELIGIBLE lane for private funds', () => {
    render(<PayerLaneRow payerSource="PRIVATE_FUNDS" />);
    expect(screen.getByText('Private funds / savings')).toBeTruthy();
    expect(screen.getByText(/Fee-eligible/)).toBeTruthy();
  });

  it('shows FREE_LANE for VA benefits', () => {
    render(<PayerLaneRow payerSource="VA_BENEFITS" />);
    expect(screen.getByText(/Free lane .* no placement fee/)).toBeTruthy();
  });

  it('shows "Not captured" + UNKNOWN lane when blank', () => {
    render(<PayerLaneRow payerSource={null} />);
    expect(screen.getByText(/Not captured/)).toBeTruthy();
    expect(screen.getByText(/Unknown/)).toBeTruthy();
  });

  it('shows UNKNOWN lane for "Not sure yet"', () => {
    render(<PayerLaneRow payerSource="NOT_SURE" />);
    expect(screen.getByText(/Not sure yet/)).toBeTruthy();
    expect(screen.getByText(/Unknown/)).toBeTruthy();
  });
});
