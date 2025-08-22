'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  members: any[]; // array of family members with a nested user object (firstName, lastName)
  ensureMembersLoaded?: () => Promise<void> | void; // optional callback to fetch members if empty
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Add a comment...',
  className = '',
  members,
  ensureMembersLoaded
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caretPos, setCaretPos] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load members if needed when focusing or typing '@'
  useEffect(() => {
    if (ensureMembersLoaded && members.length === 0) {
      ensureMembersLoaded();
    }
  }, [ensureMembersLoaded, members.length]);

  // Process input to find mention tokens
  const processInput = () => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    setCaretPos(cursorPos);

    // Find the start of the current mention token
    let start = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (value.charAt(i) === '@') {
        // Check if @ is at start or preceded by whitespace
        if (i === 0 || /\s/.test(value.charAt(i - 1))) {
          start = i;
          break;
        }
      } else if (/\s/.test(value.charAt(i))) {
        // Stop if we hit whitespace before finding @
        break;
      }
    }

    // If we found a mention start and cursor is after it
    if (start !== -1 && cursorPos > start) {
      const query = value.substring(start + 1, cursorPos).trim();
      setMentionQuery(query);
      setMentionStart(start);
      setShowDropdown(query.length > 0);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
      setMentionQuery('');
      setMentionStart(-1);
    }
  };

  // Filter members based on mention query
  const filteredMembers = showDropdown
    ? members
        .filter(m => {
          // Ensure member has user with firstName and lastName
          if (!m.user?.firstName || !m.user?.lastName) return false;

          const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
          const normalizedQuery = mentionQuery.toLowerCase();
          
          // Simple prefix matching
          return fullName.startsWith(normalizedQuery);
        })
        .slice(0, 8) // Limit to 8 suggestions
    : [];

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle key presses for navigation and selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredMembers.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((selectedIndex + 1) % filteredMembers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((selectedIndex - 1 + filteredMembers.length) % filteredMembers.length);
          break;
        case 'Enter':
          if (showDropdown) {
            e.preventDefault();
            insertMention(filteredMembers[selectedIndex]);
          } else {
            onSubmit();
          }
          break;
        case 'Tab':
          if (showDropdown) {
            e.preventDefault();
            insertMention(filteredMembers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Insert a mention at the current position
  const insertMention = (member: any) => {
    if (mentionStart === -1 || !inputRef.current) return;

    const firstName = member.user.firstName;
    const lastName = member.user.lastName;
    const mentionText = `@${firstName} ${lastName} `;
    
    const before = value.substring(0, mentionStart);
    const after = value.substring(caretPos);
    const newValue = before + mentionText + after;
    
    onChange(newValue);
    
    // Schedule focus and caret position update after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCaretPos = mentionStart + mentionText.length;
        inputRef.current.setSelectionRange(newCaretPos, newCaretPos);
      }
    }, 0);
    
    setShowDropdown(false);
  };

  // Update mention state on input changes
  useEffect(() => {
    processInput();
  }, [value, caretPos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={processInput}
        onFocus={processInput}
        placeholder={placeholder}
        className={`w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
      />
      
      {showDropdown && filteredMembers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filteredMembers.map((member, index) => (
            <div
              key={member.id || index}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === selectedIndex ? 'bg-primary-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => insertMention(member)}
            >
              {member.user.firstName} {member.user.lastName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
