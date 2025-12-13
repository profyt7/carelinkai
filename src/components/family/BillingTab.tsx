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
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 font-semibold text-sm uppercase tracking-wide mb-2">
              Wallet Balance
            </p>
            <p className="text-5xl font-bold text-white mb-1">
              {walletBalance !== null ? (
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(Number(walletBalance))
              ) : (
                <span className="animate-pulse text-blue-200">$—.—</span>
              )}
            </p>
            <p className="text-blue-100 text-sm">Available funds</p>
          </div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
            <FiDollarSign className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <FiDollarSign className="w-4 h-4 text-white" />
          </div>
          Add Funds
        </h3>

        {/* Deposit Form */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="amount"
                className="block text-sm font-semibold text-gray-700 mb-2"
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
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <button
              disabled={depositAmount <= 0 || isGuest}
              onClick={createDeposit}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transform hover:scale-105 disabled:hover:scale-100"
            >
              💳 Deposit Funds
            </button>
          </div>
          
          {/* Amount presets */}
          <div className="flex flex-wrap gap-3">
            {[25, 50, 100, 250, 500].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setDepositAmount(amount)}
                className={`px-5 py-2.5 text-sm rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  depositAmount === amount 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg border-2 border-blue-600' 
                    : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
        <h4 className="mb-5 text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
            <FiDollarSign className="w-4 h-4 text-white" />
          </div>
          Recent Wallet Transactions
        </h4>
        {transactions.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-10 text-center border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-md group">
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                    tx.type === 'DEPOSIT' 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                      : 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white'
                  }`}>
                    {tx.type === 'DEPOSIT' ? '↓' : '↑'} {tx.type}
                  </span>
                  <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }).format(new Date(tx.createdAt))}
                  </span>
                </div>
                <span className={`text-base font-bold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.type === 'DEPOSIT' ? '+' : '−'}
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
        <h4 className="mb-5 text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
            <FiDownload className="w-4 h-4 text-white" />
          </div>
          Recent Payments
        </h4>
        {payments.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-10 text-center border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">No payments yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl hover:from-orange-50 hover:to-red-50 transition-all duration-200 border border-gray-200 hover:border-orange-300 hover:shadow-md group">
                <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }).format(new Date(p.createdAt))}
                </span>
                <span className="text-base font-bold text-gray-900">
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
