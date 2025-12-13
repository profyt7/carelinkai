'use client';

import React from 'react';
import { FiUpload, FiPlus, FiUser } from 'react-icons/fi';

interface FamilyHeaderProps {
  onUploadClick?: () => void;
  onAddNoteClick?: () => void;
  residentName?: string;
}

export default function FamilyHeader({ onUploadClick, onAddNoteClick, residentName }: FamilyHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FiUser className="w-6 h-6" />
            {residentName && (
              <span className="text-blue-100 text-sm font-medium">for {residentName}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">Family Portal</h1>
          <p className="text-blue-100 text-sm sm:text-base">Stay connected with your loved one's care journey</p>
        </div>
        <div className="flex gap-2">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center gap-2 text-sm font-medium shadow-md"
            >
              <FiUpload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          )}
          {onAddNoteClick && (
            <button
              onClick={onAddNoteClick}
              className="bg-white/10 backdrop-blur-sm text-white border border-white/30 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add Note</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
