import React, { useState, useEffect } from 'react';
import { FiX, FiTag } from 'react-icons/fi';

interface NoteCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  onCreated?: (note: any) => void;
}

export default function NoteCreateModal({
  isOpen,
  onClose,
  familyId,
  onCreated,
}: NoteCreateModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setTagsInput('');
      setTags([]);
      setError(null);
    }
  }, [isOpen]);

  /* -------------------- tag helpers -------------------- */
  const addTag = (raw?: string) => {
    const val = (raw ?? tagsInput).trim();
    if (!val) return;
    if (!tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    setTagsInput('');
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Merge explicit chips + any trailing comma-separated input
      const mergedTags = [
        ...tags,
        ...tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      ].filter((t, i, a) => a.indexOf(t) === i);
      
      // Prepare note data
      const noteData = {
        familyId,
        title: title.trim(),
        content: {
          type: 'html',
          content: content.trim(),
          plainText: content.trim()
        },
        tags: mergedTags
      };
      
      // Send API request
      const response = await fetch('/api/family/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create note');
      }
      
      const result = await response.json();
      
      // Call onCreated callback if provided
      if (onCreated) {
        onCreated(result.note);
      }
      
      // Close modal
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the note');
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
            <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Note</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a new note to share with your family members.
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Title input */}
            <div className="mb-4">
              <label htmlFor="note-title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="Note title"
                disabled={isSubmitting}
                required
              />
            </div>
            
            {/* Content textarea */}
            <div className="mb-4">
              <label htmlFor="note-content" className="block text-sm font-medium text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="Write your note here..."
                disabled={isSubmitting}
                required
              />
            </div>
            
            {/* Tags input */}
            <div className="mb-6">
              <label htmlFor="note-tags" className="block text-sm font-medium text-gray-700">
                Tags{' '}
                <span className="text-xs text-gray-500">
                  (type a tag and press&nbsp;Enter or click&nbsp;Add)
                </span>
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FiTag className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="note-tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ',') &&
                        tagsInput.trim().length > 0
                      ) {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="block w-full rounded-md border border-gray-300 pl-10 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    placeholder="family, important, follow-up"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addTag()}
                  disabled={isSubmitting || !tagsInput.trim()}
                  className="relative -ml-px inline-flex items-center gap-1 rounded-r-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 hover:bg-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {/* tag chips */}
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                    >
                      <FiTag className="mr-1 h-3 w-3 text-gray-500" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                {isSubmitting ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
