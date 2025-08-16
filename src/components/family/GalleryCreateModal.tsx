import React, { useState, useEffect } from 'react';
import { FiX, FiTag } from 'react-icons/fi';

interface GalleryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  onCreated?: (gallery: any) => void;
}

export default function GalleryCreateModal({
  isOpen,
  onClose,
  familyId,
  onCreated,
}: GalleryCreateModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [pendingTag, setPendingTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setTags([]);
      setPendingTag('');
      setError(null);
    }
  }, [isOpen]);

  // Helpers ---------------------------------------------------------
  const addTag = (raw?: string) => {
    const input = raw ?? pendingTag;
    if (!input.trim()) return;

    // Support user typing multiple comma-separated tags at once
    const newTags = input
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setTags((prev) => {
      const merged = [...prev];
      newTags.forEach((t) => {
        if (!merged.includes(t)) merged.push(t);
      });
      return merged;
    });
    setPendingTag('');
  };

  const removeTag = (idx: number) =>
    setTags((prev) => prev.filter((_, i) => i !== idx));

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Combine existing chips with any residual input
      const finalTags: string[] = [...tags];
      if (pendingTag.trim()) {
        pendingTag
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && !finalTags.includes(t))
          .forEach((t) => finalTags.push(t));
      }
      
      // Prepare gallery data
      const galleryData = {
        familyId,
        title: title.trim(),
        description: description.trim(),
        tags: finalTags
      };
      
      // Send API request
      const response = await fetch('/api/family/galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(galleryData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gallery');
      }
      
      const result = await response.json();
      
      // Call onCreated callback if provided
      if (onCreated) {
        onCreated(result.gallery);
      }
      
      // Close modal
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the gallery');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          {/* Close button */}
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>
          
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Gallery</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a photo gallery to share with your family members.
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Title input */}
            <div className="mb-4">
              <label htmlFor="gallery-title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="gallery-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="Gallery title"
                disabled={isSubmitting}
                required
              />
            </div>
            
            {/* Description textarea */}
            <div className="mb-4">
              <label htmlFor="gallery-description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <textarea
                id="gallery-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="Describe this gallery..."
                disabled={isSubmitting}
              />
            </div>
            
            {/* Tags input */}
            <div className="mb-6">
              <label htmlFor="gallery-tags" className="block text-sm font-medium text-gray-700">
                Tags <span className="text-xs text-gray-500">(optional)</span>
              </label>
              {/* Chips */}
              {tags.length > 0 && (
                <ul className="mt-1 mb-2 flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <li
                      key={tag}
                      className="flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      <FiTag className="mr-1 h-3 w-3 text-gray-400" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Input + Add */}
              <div className="mt-1 flex gap-2">
                <div className="relative flex-grow">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FiTag className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="gallery-tags"
                    value={pendingTag}
                    onChange={(e) => setPendingTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    placeholder="Add a tag and press Enter"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addTag()}
                  disabled={isSubmitting || !pendingTag.trim()}
                  className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Gallery'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
