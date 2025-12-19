'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Inquiry } from '@/types/inquiry';
import { InquiryCard } from './InquiryCard';

interface SortableInquiryCardProps {
  inquiry: Inquiry;
  onClick?: () => void;
}

export function SortableInquiryCard({ inquiry, onClick }: SortableInquiryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: inquiry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <InquiryCard inquiry={inquiry} onClick={onClick} />
    </div>
  );
}
