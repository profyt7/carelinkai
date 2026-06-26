import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Server-side auth gate for /background-checks. The page itself only checks auth
 * client-side (useSession + router.push); this adds a server-side redirect so an
 * anonymous request never renders the page at all (defense-in-depth).
 */
export default async function BackgroundChecksLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/background-checks');
  }
  return <>{children}</>;
}
