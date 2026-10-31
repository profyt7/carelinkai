import HelpPageClient from './HelpPageClient';
import { loadProductTour, loadTourVideo } from '@/lib/marketing/product-tour';

/** /help (server shell): reads the product tour + video for "Start here"; the page itself is HelpPageClient. */
export default function HelpPage() {
  return <HelpPageClient tour={loadProductTour()} tourVideo={loadTourVideo()} />;
}
