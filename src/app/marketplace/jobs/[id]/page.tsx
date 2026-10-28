import { redirect } from "next/navigation";

/**
 * Redirect from /marketplace/jobs/[id] to /marketplace/listings/[id]
 * 
 * Jobs are stored as "listings" in the database, so the detail page
 * is at /marketplace/listings/[id]. This redirect ensures backward
 * compatibility and handles any stale links.
 */
export default function JobDetailRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/marketplace/listings/${params.id}`);
}
