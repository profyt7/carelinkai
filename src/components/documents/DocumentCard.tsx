'use client';

import { useState } from 'react';
import { FileText, Download, Eye, Trash2, MoreVertical, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Document,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  formatFileSize,
  getFileIcon,
} from '@/types/documents';

interface DocumentCardProps {
  document: Document;
  onView?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  onRefresh?: () => void;
}

export function DocumentCard({ document, onView, onDelete, onRefresh }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleDownload = () => {
    window.open(document.fileUrl, '_blank');
    toast.success('Download started');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Document deleted successfully');
      if (onDelete) {
        onDelete(document.id);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/extract`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to extract text');
      }

      toast.success('Text extraction completed');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Failed to extract text');
    } finally {
      setIsExtracting(false);
    }
  };

  const getExtractionStatusBadge = () => {
    switch (document.extractionStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Extracted
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-4xl">{getFileIcon(document.mimeType)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type Badge and Extraction Status */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                DOCUMENT_TYPE_COLORS[document.type]
              }`}
            >
              {DOCUMENT_TYPE_LABELS[document.type]}
            </span>
            {getExtractionStatusBadge()}
          </div>

          {/* File Name */}
          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
            {document.fileName}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>•</span>
            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
            {document.uploadedBy && (
              <>
                <span>•</span>
                <span>{document.uploadedBy.firstName} {document.uploadedBy.lastName}</span>
              </>
            )}
          </div>

          {/* Extracted Text Preview */}
          {document.extractedText && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {document.extractedText}
            </p>
          )}

          {/* Tags */}
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView && onView(document)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            {(document.extractionStatus === 'PENDING' || document.extractionStatus === 'FAILED') && (
              <DropdownMenuItem onClick={handleExtract} disabled={isExtracting}>
                <FileText className="mr-2 h-4 w-4" />
                {isExtracting ? 'Extracting...' : 'Extract Text'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
