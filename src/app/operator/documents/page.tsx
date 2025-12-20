'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { Document } from '@/types/documents';

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setShowUpload(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-2">
            Manage all documents across residents and inquiries
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} size="lg">
          <Upload className="h-5 w-5 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="border rounded-lg p-6 bg-white shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <DocumentList
          key={refreshKey}
          onViewDocument={setViewingDocument}
        />
      </div>

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
