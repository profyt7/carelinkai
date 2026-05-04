"use client";

import Link from "next/link";

interface Props {
  residentName: string;
}

export default function BookTransportButton({ residentName }: Props) {
  return (
    <Link
      href={`/marketplace?tab=providers&serviceType=transportation`}
      className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 transition-colors"
      title={`Find a transport provider for ${residentName}`}
    >
      🚗 Book Transport Ride
    </Link>
  );
}
