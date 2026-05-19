// Redirect legacy /operator/acceptance → /legal/acceptance (canonical gate page for all roles)
import { redirect } from 'next/navigation';

export default function OperatorAcceptanceLegacyRedirect() {
  redirect('/legal/acceptance');
}
