'use client';

import { X, Download, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document, DOCUMENT_TYPE_LABELS, formatFileSize } from '@/types/documents';
import { ExtractedTextViewer } from './ExtractedTextViewer';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const isPDF = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');
  const hasExtractedText = document.extractedText && document.extractedText.length > 0;

  const handleDownload = () => {
    window.open(document.fileUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {document.fileName}
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span>{DOCUMENT_TYPE_LABELS[document.type]}</span>
              <span>•</span>
              <span>{formatFileSize(document.fileSize)}</span>
              <span>•</span>
              <span>{new Date(document.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(document.fileUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {hasExtractedText ? (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Extracted Text
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                {isPDF && (
                  <iframe
                    src={document.fileUrl}
                    className="w-full h-full min-h-[600px] border rounded"
                    title={document.fileName}
                  />
                )}
                {isImage && (
                  <img
                    src={document.fileUrl}
                    alt={document.fileName}
                    className="max-w-full h-auto mx-auto"
                  />
                )}
                {!isPDF && !isImage && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      Preview not available for this file type
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to view
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <ExtractedTextViewer
                  text={document.extractedText || ''}
                  fileName={document.fileName}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {isPDF && (
                <iframe
                  src={document.fileUrl}
                  className="w-full h-full min-h-[600px] border rounded"
                  title={document.fileName}
                />
              )}
              {isImage && (
                <img
                  src={document.fileUrl}
                  alt={document.fileName}
                  className="max-w-full h-auto mx-auto"
                />
              )}
              {!isPDF && !isImage && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
