import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Server-side auth gate for /messages. The page only checks auth client-side
 * (via DashboardLayout's useSession); this adds a server-side redirect so an
 * anonymous request never renders the page (defense-in-depth — messages can
 * contain PHI).
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/messages');
  }
  return <>{children}</>;
}
