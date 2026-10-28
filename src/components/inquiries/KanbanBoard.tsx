'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Inquiry, InquiryStatus, STATUS_LABELS } from '@/types/inquiry';
import { KanbanColumn } from './KanbanColumn';
import { InquiryCard } from './InquiryCard';
import { updateInquiry } from '@/hooks/useInquiries';
import { toast } from 'react-hot-toast';

interface KanbanBoardProps {
  inquiries: Inquiry[];
  onInquiryClick?: (inquiry: Inquiry) => void;
  onUpdate?: () => void;
}

// Define the pipeline stages (subset of InquiryStatus for visual Kanban)
const KANBAN_STAGES: InquiryStatus[] = [
  InquiryStatus.NEW,
  InquiryStatus.CONTACTED,
  InquiryStatus.TOUR_SCHEDULED,
  InquiryStatus.TOUR_COMPLETED,
  InquiryStatus.QUALIFIED,
  InquiryStatus.CONVERTING,
  InquiryStatus.CONVERTED,
];

export function KanbanBoard({ inquiries, onInquiryClick, onUpdate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticInquiries, setOptimisticInquiries] = useState<Inquiry[]>(inquiries);

  // Update optimistic state when props change
  useState(() => {
    setOptimisticInquiries(inquiries);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group inquiries by status
  const inquiriesByStatus = KANBAN_STAGES.reduce((acc, status) => {
    acc[status] = optimisticInquiries.filter((inq) => inq.status === status);
    return acc;
  }, {} as Record<InquiryStatus, Inquiry[]>);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const inquiryId = active.id as string;
    const newStatus = over.id as InquiryStatus;

    // Find the inquiry being dragged
    const inquiry = optimisticInquiries.find((inq) => inq.id === inquiryId);
    if (!inquiry) {
      setActiveId(null);
      return;
    }

    // If status hasn't changed, do nothing
    if (inquiry.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Optimistic update
    setOptimisticInquiries((prev) =>
      prev.map((inq) =>
        inq.id === inquiryId ? { ...inq, status: newStatus } : inq
      )
    );

    // Update on server
    try {
      await updateInquiry(inquiryId, { status: newStatus });
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update inquiry:', error);
      toast.error('Failed to update inquiry');
      // Revert optimistic update
      setOptimisticInquiries(inquiries);
    } finally {
      setActiveId(null);
    }
  };

  // Get active inquiry for drag overlay
  const activeInquiry = activeId
    ? optimisticInquiries.find((inq) => inq.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {KANBAN_STAGES.map((status) => {
          const columnInquiries = inquiriesByStatus[status] || [];
          return (
            <SortableContext key={status} items={columnInquiries.map((inq) => inq.id)}>
              <KanbanColumn
                id={status}
                title={STATUS_LABELS[status]}
                inquiries={columnInquiries}
                onInquiryClick={onInquiryClick}
              />
            </SortableContext>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeInquiry && (
          <div className="rotate-3 opacity-80">
            <InquiryCard inquiry={activeInquiry} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
