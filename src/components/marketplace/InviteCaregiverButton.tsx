"use client";

import React, { useState } from 'react';

interface InviteCaregiverButtonProps {
  listingId: string;
  caregiverId: string;
}

export default function InviteCaregiverButton({ listingId, caregiverId }: InviteCaregiverButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInvited, setIsInvited] = useState(false);

  const handleInvite = async () => {
    if (isLoading || isInvited) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/marketplace/applications/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          caregiverId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to invite caregiver');
      }
      
      setIsInvited(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to invite caregiver');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleInvite}
      disabled={isLoading || isInvited}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-md transition-colors
        ${isInvited
          ? 'bg-green-100 text-green-800 cursor-default'
          : isLoading
          ? 'bg-primary-400 text-white cursor-wait'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
        }
      `}
    >
      {isLoading ? 'Inviting...' : isInvited ? 'Invited' : 'Invite'}
    </button>
  );
}
