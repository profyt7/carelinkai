/**
 * @jest-environment jsdom
 *
 * Homepage ProductTour slot: renders nothing without /public/demo/tour.json (or with no valid
 * slide); with slides it is a carousel driven by buttons, arrow keys and swipe.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import ProductTour from '@/components/marketing/ProductTour';
import { loadProductTour, parseTour } from '@/lib/marketing/product-tour';
import { demoSectionCapabilities } from '@/lib/marketing/demo-section';

const SLIDES = [
  { src: '/demo/01-search.png', caption: 'Search verified communities', alt: 'Search results' },
  { src: '/demo/02-inquiries.png', caption: 'Manage inquiries', alt: 'Inquiry pipeline' },
  { src: '/demo/03-shifts.png', caption: 'Fill shifts', alt: 'Shift board' },
];
const caption = () => screen.getByTestId('product-tour-caption').textContent;

describe('loadProductTour / parseTour', () => {
  it('this repo ships no tour.json → null', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', 'demo', 'tour.json'))).toBe(false);
    expect(loadProductTour()).toBeNull();
  });
  it('reads public/demo/tour.json when present; bad JSON → null', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-'));
    fs.mkdirSync(path.join(dir, 'public', 'demo'), { recursive: true });
    const file = path.join(dir, 'public', 'demo', 'tour.json');
    fs.writeFileSync(file, JSON.stringify({ slides: SLIDES }));
    expect(loadProductTour(dir)).toEqual(SLIDES);
    fs.writeFileSync(file, '{nope');
    expect(loadProductTour(dir)).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('keeps only images under /demo/ with a caption; alt falls back to the caption', () => {
    expect(parseTour({ slides: [{ src: '/demo/a.webp', caption: ' Hi ' }] })).toEqual([{ src: '/demo/a.webp', caption: 'Hi', alt: 'Hi' }]);
    expect(parseTour({ slides: [{ src: 'https://x.test/a.png', caption: 'c' }, { src: '/demo/../x.png', caption: 'c' }, { src: '/demo/a.png', caption: '' }, { src: '/demo/a.svg', caption: 'c' }] })).toBeNull();
    expect(parseTour({})).toBeNull();
    expect(parseTour(null)).toBeNull();
  });
});

describe('ProductTour', () => {
  it('renders nothing without slides', () => {
    expect(render(<ProductTour slides={null} />).container.innerHTML).toBe('');
    expect(render(<ProductTour slides={[]} />).container.innerHTML).toBe('');
  });
  it('buttons and dots move between slides and wrap around', () => {
    render(<ProductTour slides={SLIDES} />);
    expect(caption()).toBe('Search verified communities');
    expect(screen.getByTestId('product-tour-image').getAttribute('src')).toBe('/demo/01-search.png');
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(caption()).toBe('Manage inquiries');
    fireEvent.click(screen.getByLabelText('Previous slide'));
    fireEvent.click(screen.getByLabelText('Previous slide'));
    expect(caption()).toBe('Fill shifts');
    fireEvent.click(screen.getByLabelText('Slide 1 of 3'));
    expect(caption()).toBe('Search verified communities');
  });
  it('arrow keys and swipes', () => {
    render(<ProductTour slides={SLIDES} />);
    const tour = screen.getByTestId('product-tour');
    fireEvent.keyDown(tour, { key: 'ArrowRight' });
    expect(caption()).toBe('Manage inquiries');
    fireEvent.keyDown(tour, { key: 'ArrowLeft' });
    expect(caption()).toBe('Search verified communities');
    fireEvent.touchStart(tour, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(tour, { changedTouches: [{ clientX: 200 }] });
    expect(caption()).toBe('Manage inquiries');
    fireEvent.touchStart(tour, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(tour, { changedTouches: [{ clientX: 300 }] });
    expect(caption()).toBe('Search verified communities');
    // A short drag is not a swipe.
    fireEvent.touchStart(tour, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(tour, { changedTouches: [{ clientX: 190 }] });
    expect(caption()).toBe('Search verified communities');
  });
  it('one slide: no arrows or dots', () => {
    render(<ProductTour slides={SLIDES.slice(0, 1)} />);
    expect(screen.queryByLabelText('Next slide')).toBeNull();
    expect(screen.queryByLabelText('Slide 1 of 1')).toBeNull();
  });
});

describe('demoSectionCapabilities', () => {
  it('follows the residents / marketplace public flags (on unless "false")', () => {
    expect(demoSectionCapabilities({})).toHaveLength(4);
    const off = demoSectionCapabilities({ NEXT_PUBLIC_RESIDENTS_ENABLED: 'false', NEXT_PUBLIC_MARKETPLACE_ENABLED: 'false' });
    expect(off).toEqual(['Operator dashboard: inquiries, shifts', 'Inquiry pipeline with AI-drafted replies', 'Family portal: search, documents, messaging']);
    expect(off.join(' ')).not.toMatch(/billing|analytics/i);
  });
});
