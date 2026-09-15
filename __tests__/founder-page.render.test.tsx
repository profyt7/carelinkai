/**
 * @jest-environment jsdom
 *
 * Render test for the self-hosted founder intro page (/founder). Guards the
 * HeyGen removal: the page must play the local MP4 with a poster, carry the
 * "40-second" wording (video is 39s), be noindex, and stay form-free.
 */

import { render, screen } from '@testing-library/react';
import FounderPage, { metadata } from '@/app/founder/page';

describe('/founder page', () => {
  it('renders the self-hosted <video> with the local MP4 + poster', () => {
    const { container } = render(<FounderPage />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('/founder-intro.mp4');
    expect(video?.getAttribute('poster')).toBe('/founder-intro-poster.jpg');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.getAttribute('preload')).toBe('metadata');
    expect(container.innerHTML).not.toMatch(/heygen/i);
  });

  it('shows the brand wordmark, the 40-second H1, and the placements contact line', () => {
    render(<FounderPage />);
    expect(screen.getByText('CareLinkAI')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('A 40-second intro from our founder');
    expect(screen.getByRole('link', { name: 'placements@getcarelinkai.com' }).getAttribute('href')).toBe(
      'mailto:placements@getcarelinkai.com'
    );
  });

  it('has no forms and is noindex (link-only page for planners)', () => {
    const { container } = render(<FounderPage />);
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe('A 40-second intro from our founder');
  });
});
