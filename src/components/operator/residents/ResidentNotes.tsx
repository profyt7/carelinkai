"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';

type Note = {
  id: string;
  content: string;
  visibility: 'INTERNAL' | 'CARE_TEAM' | 'FAMILY';
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

interface ResidentNotesProps {
  residentId: string;
  currentUserId?: string;
}

export function ResidentNotes({ residentId, currentUserId }: ResidentNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newVisibility, setNewVisibility] = useState<'INTERNAL' | 'CARE_TEAM' | 'FAMILY'>('INTERNAL');
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [residentId]);

  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/notes?limit=50`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotes(data.items || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    if (newNote.length > 1000) {
      toast.error('Note must be 1000 characters or less');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/residents/${residentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim(), visibility: newVisibility }),
      });

      if (!res.ok) throw new Error('Failed to create note');

      toast.success('Note added successfully');
      setNewNote('');
      setCharCount(0);
      setNewVisibility('INTERNAL');
      
      // Optimistic update - refetch notes
      await fetchNotes();
      router.refresh();
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditNote(noteId: string) {
    if (!editContent.trim()) return;
    if (editContent.length > 1000) {
      toast.error('Note must be 1000 characters or less');
      return;
    }

    try {
      const res = await fetch(`/api/residents/${residentId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update note');

      toast.success('Note updated successfully');
      setEditingId(null);
      setEditContent('');
      
      // Optimistic update
      await fetchNotes();
      router.refresh();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/residents/${residentId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete note');

      toast.success('Note deleted successfully');
      
      // Optimistic update
      await fetchNotes();
      router.refresh();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  }

  function formatTimestamp(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getVisibilityBadgeColor(visibility: string) {
    switch (visibility) {
      case 'FAMILY':
        return 'bg-green-100 text-green-800';
      case 'CARE_TEAM':
        return 'bg-blue-100 text-blue-800';
      case 'INTERNAL':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getInitials(firstName?: string, lastName?: string) {
    if (!firstName && !lastName) return '?';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Note</label>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Enter your note here..."
          rows={4}
          value={newNote}
          onChange={(e) => {
            setNewNote(e.target.value);
            setCharCount(e.target.value.length);
          }}
          maxLength={1000}
          required
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <select
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as any)}
            >
              <option value="INTERNAL">Internal Only</option>
              <option value="CARE_TEAM">Care Team</option>
              <option value="FAMILY">Visible to Family</option>
            </select>
            <span className={`text-xs ${charCount > 900 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {charCount}/1000
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="bg-primary-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">No notes yet. Add your first note above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const isAuthor = currentUserId && note.createdBy?.id === currentUserId;

            return (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
                      {note.createdBy ? (
                        getInitials(note.createdBy.firstName, note.createdBy.lastName)
                      ) : (
                        <FiUser />
                      )}
                    </div>
                    {/* Author & Timestamp */}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {note.createdBy ? `${note.createdBy.firstName} ${note.createdBy.lastName}` : 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">{formatTimestamp(note.createdAt)}</p>
                    </div>
                    {/* Visibility Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getVisibilityBadgeColor(note.visibility)}`}>
                      {note.visibility === 'INTERNAL' ? 'Internal' : note.visibility === 'CARE_TEAM' ? 'Care Team' : 'Family'}
                    </span>
                  </div>

                  {/* Actions (only for author) */}
                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                        className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
                        title="Edit note"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete note"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${editContent.length > 900 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {editContent.length}/1000
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditNote(note.id)}
                          className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
