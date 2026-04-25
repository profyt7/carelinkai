'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Kit {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  items: string[];
}

interface Purchase {
  kitType: string;
  status: string;
  downloadUrl: string | null;
  createdAt: string;
}

export default function ComplianceKitsPage() {
  const searchParams = useSearchParams();
  const [kits, setKits] = useState<Kit[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      toast.success('Purchase complete! Your compliance kit will be available shortly.');
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/operator/compliance-kits');
      if (res.ok) {
        const data = await res.json();
        setKits(data.kits ?? []);
        setPurchases(data.purchases ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (kitId: string) => {
    if (buying) return;
    setBuying(kitId);
    try {
      const res = await fetch('/api/operator/compliance-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error('You have already purchased this kit.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Purchase failed');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || 'Failed to start purchase');
      setBuying(null);
    }
  };

  const purchasedKitIds = new Set(
    purchases.filter((p) => p.status === 'COMPLETED').map((p) => p.kitType)
  );

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Compliance Document Kits</h1>
        <p className="text-neutral-500">
          Ready-to-use Ohio assisted living compliance templates reviewed against ODH regulations. One-time purchase — yours forever.
        </p>
      </div>

      <div className="space-y-6">
        {kits.map((kit) => {
          const purchased = purchasedKitIds.has(kit.id);
          const purchase = purchases.find((p) => p.kitType === kit.id && p.status === 'COMPLETED');
          return (
            <div
              key={kit.id}
              className={`rounded-xl border p-6 ${
                purchased ? 'border-success-200 bg-success-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-neutral-900">{kit.name}</h2>
                    {purchased && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                        Purchased
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 mb-4">{kit.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {kit.items.map((item) => (
                      <div key={item} className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <svg className="w-3.5 h-3.5 text-success-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-neutral-900 mb-2">${kit.priceUsd}</div>
                  {purchased ? (
                    purchase?.downloadUrl ? (
                      <a
                        href={purchase.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-4 py-2 border border-success-300 text-success-700 rounded-lg text-sm font-medium hover:bg-success-50"
                      >
                        Download
                      </a>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        Files will be emailed within 24 hours
                      </p>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchase(kit.id)}
                      disabled={buying === kit.id}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {buying === kit.id ? 'Redirecting...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-400 mt-6 text-center">
        Templates are provided as-is for reference. Consult a licensed attorney or Ohio ALF consultant before submitting to ODH.
      </p>
    </div>
  );
}
