"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiSend, FiCalendar, FiMessageSquare } from "react-icons/fi";

interface ApplicationActionsProps {
  applicationId: string;
  onActionComplete?: () => void;
}

export default function ApplicationActions({
  applicationId,
  onActionComplete
}: ApplicationActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<'INVITE' | 'INTERVIEW' | 'OFFER' | 'REJECT'>('INVITE');
  const [message, setMessage] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(null);

    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          message: message.trim() || undefined,
          interviewAt: interviewAt ? new Date(interviewAt).toISOString() : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update application');
      }

      // Success handling
      setAction('INVITE');
      setMessage('');
      setInterviewAt('');
      setSuccess('Application updated successfully');
      
      // Call completion callback if provided
      if (onActionComplete) {
        onActionComplete();
      }
      
      // Refresh the page
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Update Application Status</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="action" className="block text-xs font-medium text-gray-500 mb-1">
            Action
          </label>
          <select
            id="action"
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
            disabled={isSubmitting}
          >
            <option value="INVITE">Invite to Connect</option>
            <option value="INTERVIEW">Schedule Interview</option>
            <option value="OFFER">Make Offer</option>
            <option value="REJECT">Decline Application</option>
          </select>
        </div>
        
        {action === 'INTERVIEW' && (
          <div className="mb-3">
            <label htmlFor="interviewAt" className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
              <FiCalendar className="mr-1 text-gray-400" size={14} />
              Interview Date & Time
            </label>
            <input
              type="datetime-local"
              id="interviewAt"
              value={interviewAt}
              onChange={(e) => setInterviewAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
              disabled={isSubmitting}
            />
          </div>
        )}
        
        <div className="mb-3">
          <label htmlFor="message" className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
            <FiMessageSquare className="mr-1 text-gray-400" size={14} />
            Message (optional)
          </label>
          <textarea
            id="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              action === 'INVITE' ? "Add a personal message to your invitation..." :
              action === 'INTERVIEW' ? "Include any details about the interview..." :
              action === 'OFFER' ? "Describe the offer and any important details..." :
              "Provide a reason for declining (optional)..."
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
            disabled={isSubmitting}
          ></textarea>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="mr-2" size={16} />
            {isSubmitting ? "Processing..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
