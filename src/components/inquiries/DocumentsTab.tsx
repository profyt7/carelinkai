'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { Document } from '@/lib/types/documents';

interface DocumentsTabProps {
  inquiryId: string;
}

export function DocumentsTab({ inquiryId }: DocumentsTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setShowUpload(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <DocumentUpload
            inquiryId={inquiryId}
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Documents List */}
      <DocumentList
        key={refreshKey}
        inquiryId={inquiryId}
        onViewDocument={setViewingDocument}
      />

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
