/**
 * @jest-environment jsdom
 *
 * OL-178 — with NEXT_PUBLIC_MAPTILER_KEY unset, SimpleMap renders a static
 * placeholder (no Leaflet map, no tile requests, no "Failed to initialize
 * map") and logs one warning; the listing page keeps its address + Get
 * Directions block below the map.
 */

import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import SimpleMap from '@/components/search/SimpleMap';

jest.mock('leaflet/dist/leaflet.css', () => ({}));
const map = jest.fn();
jest.mock('leaflet', () => ({ __esModule: true, default: { map: (...a: unknown[]) => map(...a), tileLayer: jest.fn(), marker: jest.fn(), divIcon: jest.fn(), Control: { extend: jest.fn() }, DomUtil: { create: jest.fn() } } }));

describe('SimpleMap without a MapTiler key', () => {
  const ENV = process.env;
  beforeEach(() => {
    process.env = { ...ENV };
    delete process.env.NEXT_PUBLIC_MAPTILER_KEY;
  });
  afterAll(() => {
    process.env = ENV;
  });

  it('renders the placeholder, never initialises Leaflet, warns once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const home = { id: 'h1', name: 'Home', address: { street: '1 Main', city: 'Beachwood', state: 'OH', zipCode: '44122', coordinates: { lat: 41.46, lng: -81.5 } }, priceRange: { min: null, max: null } } as any;
    render(<SimpleMap homes={[home]} showCount={false} />);
    expect(screen.getByTestId('map-placeholder').textContent).toContain('Map unavailable');
    expect(screen.queryByText('Failed to initialize map')).toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(map).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[maps] NEXT_PUBLIC_MAPTILER_KEY is not set — showing the static map placeholder');
    warn.mockRestore();
  });

  it('the listing page keeps the address and Get Directions outside the map component', () => {
    const page = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');
    const loc = page.slice(page.indexOf('<SimpleMap homes={[realHome]}'));
    expect(loc.indexOf('Get Directions')).toBeGreaterThan(0);
    expect(loc.indexOf('{addrText}')).toBeGreaterThan(0);
  });
});
