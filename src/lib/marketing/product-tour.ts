/**
 * Server-only loaders for the product tour (homepage demo section + /help "Start here"):
 *  - loadProductTour(): public/demo/tour.json. No file, unreadable JSON or no valid slide → null,
 *    and the slide tour renders nothing. Types and validation: ./product-tour-data.ts.
 *  - loadTourVideo(): the self-hosted narrated video. Present only when public/demo/tour.mp4
 *    exists; the captions (tour.vtt) and poster (tour-poster.jpg) are used when they exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseTour, type Tour, type TourVideo } from './product-tour-data';

export * from './product-tour-data';

export const TOUR_JSON_PATH = path.join('public', 'demo', 'tour.json');

export function loadProductTour(cwd: string = process.cwd()): Tour | null {
  try {
    return parseTour(JSON.parse(fs.readFileSync(path.join(cwd, TOUR_JSON_PATH), 'utf8')));
  } catch {
    return null;
  }
}

export function loadTourVideo(cwd: string = process.cwd()): TourVideo | null {
  const has = (f: string) => {
    try {
      return fs.statSync(path.join(cwd, 'public', 'demo', f)).isFile();
    } catch {
      return false;
    }
  };
  if (!has('tour.mp4')) return null;
  return {
    src: '/demo/tour.mp4',
    poster: has('tour-poster.jpg') ? '/demo/tour-poster.jpg' : null,
    captions: has('tour.vtt') ? '/demo/tour.vtt' : null,
  };
}
