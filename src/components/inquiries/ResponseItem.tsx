'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Phone, Send, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';

interface ResponseItemProps {
  response: any;
  onUpdate: () => void;
}

export function ResponseItem({ response, onUpdate }: ResponseItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isDraft = response.status === 'DRAFT';

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-5 h-5" />;
      case 'SMS':
        return <MessageSquare className="w-5 h-5" />;
      case 'PHONE':
        return <Phone className="w-5 h-5" />;
      default:
        return <Send className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
      case 'BOUNCED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inquiries/responses/${response.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete draft');
      }

      toast.success('Draft deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete draft');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/inquiries/responses/${response.id}/send`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send response');
      }

      toast.success('Response sent successfully');
      onUpdate();
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send response');
    } finally {
      setIsSending(false);
      setShowSendDialog(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-blue-600">
              {getChannelIcon(response.channel)}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {response.subject || `${response.channel} ${response.type}`}
              </h4>
              <p className="text-sm text-gray-600">
                {response.sentAt
                  ? format(new Date(response.sentAt), 'MMM d, yyyy h:mm a')
                  : 'Not sent yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(response.status)}`}>
              {response.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {response.content}
          </p>
        </div>

        {/* Metadata and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Type: {response.type}</span>
            <span>Channel: {response.channel}</span>
            {response.toAddress && <span>To: {response.toAddress}</span>}
          </div>

          {/* Draft Actions */}
          {isDraft && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSendDialog(true)}
                disabled={isSending}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Draft?"
        description="Are you sure you want to delete this draft response? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        title="Send Response?"
        description={`Are you sure you want to send this ${response.channel.toLowerCase()} response to ${response.toAddress}?`}
        confirmText={isSending ? 'Sending...' : 'Send'}
        cancelText="Cancel"
        onConfirm={handleSend}
        variant="default"
        isLoading={isSending}
      />
    </>
  );
}
