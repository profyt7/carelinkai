'use client';

import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExtractedTextViewerProps {
  text: string;
  fileName: string;
}

export function ExtractedTextViewer({ text, fileName }: ExtractedTextViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold">Extracted Text</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Text Content */}
      <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
        {text ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {text}
          </pre>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No text extracted yet
          </p>
        )}
      </div>

      {/* Stats */}
      {text && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{text.length} characters</span>
          <span>•</span>
          <span>{text.split(/\s+/).length} words</span>
          <span>•</span>
          <span>{text.split('\n').length} lines</span>
        </div>
      )}
    </div>
  );
}
