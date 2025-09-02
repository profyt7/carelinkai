"use client";

import { useState, useEffect } from 'react';
import { UserRole, ShiftStatus, ShiftApplicationStatus } from '@prisma/client';
import { toast } from 'react-hot-toast';

interface Shift {
  id: string;
  homeId: string;
  home: {
    id: string;
    name: string;
    address: any;
    operatorId: string;
    operatorName: string;
  };
  caregiverId: string | null;
  caregiver: {
    id: string;
    userId: string;
    name: string;
    profileImageUrl: string | null;
  } | null;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  hourlyRate: number;
  notes: string | null;
  appointmentId: string | null;
  applicationsCount: number;
  applications: {
    id: string;
    status: ShiftApplicationStatus;
    caregiverId?: string;
    caregiverName?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface ShiftsListProps {
  role: 'OPERATOR' | 'CAREGIVER' | 'ADMIN' | 'STAFF';
  query?: string;
  caregiverId?: string;
}

export default function ShiftsList({ role, query, caregiverId }: ShiftsListProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<{ [shiftId: string]: string }>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch shifts on component mount or when query changes
  useEffect(() => {
    fetchShifts();
  }, [query]);

  // Function to fetch shifts
  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shifts${query ?? ''}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shifts: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShifts(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch shifts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching shifts');
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle caregiver applying for a shift
  const handleApply = async (shiftId: string) => {
    if (actionInProgress) return;
    
    try {
      setActionInProgress(shiftId);
      
      const response = await fetch(`/api/shifts/${shiftId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply for shift');
      }

      toast.success('Successfully applied for the shift!');
      fetchShifts(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply for shift');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle caregiver accepting an offered shift
  const handleAccept = async (shiftId: string) => {
    if (actionInProgress) return;

    try {
      setActionInProgress(shiftId);

      const response = await fetch(`/api/shifts/${shiftId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept shift offer');
      }

      toast.success('Successfully accepted the offer!');
      fetchShifts(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept shift offer');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle caregiver withdrawing an application
  const handleWithdraw = async (shiftId: string) => {
    if (actionInProgress) return;
    try {
      setActionInProgress(shiftId);
      const res = await fetch(`/api/shifts/${shiftId}/applications`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to withdraw');
      toast.success('Application withdrawn');
      fetchShifts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle operator rejecting an application
  const handleReject = async (shiftId: string, cgId?: string) => {
    if (actionInProgress || !cgId) return;
    try {
      setActionInProgress(shiftId);
      const res = await fetch(
        `/api/shifts/${shiftId}/applications/${cgId}/reject`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reject');
      toast.success('Application rejected');
      fetchShifts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle operator offering a shift to a caregiver
  const handleOffer = async (shiftId: string, caregiverIdParam?: string) => {
    if (actionInProgress) return;
    
    const caregiverId = caregiverIdParam ?? offerData[shiftId];
    if (!caregiverId || caregiverId.trim() === '') {
      toast.error('Please enter a caregiver ID');
      return;
    }

    try {
      setActionInProgress(shiftId);
      
      const response = await fetch(`/api/shifts/${shiftId}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caregiverId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to offer shift');
      }

      toast.success('Successfully offered the shift to the caregiver!');
      fetchShifts(); // Refresh the list
      
      // Clear the input field
      setOfferData(prev => ({
        ...prev,
        [shiftId]: ''
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to offer shift');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle operator confirming a shift
  const handleConfirm = async (shiftId: string, caregiverId?: string) => {
    if (actionInProgress) return;
    
    try {
      setActionInProgress(shiftId);
      
      const response = await fetch(`/api/shifts/${shiftId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caregiverId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm shift');
      }

      toast.success('Successfully confirmed the shift!');
      fetchShifts(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm shift');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle operator canceling a shift
  const handleCancel = async (shiftId: string) => {
    if (actionInProgress) return;
    
    const reason = window.prompt('Please enter a reason for cancellation:');
    if (reason === null) return; // User clicked cancel on prompt
    
    try {
      setActionInProgress(shiftId);
      
      const response = await fetch(`/api/shifts/${shiftId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel shift');
      }

      toast.success('Successfully canceled the shift!');
      fetchShifts(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel shift');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle operator completing a shift
  const handleComplete = async (shiftId: string) => {
    if (actionInProgress) return;
    
    const notes = window.prompt('Please enter completion notes (optional):');
    if (notes === null) return; // User clicked cancel on prompt
    
    try {
      setActionInProgress(shiftId);
      
      const response = await fetch(`/api/shifts/${shiftId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete shift');
      }

      toast.success('Successfully completed the shift!');
      fetchShifts(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete shift');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle input change for caregiver ID
  const handleCaregiverIdChange = (shiftId: string, value: string) => {
    setOfferData(prev => ({
      ...prev,
      [shiftId]: value
    }));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format hourly rate for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate shift duration in hours
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return durationHours.toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-2 text-neutral-600">Loading shifts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={fetchShifts}
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <p className="text-neutral-600">No shifts found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Home</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Caregiver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {shifts.map(shift => (
              {/* Added data-shift-id for stable E2E selectors */}
              <tr key={shift.id} data-shift-id={shift.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">{shift.home.name}</div>
                  <div className="text-xs text-neutral-500">{shift.home.operatorName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{formatDate(shift.startTime)}</div>
                  <div className="text-xs text-neutral-500">
                    {calculateDuration(shift.startTime, shift.endTime)} hours
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{formatCurrency(shift.hourlyRate)}/hr</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${shift.status === 'OPEN' ? 'bg-green-100 text-green-800' : 
                      shift.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 
                      shift.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' : 
                      shift.status === 'CANCELED' ? 'bg-red-100 text-red-800' : 
                      'bg-neutral-100 text-neutral-800'}`}>
                    {shift.status}
                  </span>
                  {/* Caregiver-specific application status badge */}
                  {role === 'CAREGIVER' &&
                    caregiverId &&
                    shift.applications.some((a) => a.caregiverId === caregiverId) && (
                      <span className="ml-1 px-1.5 inline-flex text-[10px] leading-4 font-medium rounded 
                        bg-neutral-100 text-neutral-600">
                        {
                          shift.applications.find(
                            (a) => a.caregiverId === caregiverId
                          )?.status
                        }
                      </span>
                  )}
                  {shift.applicationsCount > 0 && (
                    <div className="text-xs text-neutral-500 mt-1">
                      {shift.applicationsCount} application{shift.applicationsCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {shift.caregiver ? (
                    <div className="text-sm text-neutral-900">{shift.caregiver.name}</div>
                  ) : (
                    <div className="text-xs text-neutral-500">Not assigned</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {/* CAREGIVER ACTIONS */}
                  {role === 'CAREGIVER' &&
                    shift.status === 'OPEN' &&
                    // show Apply only when caregiver has no application yet
                    !(
                      shift.applications.some(
                        (app) =>
                          app.caregiverId === caregiverId &&
                          app.status !== 'WITHDRAWN' &&
                          app.status !== 'REJECTED'
                      )
                    ) && (
                    <button
                      onClick={() => handleApply(shift.id)}
                      disabled={actionInProgress === shift.id}
                      className="text-primary-600 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionInProgress === shift.id ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                  {/* ACCEPT OFFER ACTION */}
                  {role === 'CAREGIVER' &&
                    shift.status === 'OPEN' &&
                    caregiverId &&
                    shift.applications.some(
                      app => app.status === 'OFFERED' && app.caregiverId === caregiverId
                    ) && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleAccept(shift.id)}
                          disabled={actionInProgress === shift.id}
                          className="text-primary-600 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionInProgress === shift.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleWithdraw(shift.id)}
                          disabled={actionInProgress === shift.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionInProgress === shift.id ? 'Withdrawing...' : 'Withdraw'}
                        </button>
                      </div>
                  )}
                  {/* WITHDRAW action for APPLIED */}
                  {role === 'CAREGIVER' &&
                    shift.status === 'OPEN' &&
                    caregiverId &&
                    shift.applications.some(
                      app => app.status === 'APPLIED' && app.caregiverId === caregiverId
                    ) && (
                      <button
                        onClick={() => handleWithdraw(shift.id)}
                        disabled={actionInProgress === shift.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionInProgress === shift.id ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                  )}

                  {/* OPERATOR/ADMIN/STAFF ACTIONS */}
                  {(role === 'OPERATOR' || role === 'ADMIN' || role === 'STAFF') && (
                    <div className="space-y-2">
                      {/* OFFER ACTION */}
                      {shift.status === 'OPEN' && (
                        <>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              aria-label="Caregiver ID"
                              placeholder="e.g., cg_123"
                              value={offerData[shift.id] || ''}
                              onChange={(e) => handleCaregiverIdChange(shift.id, e.target.value)}
                              className="form-input text-xs py-1 px-2 rounded border-neutral-300 w-32"
                            />
                            <button
                              onClick={() => handleOffer(shift.id)}
                              disabled={
                                actionInProgress === shift.id ||
                                !(offerData[shift.id]?.trim())
                              }
                              className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionInProgress === shift.id ? 'Offering...' : 'Offer'}
                            </button>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-1">
                            Enter the caregiver&nbsp;ID from the applications list before offering.
                          </p>
                        </>
                      )}

                      {/* CONFIRM ACTION */}
                      {shift.status === 'OPEN' && shift.applications.some(app => app.status === 'ACCEPTED') && (
                        <button
                          onClick={() => handleConfirm(shift.id)}
                          disabled={actionInProgress === shift.id}
                          data-testid="confirm-btn"
                          data-shift-id={shift.id}
                          className="text-xs py-1 px-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed block w-full"
                        >
                          {actionInProgress === shift.id ? 'Confirming...' : 'Confirm'}
                        </button>
                      )}

                      {/* CANCEL ACTION */}
                      {(shift.status === 'OPEN' || shift.status === 'ASSIGNED') && (
                        <button
                          onClick={() => handleCancel(shift.id)}
                          disabled={actionInProgress === shift.id}
                          className="text-xs py-1 px-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed block w-full"
                        >
                          {actionInProgress === shift.id ? 'Canceling...' : 'Cancel'}
                        </button>
                      )}

                      {/* COMPLETE ACTION */}
                      {shift.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleComplete(shift.id)}
                          disabled={actionInProgress === shift.id}
                          className="text-xs py-1 px-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed block w-full"
                        >
                          {actionInProgress === shift.id ? 'Completing...' : 'Complete'}
                        </button>
                      )}
                      
                      {/* APPLICATIONS LIST */}
                      {shift.applications.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <p className="text-xs font-medium text-neutral-500">Applications:</p>
                          <div className="space-y-1 mt-1">
                            {shift.applications.map(app => (
                              <div key={app.id} className="flex items-center justify-between text-xs">
                                <span className="text-neutral-700">
                                  {app.caregiverName || app.caregiverId || 'Unknown'} - 
                                  <span className={`ml-1 ${
                                    app.status === 'APPLIED' ? 'text-blue-600' :
                                    app.status === 'OFFERED' ? 'text-amber-600' :
                                    app.status === 'ACCEPTED' ? 'text-green-600' :
                                    'text-neutral-600'
                                  }`}>
                                    {app.status}
                                  </span>
                                </span>
                                {app.status === 'APPLIED' && (
                                  <button
                                    onClick={() => handleOffer(shift.id, app.caregiverId)}
                                    disabled={actionInProgress === shift.id}
                                    className="ml-2 text-xs py-0.5 px-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
                                  >
                                    Offer
                                  </button>
                                )}
                                {app.status === 'APPLIED' && (
                                  <button
                                    onClick={() => handleReject(shift.id, app.caregiverId)}
                                    disabled={actionInProgress === shift.id}
                                    className="ml-1 text-xs py-0.5 px-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                )}
                                {app.status === 'ACCEPTED' && (
                                  <button
                                    onClick={() => handleConfirm(shift.id, app.caregiverId)}
                                    disabled={actionInProgress === shift.id}
                                    data-testid="confirm-btn"
                                    data-shift-id={shift.id}
                                    className="ml-2 text-xs py-0.5 px-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
