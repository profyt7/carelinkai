"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SimpleModal } from '@/components/ui/SimpleModal';
import { FiArchive } from 'react-icons/fi';

interface ArchiveButtonProps {
  residentId: string;
  residentName: string;
}

export function ArchiveButton({ residentId, residentName }: ArchiveButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, startTransition] = useTransition();
  const router = useRouter();

  async function handleArchive() {
    try {
      const res = await fetch(`/api/residents/${residentId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to archive resident');
        return;
      }

      toast.success('Resident archived successfully');
      setShowConfirm(false);
      
      // Redirect to residents list after archiving
      startTransition(() => {
        router.push('/operator/residents');
        router.refresh();
      });
    } catch (e) {
      console.error('Archive error:', e);
      toast.error('An error occurred while archiving the resident');
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
      >
        <FiArchive size={16} />
        Archive
      </button>

      <SimpleModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Archive Resident"
      >
        <div className="space-y-4">
          <p className="text-neutral-700">
            Are you sure you want to archive <span className="font-semibold">{residentName}</span>?
          </p>
          <p className="text-sm text-neutral-600">
            This will remove the resident from the active list. You can view archived residents by using the "Show Archived" filter on the residents list page.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleArchive}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        </div>
      </SimpleModal>
    </>
  );
}
