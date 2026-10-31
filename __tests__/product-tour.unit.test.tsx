/**
 * @jest-environment jsdom
 *
 * Product tour: public/demo/tour.json → carousel. Loader / validation, chapter chips, Back / Play /
 * Next, arrow keys, swipe, Play timing by each slide's `seconds`, prefers-reduced-motion, alt =
 * caption, sample-data note, and /help chip links.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import ProductTour from '@/components/marketing/ProductTour';
import { CHAPTER_HELP_ANCHOR, loadProductTour, parseTour, tourChapters, tourSeconds, type Tour } from '@/lib/marketing/product-tour';

jest.mock('next/image', () => function Image(p: any) {
  return require('react').createElement('img', { alt: p.alt, src: p.src, width: p.width, height: p.height, className: p.className, 'data-testid': p['data-testid'] });
});

const slide = (n: number, chapter: string, seconds = 5) => ({ image: `/demo/${String(n).padStart(2, '0')}.jpg`, width: 1600, height: 1000, chapter, caption: `Caption ${n}`, alt: `ignored ${n}`, seconds });
const RAW = {
  title: 'See CareLinkAI in action',
  sampleDataNote: 'All names, homes and prices shown are sample data.',
  slides: [slide(1, 'Overview', 3), slide(2, 'For families', 4), slide(3, 'For families'), slide(4, 'For care homes', 6), slide(5, 'Overview', 7)],
};
const TOUR = parseTour(RAW) as Tour;
const caption = () => screen.getByTestId('product-tour-caption').textContent;

let reduced = false;
beforeEach(() => {
  reduced = false;
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') ? reduced : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});

describe('tour.json', () => {
  it('the committed public/demo/tour.json parses: 15 slides, five role chapters, about 90 seconds', () => {
    const t = loadProductTour();
    expect(t).not.toBeNull();
    expect(t!.slides).toHaveLength(15);
    expect(t!.sampleDataNote).toMatch(/sample data/i);
    expect(tourChapters(t!)).toEqual(['For families', 'For discharge planners', 'For care homes', 'For caregivers', 'For providers']);
    expect(tourSeconds(t!)).toBeLessThanOrEqual(90);
    for (const s of t!.slides) expect(fs.existsSync(path.join(process.cwd(), 'public', s.image))).toBe(true);
  });
  it('no file or bad JSON → null', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-'));
    expect(loadProductTour(dir)).toBeNull();
    fs.mkdirSync(path.join(dir, 'public', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public', 'demo', 'tour.json'), '{nope');
    expect(loadProductTour(dir)).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('keeps only valid slides: image under /demo/, width / height, chapter, caption; seconds clamped', () => {
    const bad = [{ ...slide(1, 'x'), image: 'https://x.test/a.jpg' }, { ...slide(2, 'x'), image: '/demo/../a.jpg' }, { ...slide(3, 'x'), width: 0 }, { ...slide(4, 'x'), caption: '' }, { ...slide(5, 'x'), image: '/demo/a.svg' }];
    expect(parseTour({ slides: bad })).toBeNull();
    const t = parseTour({ slides: [{ ...slide(1, 'A'), seconds: 999 }, { ...slide(2, 'A'), seconds: undefined }] })!;
    expect(t.slides.map((s) => s.seconds)).toEqual([30, 5]);
    expect(t.title).toBe('Product tour');
    expect(t.sampleDataNote).toBeNull();
    expect(parseTour(null)).toBeNull();
  });
  it('every role chapter has a /help anchor', () => {
    for (const c of tourChapters(loadProductTour()!)) expect(CHAPTER_HELP_ANCHOR[c]).toBeTruthy();
  });
});

describe('ProductTour', () => {
  it('renders nothing without a tour', () => {
    expect(render(<ProductTour tour={null} />).container.innerHTML).toBe('');
  });
  it('image uses the JSON size and the caption as alt; the sample-data note shows under the slides', () => {
    render(<ProductTour tour={TOUR} />);
    const img = screen.getByTestId('product-tour-image');
    expect(img.getAttribute('src')).toBe('/demo/01.jpg');
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('height')).toBe('1000');
    expect(img.getAttribute('alt')).toBe('Caption 1');
    expect(screen.getByTestId('product-tour-note').textContent).toBe('All names, homes and prices shown are sample data.');
  });
  it('chapter chips (no Overview chip) jump to the chapter and show which one is active', () => {
    render(<ProductTour tour={TOUR} />);
    const chips = Array.from(screen.getByTestId('product-tour-chapters').querySelectorAll('button'), (b) => b.textContent);
    expect(chips).toEqual(['For families', 'For care homes']);
    fireEvent.click(screen.getByRole('button', { name: 'For care homes' }));
    expect(caption()).toBe('Caption 4');
    expect(screen.getByRole('button', { name: 'For care homes' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('Back / Next wrap around; arrow keys and swipes move too', () => {
    render(<ProductTour tour={TOUR} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(caption()).toBe('Caption 2');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(caption()).toBe('Caption 5');
    const tour = screen.getByTestId('product-tour');
    fireEvent.keyDown(tour, { key: 'ArrowRight' });
    expect(caption()).toBe('Caption 1');
    fireEvent.keyDown(tour, { key: 'ArrowLeft' });
    expect(caption()).toBe('Caption 5');
    fireEvent.touchStart(tour, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(tour, { changedTouches: [{ clientX: 200 }] });
    expect(caption()).toBe('Caption 1');
    fireEvent.touchStart(tour, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(tour, { changedTouches: [{ clientX: 190 }] });
    expect(caption()).toBe('Caption 1');
    expect(screen.getByTestId('product-tour-position').textContent).toBe('1 / 5');
  });
  it('autoplay is off; Play advances by each slide’s seconds and stops on the last slide', () => {
    jest.useFakeTimers();
    try {
      render(<ProductTour tour={TOUR} />);
      act(() => { jest.advanceTimersByTime(60_000); });
      expect(caption()).toBe('Caption 1');
      fireEvent.click(screen.getByTestId('product-tour-play'));
      expect(screen.getByTestId('product-tour-play').textContent).toContain('Pause');
      act(() => { jest.advanceTimersByTime(2_999); });
      expect(caption()).toBe('Caption 1');
      act(() => { jest.advanceTimersByTime(1); });
      expect(caption()).toBe('Caption 2');
      act(() => { jest.advanceTimersByTime(4_000); });
      expect(caption()).toBe('Caption 3');
      act(() => { jest.advanceTimersByTime(5_000); });
      expect(caption()).toBe('Caption 4');
      act(() => { jest.advanceTimersByTime(6_000); });
      expect(caption()).toBe('Caption 5');
      act(() => { jest.advanceTimersByTime(60_000); });
      expect(caption()).toBe('Caption 5');
      expect(screen.getByTestId('product-tour-play').textContent).toContain('Play');
      fireEvent.click(screen.getByTestId('product-tour-play'));
      expect(caption()).toBe('Caption 1');
      fireEvent.click(screen.getByTestId('product-tour-play'));
      act(() => { jest.advanceTimersByTime(60_000); });
      expect(caption()).toBe('Caption 1');
    } finally {
      jest.useRealTimers();
    }
  });
  it('prefers-reduced-motion: no slide animation', () => {
    reduced = true;
    render(<ProductTour tour={TOUR} />);
    expect(screen.getByTestId('product-tour').getAttribute('data-reduced-motion')).toBe('true');
    expect(screen.getByTestId('product-tour-image').className).not.toMatch(/animate/);
  });
  it('without reduced motion the slide fades in (motion-safe)', () => {
    render(<ProductTour tour={TOUR} />);
    expect(screen.getByTestId('product-tour-image').className).toContain('motion-safe:animate-fade-in');
  });
  it('/help: chips are links to the role sections', () => {
    render(<ProductTour tour={TOUR} chapterHref={(c) => (CHAPTER_HELP_ANCHOR[c] ? `#${CHAPTER_HELP_ANCHOR[c]}` : undefined)} />);
    expect(screen.getByRole('link', { name: 'For families' }).getAttribute('href')).toBe('#help-family');
    expect(screen.getByRole('link', { name: 'For care homes' }).getAttribute('href')).toBe('#help-operator');
  });
});
