/**
 * Server-only loader for the product tour (homepage demo section + /help "Start here"): reads
 * public/demo/tour.json. No file, unreadable JSON or no valid slide → null, and the tour renders
 * nothing. Types and validation: ./product-tour-data.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseTour, type Tour } from './product-tour-data';

export * from './product-tour-data';

export const TOUR_JSON_PATH = path.join('public', 'demo', 'tour.json');

export function loadProductTour(cwd: string = process.cwd()): Tour | null {
  try {
    return parseTour(JSON.parse(fs.readFileSync(path.join(cwd, TOUR_JSON_PATH), 'utf8')));
  } catch {
    return null;
  }
}
