"use client";
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SimpleModal } from '@/components/ui/SimpleModal';
import { FiCheck, FiX, FiArrowRight, FiAlertCircle } from 'react-icons/fi';

export function StatusActions({ residentId, status }: { residentId: string; status: string }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'admit' | 'discharge' | 'deceased' | null>(null);

  // Transfer dialog state
  const [showTransfer, setShowTransfer] = useState(false);
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [loadingHomes, setLoadingHomes] = useState(false);

  // Fetch operator's homes for transfer
  useEffect(() => {
    if (showTransfer) {
      fetchHomes();
    }
  }, [showTransfer]);

  async function fetchHomes() {
    setLoadingHomes(true);
    try {
      const res = await fetch('/api/operator/homes');
      if (res.ok) {
        const data = await res.json();
        setHomes(data.homes || []);
      } else {
        toast.error('Failed to load homes');
      }
    } catch (e) {
      toast.error('Error loading homes');
    } finally {
      setLoadingHomes(false);
    }
  }

  async function doAdmit() {
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionDate: date }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to admit');
      toast.error(j.error || 'Failed to admit');
      return;
    }
    toast.success('Resident admitted successfully');
    setShowConfirm(false);
    startTransition(() => router.refresh());
  }

  async function doDischarge(type: 'DISCHARGED' | 'DECEASED') {
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dischargeDate: date, status: type }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to discharge');
      toast.error(j.error || 'Failed to discharge');
      return;
    }
    toast.success(type === 'DECEASED' ? 'Resident marked as deceased' : 'Resident discharged successfully');
    setShowConfirm(false);
    startTransition(() => router.refresh());
  }

  async function doTransfer() {
    if (!selectedHomeId) {
      toast.error('Please select a home');
      return;
    }
    
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeId: selectedHomeId, effectiveDate: new Date(date).toISOString() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to transfer');
      toast.error(j.error || 'Failed to transfer');
      return;
    }
    toast.success('Resident transferred successfully');
    setShowTransfer(false);
    setSelectedHomeId('');
    startTransition(() => router.refresh());
  }

  function handleActionClick(action: 'admit' | 'discharge' | 'deceased') {
    setConfirmAction(action);
    setShowConfirm(true);
  }

  function handleConfirm() {
    if (confirmAction === 'admit') {
      doAdmit();
    } else if (confirmAction === 'discharge') {
      doDischarge('DISCHARGED');
    } else if (confirmAction === 'deceased') {
      doDischarge('DECEASED');
    }
  }

  const getConfirmMessage = () => {
    if (confirmAction === 'admit') {
      return `Are you sure you want to admit this resident on ${new Date(date).toLocaleDateString()}?`;
    } else if (confirmAction === 'discharge') {
      return `Are you sure you want to discharge this resident on ${new Date(date).toLocaleDateString()}?`;
    } else if (confirmAction === 'deceased') {
      return `Are you sure you want to mark this resident as deceased? This action cannot be undone.`;
    }
    return '';
  };

  const getConfirmTitle = () => {
    if (confirmAction === 'admit') return 'Confirm Admission';
    if (confirmAction === 'discharge') return 'Confirm Discharge';
    if (confirmAction === 'deceased') return 'Confirm Deceased Status';
    return 'Confirm Action';
  };

  return (
    <>
      <div className="mt-4 p-4 border border-neutral-200 rounded-lg bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="date" className="text-sm font-medium text-neutral-700 whitespace-nowrap">
              Effective Date:
            </label>
            <input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {status !== 'ACTIVE' && (
              <button 
                disabled={loading} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => handleActionClick('admit')}
              >
                <FiCheck size={16} />
                Admit
              </button>
            )}
            
            {status === 'ACTIVE' && (
              <>
                <button 
                  disabled={loading} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setShowTransfer(true)}
                >
                  <FiArrowRight size={16} />
                  Transfer
                </button>
                <button 
                  disabled={loading} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => handleActionClick('discharge')}
                >
                  <FiX size={16} />
                  Discharge
                </button>
                <button 
                  disabled={loading} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => handleActionClick('deceased')}
                >
                  <FiAlertCircle size={16} />
                  Mark Deceased
                </button>
              </>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <SimpleModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={getConfirmTitle()}
      >
        <div className="space-y-4">
          <p className="text-neutral-700">{getConfirmMessage()}</p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmAction === 'deceased' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : confirmAction === 'discharge'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </SimpleModal>

      {/* Transfer Dialog */}
      <SimpleModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Transfer Resident to Another Home"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Select the home you would like to transfer this resident to:
          </p>
          
          {loadingHomes ? (
            <div className="text-center py-4">
              <p className="text-sm text-neutral-500">Loading homes...</p>
            </div>
          ) : homes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-neutral-500">No homes available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {homes.map((home) => (
                <label
                  key={home.id}
                  className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedHomeId === home.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="transferHome"
                    value={home.id}
                    checked={selectedHomeId === home.id}
                    onChange={(e) => setSelectedHomeId(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">{home.name}</p>
                    {home.city && home.state && (
                      <p className="text-sm text-neutral-600">
                        {home.city}, {home.state}
                      </p>
                    )}
                    {home.currentOccupancy !== undefined && home.capacity !== undefined && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Occupancy: {home.currentOccupancy} / {home.capacity}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowTransfer(false);
                setSelectedHomeId('');
              }}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={doTransfer}
              disabled={loading || !selectedHomeId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </div>
      </SimpleModal>
    </>
  );
}
