'use client';

import React, { useEffect, useState } from 'react';
import { FiEdit3, FiTrash2, FiPlus, FiX, FiSave, FiSearch, FiTag } from 'react-icons/fi';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

type Note = {
  id: string;
  title: string;
  content: any;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    firstName?: string | null;
    lastName?: string | null;
  };
};

interface NotesTabProps {
  familyId: string | null;
  showMock?: boolean;
  isGuest?: boolean;
}

export default function NotesTab({ familyId, showMock = false, isGuest = false }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showMock) {
        const now = Date.now();
        const mockNotes: Note[] = [
          { 
            id: 'note-1', 
            title: 'Doctor Appointment Notes', 
            content: { text: 'Scheduled for next Tuesday. Remember to bring insurance card and medication list.' }, 
            tags: ['medical', 'appointment'], 
            createdAt: new Date(now - 86400000).toISOString(),
            updatedAt: new Date(now - 86400000).toISOString(),
            author: { firstName: 'Ava', lastName: 'Johnson' }
          },
          { 
            id: 'note-2', 
            title: 'Dietary Preferences', 
            content: { text: 'Loves oatmeal for breakfast. Allergic to shellfish. Prefers low sodium meals.' }, 
            tags: ['dietary', 'health'], 
            createdAt: new Date(now - 2*86400000).toISOString(),
            updatedAt: new Date(now - 2*86400000).toISOString(),
            author: { firstName: 'Noah', lastName: 'Williams' }
          },
        ];
        setNotes(mockNotes);
        setLoading(false);
        return;
      }

      if (!familyId) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ familyId, limit: '20' });
      if (search) params.set('search', search);

      const res = await fetch(`/api/family/notes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load notes');
      const json = await res.json();
      setNotes(json.notes ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Error loading notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search, familyId, showMock]);

  // SSE for real-time updates
  useEffect(() => {
    if (showMock || !familyId) return;

    const es = new EventSource(`/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`);

    const parseData = (e: MessageEvent) => {
      try {
        return JSON.parse(e.data);
      } catch {
        return null;
      }
    };

    es.addEventListener('note:created', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.note) setNotes((prev) => [data.note, ...prev]);
    });

    es.addEventListener('note:updated', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.note) {
        setNotes((prev) => prev.map((n) => (n.id === data.note.id ? data.note : n)));
      }
    });

    es.addEventListener('note:deleted', (e) => {
      const data = parseData(e as MessageEvent);
      if (data?.noteId) setNotes((prev) => prev.filter((n) => n.id !== data.noteId));
    });

    return () => es.close();
  }, [familyId, showMock]);

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in title and content');
      return;
    }

    try {
      const res = await fetch('/api/family/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          title: formData.title,
          content: { text: formData.content },
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to create note');
      
      setIsCreating(false);
      setFormData({ title: '', content: '', tags: '' });
      fetchNotes();
    } catch (err: any) {
      alert(err.message ?? 'Error creating note');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(`/api/family/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete note');
      fetchNotes();
    } catch (err: any) {
      alert(err.message ?? 'Error deleting note');
    }
  };

  if (loading) {
    return <LoadingState type="cards" count={3} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading notes</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Search and Create Button */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div>
        
        {!isGuest && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
          >
            <FiPlus className="w-5 h-5" />
            New Note
          </button>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiEdit3 className="w-6 h-6 text-blue-600" />
                Create Note
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ title: '', content: '', tags: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter note title..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your note here..."
                  rows={8}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiTag className="w-4 h-4" />
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="medical, appointment, dietary..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreate}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  <FiSave className="w-5 h-5" />
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ title: '', content: '', tags: '' });
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 && !search ? (
        <EmptyState
          icon={FiEdit3}
          title="No notes yet"
          description="Create notes to keep track of important information, care updates, and personal observations about your loved one."
          actionLabel="Create First Note"
          onAction={() => !isGuest && setIsCreating(true)}
        />
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiEdit3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No notes found matching your search</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300"
            >
              {/* Note Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {note.title}
                  </h3>
                </div>
                {!isGuest && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Note Content */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-4">
                {note.content?.text || ''}
              </p>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-100 to-cyan-50 text-xs font-semibold text-blue-800 border border-blue-200"
                    >
                      <FiTag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-[10px]">
                    {`${note.author.firstName?.[0] ?? ''}${note.author.lastName?.[0] ?? ''}`}
                  </div>
                  <span className="font-medium">
                    {note.author.firstName} {note.author.lastName}
                  </span>
                </div>
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
