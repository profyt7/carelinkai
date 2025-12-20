'use client';

import { useState } from 'react';
import { X, Wand2, Send } from 'lucide-react';
import { generateResponse } from '@/hooks/useInquiries';
import { toast } from 'react-hot-toast';

interface AIResponseGeneratorProps {
  inquiryId: string;
  onClose: () => void;
}

type ResponseType = 'INITIAL' | 'URGENT' | 'FOLLOW_UP' | 'TOUR_CONFIRMATION' | 'ADDITIONAL_INFO';

export function AIResponseGenerator({ inquiryId, onClose }: AIResponseGeneratorProps) {
  const [responseType, setResponseType] = useState<ResponseType>('INITIAL');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<'select' | 'preview'>('select');

  const responseTypes: { value: ResponseType; label: string; description: string }[] = [
    {
      value: 'INITIAL',
      label: 'Initial Response',
      description: 'First contact with the family',
    },
    {
      value: 'URGENT',
      label: 'Urgent Response',
      description: 'Quick response for urgent inquiries',
    },
    {
      value: 'FOLLOW_UP',
      label: 'Follow-up',
      description: 'Check in after initial contact',
    },
    {
      value: 'TOUR_CONFIRMATION',
      label: 'Tour Confirmation',
      description: 'Confirm tour scheduling details',
    },
    {
      value: 'ADDITIONAL_INFO',
      label: 'Additional Information',
      description: 'Provide more details about services',
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateResponse(inquiryId, {
        responseType,
        sendEmail: false,
        customInstructions: customInstructions || undefined,
      });
      // Fix: Access nested response.response.content from API response
      setGeneratedResponse(response.response.content);
      setStep('preview');
      toast.success('Response generated successfully');
    } catch (error: any) {
      console.error('Error generating response:', error);
      toast.error(error.message || 'Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await generateResponse(inquiryId, {
        responseType,
        sendEmail: true,
        customInstructions: generatedResponse, // Use the edited response
      });
      toast.success('Response sent successfully');
      onClose();
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast.error(error.message || 'Failed to send response');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Response Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' ? (
            <div className="space-y-6">
              {/* Response Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Response Type
                </label>
                <div className="space-y-2">
                  {responseTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        responseType === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="responseType"
                        value={type.value}
                        checked={responseType === type.value}
                        onChange={(e) => setResponseType(e.target.value as ResponseType)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{type.label}</p>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  placeholder="Add any specific instructions for the AI to include in the response..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Response'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Response
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Review and edit the response before sending
                </p>
                <textarea
                  value={generatedResponse}
                  onChange={(e) => setGeneratedResponse(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSending}
                >
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
