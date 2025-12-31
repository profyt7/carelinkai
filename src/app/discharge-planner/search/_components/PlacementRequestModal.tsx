'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlacementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: {
    homeId: string;
    homeName: string;
    address: string;
    contactEmail?: string;
  };
  searchId: string;
}

export default function PlacementRequestModal({ isOpen, onClose, home, searchId }: PlacementRequestModalProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    medicalNeeds: '',
    timeline: 'immediate',
    paymentType: 'private',
    additionalNotes: '',
  });

  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!e || !e.target) return;
    const { name, value } = e.target;
    if (!name) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields before submission
    if (!formData.patientName || !formData.patientAge || !formData.medicalNeeds) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/discharge-planner/placement-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          homeId: home?.homeId,
          patientInfo: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to send placement request');
      }

      const data = await response.json();
      setSuccess(true);
      toast.success('Placement request sent successfully!');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          patientName: '',
          patientAge: '',
          medicalNeeds: '',
          timeline: 'immediate',
          paymentType: 'private',
          additionalNotes: '',
        });
      }, 2000);
    } catch (err: any) {
      console.error('Placement request error:', err);
      setError(err?.message || 'Failed to send placement request');
      toast.error(err?.message || 'Failed to send request');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Success State */}
                {success ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Sent Successfully!</h3>
                    <p className="text-gray-600">The facility will receive your placement request shortly.</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-2">
                      Send Placement Request
                    </Dialog.Title>
                    <p className="text-gray-600 mb-6">
                      To: <span className="font-semibold">{home?.homeName || 'Unknown Home'}</span>
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Patient Name */}
                      <div>
                        <label htmlFor="patientName" className="block text-sm font-semibold text-gray-700 mb-2">
                          Patient Name *
                        </label>
                        <input
                          type="text"
                          id="patientName"
                          name="patientName"
                          value={formData.patientName}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="John Doe"
                          autoComplete="name"
                        />
                      </div>

                      {/* Patient Age */}
                      <div>
                        <label htmlFor="patientAge" className="block text-sm font-semibold text-gray-700 mb-2">
                          Patient Age *
                        </label>
                        <input
                          type="number"
                          id="patientAge"
                          name="patientAge"
                          value={formData.patientAge}
                          onChange={handleChange}
                          required
                          min="0"
                          max="150"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="78"
                          autoComplete="off"
                        />
                      </div>

                      {/* Medical Needs */}
                      <div>
                        <label htmlFor="medicalNeeds" className="block text-sm font-semibold text-gray-700 mb-2">
                          Medical Needs & Care Requirements *
                        </label>
                        <textarea
                          id="medicalNeeds"
                          name="medicalNeeds"
                          value={formData.medicalNeeds}
                          onChange={handleChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="E.g., Moderate Alzheimer's, requires 24/7 supervision, physical therapy 3x/week..."
                        />
                      </div>

                      {/* Timeline */}
                      <div>
                        <label htmlFor="timeline" className="block text-sm font-semibold text-gray-700 mb-2">
                          Timeline for Placement *
                        </label>
                        <select
                          id="timeline"
                          name="timeline"
                          value={formData.timeline}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="immediate">Immediate (within 1 week)</option>
                          <option value="urgent">Urgent (1-2 weeks)</option>
                          <option value="planned">Planned (2-4 weeks)</option>
                          <option value="flexible">Flexible (1+ months)</option>
                        </select>
                      </div>

                      {/* Payment Type */}
                      <div>
                        <label htmlFor="paymentType" className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Type *
                        </label>
                        <select
                          id="paymentType"
                          name="paymentType"
                          value={formData.paymentType}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="private">Private Pay</option>
                          <option value="medicare">Medicare</option>
                          <option value="medicaid">Medicaid</option>
                          <option value="insurance">Private Insurance</option>
                          <option value="va">VA Benefits</option>
                          <option value="mixed">Mixed/Multiple Sources</option>
                        </select>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label htmlFor="additionalNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          id="additionalNotes"
                          name="additionalNotes"
                          value={formData.additionalNotes}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Any special requirements or preferences..."
                        />
                      </div>

                      {/* Error Display */}
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                          disabled={isSending}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSending}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {isSending ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Send Request</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
