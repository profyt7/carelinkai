'use client';

import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiDownload } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

// Load DepositModal dynamically so Stripe is only imported when needed
const DepositModal = dynamic(
  () => import('@/components/billing/DepositModal'),
  { ssr: false },
);

interface BillingTabProps {
  familyId: string | null;
  showMock?: boolean;
  isGuest?: boolean;
}

export default function BillingTab({ familyId, showMock = false, isGuest = false }: BillingTabProps) {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Check if Stripe is configured
  const isStripeConfigured =
    typeof process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] === 'string' &&
    process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'].length > 0;

  const loadBilling = async () => {
    try {
      setLoading(true);
      if (showMock) {
        setWalletBalance(125.0);
        setTransactions([
          { id: 'tx-1', type: 'DEPOSIT', amount: 100, currency: 'USD', createdAt: new Date(Date.now() - 3*86400000).toISOString() },
          { id: 'tx-2', type: 'PAYMENT', amount: 75, currency: 'USD', createdAt: new Date(Date.now() - 2*86400000).toISOString() },
          { id: 'tx-3', type: 'DEPOSIT', amount: 100, currency: 'USD', createdAt: new Date(Date.now() - 1*86400000).toISOString() },
        ]);
        setPayments([
          { id: 'p-1', amount: 75, createdAt: new Date(Date.now() - 2*86400000).toISOString() },
          { id: 'p-2', amount: 49, createdAt: new Date(Date.now() - 10*86400000).toISOString() },
        ]);
        return;
      }
      
      if (!familyId) return;
      
      const [walletRes, payRes] = await Promise.all([
        fetch(`/api/billing/wallet?familyId=${familyId}`),
        fetch(`/api/billing/payments?familyId=${familyId}`),
      ]);
      if (walletRes.ok) {
        const json = await walletRes.json();
        setWalletBalance(Number(json.wallet?.balance ?? 0));
        setTransactions(json.transactions ?? []);
      }
      if (payRes.ok) {
        const json = await payRes.json();
        setPayments(json.payments ?? []);
      }
    } catch {
      /* ignore for now */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [familyId, showMock]);

  const createDeposit = async () => {
    if (depositAmount <= 0) return;
    try {
      const res = await fetch('/api/billing/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(depositAmount * 100),
          familyId: familyId,
        }),
      });
      if (!res.ok) throw new Error('Failed to initiate deposit');
      const json = await res.json();
      setClientSecret(json.clientSecret ?? null);
      setDepositOpen(true);
    } catch (err) {
      console.error(err);
      alert('Unable to create deposit. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <LoadingState type="list" count={3} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Wallet Balance */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
            <FiDollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Wallet Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {walletBalance !== null ? (
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(Number(walletBalance))
              ) : (
                <span className="animate-pulse text-gray-400">$—.—</span>
              )}
            </p>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Deposit Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                min={1}
                step={1}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              disabled={depositAmount <= 0 || isGuest}
              onClick={createDeposit}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Deposit Funds
            </button>
          </div>
          
          {/* Amount presets */}
          <div className="flex flex-wrap gap-2">
            {[25, 50, 100].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setDepositAmount(amount)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  depositAmount === amount 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
          
          {/* Stripe configuration notice */}
          {!isStripeConfigured && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
              🚧 Test mode - no real charges will be made.
            </div>
          )}
          
          {isGuest && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 border border-gray-200">
              🚫 Guests cannot make deposits. Please contact a family administrator.
            </div>
          )}
        </div>
      </div>

      {/* Wallet Transactions */}
      <div className="mb-8">
        <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          Recent Wallet Transactions
        </h4>
        {transactions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    tx.type === 'DEPOSIT' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tx.type}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Intl.DateTimeFormat('en-US').format(new Date(tx.createdAt))}
                  </span>
                </div>
                <span className={`text-sm font-medium ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.type === 'DEPOSIT' ? '+' : ''}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: tx.currency || 'USD',
                  }).format(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h4 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          Recent Payments
        </h4>
        {payments.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No payments yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <span className="text-sm text-gray-600">
                  {new Intl.DateTimeFormat('en-US').format(new Date(p.createdAt))}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(Number(p.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        clientSecret={clientSecret}
        amountCents={Math.round(depositAmount * 100)}
        onSuccess={() => {
          setDepositOpen(false);
          setClientSecret(null);
          setDepositAmount(0);
          loadBilling();
        }}
      />
    </div>
  );
}
