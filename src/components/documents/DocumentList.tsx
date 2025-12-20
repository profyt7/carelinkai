'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import { Document, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/documents';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentListProps {
  residentId?: string;
  inquiryId?: string;
  onViewDocument?: (document: Document) => void;
}

export function DocumentList({
  residentId,
  inquiryId,
  onViewDocument,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (residentId) params.append('residentId', residentId);
      if (inquiryId) params.append('inquiryId', inquiryId);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Fetch documents error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [residentId, inquiryId, filterType]);

  const handleDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by type:</label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents found
          </h3>
          <p className="text-gray-500">
            Upload documents to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onView={onViewDocument}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
