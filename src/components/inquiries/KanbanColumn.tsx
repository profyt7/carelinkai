'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Inquiry, InquiryStatus, STATUS_COLORS } from '@/types/inquiry';
import { SortableInquiryCard } from './SortableInquiryCard';

interface KanbanColumnProps {
  id: InquiryStatus;
  title: string;
  inquiries: Inquiry[];
  onInquiryClick?: (inquiry: Inquiry) => void;
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  purple: 'bg-purple-50 border-purple-200',
  pink: 'bg-pink-50 border-pink-200',
  cyan: 'bg-cyan-50 border-cyan-200',
  teal: 'bg-teal-50 border-teal-200',
  green: 'bg-green-50 border-green-200',
  lime: 'bg-lime-50 border-lime-200',
  emerald: 'bg-emerald-50 border-emerald-200',
  gray: 'bg-gray-50 border-gray-200',
};

const headerColorClasses: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  teal: 'bg-teal-100 text-teal-800',
  green: 'bg-green-100 text-green-800',
  lime: 'bg-lime-100 text-lime-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function KanbanColumn({ id, title, inquiries, onInquiryClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const color = STATUS_COLORS[id] || 'gray';
  const columnClasses = colorClasses[color] || colorClasses.gray;
  const headerClasses = headerColorClasses[color] || headerColorClasses.gray;

  return (
    <div className="flex-shrink-0 w-80">
      {/* Column Header */}
      <div className={`${headerClasses} rounded-t-lg p-3 flex items-center justify-between`}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs font-bold px-2 py-1 bg-white bg-opacity-50 rounded-full">
          {inquiries.length}
        </span>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`${columnClasses} border-2 ${
          isOver ? 'border-dashed border-blue-400 bg-blue-50' : ''
        } rounded-b-lg p-3 min-h-[500px] transition-colors`}
      >
        <SortableContext
          items={inquiries.map((inq) => inq.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No inquiries
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <SortableInquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  onClick={() => onInquiryClick?.(inquiry)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
