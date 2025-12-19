// API hooks for Inquiry Management using SWR
import useSWR, { mutate } from 'swr';
import type {
  Inquiry,
  InquiryResponse,
  FollowUp,
  InquiryFilters,
  UpdateInquiryInput,
  CreateInquiryInput,
  GenerateResponseInput,
  ScheduleFollowUpInput,
} from '@/types/inquiry';

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'An error occurred while fetching data');
  }
  return res.json();
};

// Build query string from filters
function buildQueryString(filters?: InquiryFilters): string {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.urgency && filters.urgency.length > 0) {
    params.append('urgency', filters.urgency.join(','));
  }
  if (filters.status && filters.status.length > 0) {
    params.append('status', filters.status.join(','));
  }
  if (filters.source && filters.source.length > 0) {
    params.append('source', filters.source.join(','));
  }
  if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
  if (filters.requiresAttention) params.append('requiresAttention', 'true');
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toString());
  if (filters.dateTo) params.append('dateTo', filters.dateTo.toString());
  
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Hook to fetch all inquiries with optional filters
 */
export function useInquiries(filters?: InquiryFilters) {
  const queryString = buildQueryString(filters);
  const { data, error, isLoading, mutate: revalidate } = useSWR<{
    success: boolean;
    inquiries: Inquiry[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }>(
    `/api/inquiries${queryString}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    inquiries: data?.inquiries,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    error,
    mutate: revalidate,
  };
}

/**
 * Hook to fetch a single inquiry by ID
 */
export function useInquiry(id: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{
    success: boolean;
    inquiry: Inquiry;
  }>(
    id ? `/api/inquiries/${id}` : null,
    fetcher
  );

  return {
    inquiry: data?.inquiry,
    isLoading,
    isError: error,
    error,
    mutate: revalidate,
  };
}

/**
 * Hook to fetch responses for an inquiry
 */
export function useInquiryResponses(inquiryId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{
    success: boolean;
    responses: InquiryResponse[];
  }>(
    inquiryId ? `/api/inquiries/${inquiryId}/responses` : null,
    fetcher
  );

  return {
    responses: data?.responses,
    isLoading,
    isError: error,
    error,
    mutate: revalidate,
  };
}

/**
 * Hook to fetch follow-ups for an inquiry
 */
export function useInquiryFollowUps(inquiryId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{
    success: boolean;
    followUps: FollowUp[];
  }>(
    inquiryId ? `/api/inquiries/${inquiryId}/follow-ups` : null,
    fetcher
  );

  return {
    followUps: data?.followUps,
    isLoading,
    isError: error,
    error,
    mutate: revalidate,
  };
}

/**
 * Create a new inquiry
 */
export async function createInquiry(data: CreateInquiryInput): Promise<Inquiry> {
  const res = await fetch('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create inquiry');
  }

  const inquiry = await res.json();
  
  // Revalidate inquiries list
  mutate('/api/inquiries');
  
  return inquiry;
}

/**
 * Update an inquiry
 */
export async function updateInquiry(
  id: string,
  data: UpdateInquiryInput
): Promise<Inquiry> {
  const res = await fetch(`/api/inquiries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update inquiry');
  }

  const inquiry = await res.json();
  
  // Revalidate both single inquiry and list
  mutate(`/api/inquiries/${id}`);
  mutate('/api/inquiries');
  
  return inquiry;
}

/**
 * Generate AI response for an inquiry
 */
export async function generateResponse(
  inquiryId: string,
  data: GenerateResponseInput
): Promise<InquiryResponse> {
  const res = await fetch(`/api/inquiries/${inquiryId}/generate-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate response');
  }

  const response = await res.json();
  
  // Revalidate responses list
  mutate(`/api/inquiries/${inquiryId}/responses`);
  mutate(`/api/inquiries/${inquiryId}`);
  
  return response;
}

/**
 * Schedule a follow-up for an inquiry
 */
export async function scheduleFollowUp(
  inquiryId: string,
  data: ScheduleFollowUpInput
): Promise<FollowUp> {
  const res = await fetch(`/api/inquiries/${inquiryId}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to schedule follow-up');
  }

  const followUp = await res.json();
  
  // Revalidate follow-ups list
  mutate(`/api/inquiries/${inquiryId}/follow-ups`);
  mutate(`/api/inquiries/${inquiryId}`);
  
  return followUp;
}

/**
 * Update a follow-up
 */
export async function updateFollowUp(
  followUpId: string,
  data: Partial<FollowUp>
): Promise<FollowUp> {
  const res = await fetch(`/api/follow-ups/${followUpId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update follow-up');
  }

  const followUp = await res.json();
  
  // Revalidate follow-ups (we need inquiryId for proper revalidation)
  mutate((key) => typeof key === 'string' && key.includes('/follow-ups'));
  
  return followUp;
}

/**
 * Delete an inquiry
 */
export async function deleteInquiry(id: string): Promise<void> {
  const res = await fetch(`/api/inquiries/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete inquiry');
  }

  // Revalidate inquiries list
  mutate('/api/inquiries');
}

/**
 * Hook to get inquiry statistics
 */
export function useInquiryStats() {
  const { inquiries, isLoading, error } = useInquiries();

  if (isLoading || error || !inquiries) {
    return {
      totalInquiries: 0,
      newThisWeek: 0,
      requiresAttention: 0,
      conversionRate: 0,
      pendingFollowUps: 0,
      isLoading,
      error,
    };
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalInquiries = inquiries.length;
  const newThisWeek = inquiries.filter(
    (i) => new Date(i.createdAt) >= weekAgo
  ).length;
  
  // Inquiries requiring attention: URGENT urgency or NEW status older than 24 hours
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const requiresAttention = inquiries.filter(
    (i) =>
      i.urgency === 'URGENT' ||
      (i.status === 'NEW' && new Date(i.createdAt) < oneDayAgo)
  ).length;

  const converted = inquiries.filter((i) => i.status === 'CONVERTED').length;
  const conversionRate = totalInquiries > 0 ? (converted / totalInquiries) * 100 : 0;

  // This would need to fetch follow-ups data - simplified for now
  const pendingFollowUps = 0;

  return {
    totalInquiries,
    newThisWeek,
    requiresAttention,
    conversionRate,
    pendingFollowUps,
    isLoading: false,
    error: null,
  };
}
