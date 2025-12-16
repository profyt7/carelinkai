"use client";

import React, { useState } from "react";
import { FiClock, FiCheck } from "react-icons/fi";
import { format, parseISO } from "date-fns";

interface TimeSlot {
  time: string; // ISO 8601 datetime string
  available: boolean;
  reason?: string;
}

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  onSelect: (slot: string) => void;
  maxSelections?: number;
  className?: string;
}

export default function TimeSlotSelector({
  slots,
  selectedSlot,
  onSelect,
  maxSelections = 1,
  className = "",
}: TimeSlotSelectorProps) {
  const [selectedSlots, setSelectedSlots] = useState<string[]>(
    selectedSlot ? [selectedSlot] : []
  );

  const handleSelect = (slot: string) => {
    if (maxSelections === 1) {
      setSelectedSlots([slot]);
      onSelect(slot);
    } else {
      const newSelection = selectedSlots.includes(slot)
        ? selectedSlots.filter((s) => s !== slot)
        : selectedSlots.length < maxSelections
        ? [...selectedSlots, slot]
        : selectedSlots;

      setSelectedSlots(newSelection);
      onSelect(newSelection[0] || "");
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = parseISO(isoString);
      return {
        date: format(date, "EEEE, MMMM d, yyyy"),
        time: format(date, "h:mm a"),
      };
    } catch (error) {
      return { date: "Invalid date", time: "" };
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {slots.map((slot, index) => {
        const { date, time } = formatDateTime(slot.time);
        const isSelected = selectedSlots.includes(slot.time);
        const isDisabled = !slot.available;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleSelect(slot.time)}
            disabled={isDisabled}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-primary-600 bg-primary-50"
                : isDisabled
                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                : "border-gray-300 bg-white hover:border-primary-300 hover:bg-primary-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <FiClock
                    className={`mr-2 h-5 w-5 ${
                      isSelected
                        ? "text-primary-600"
                        : isDisabled
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        isSelected
                          ? "text-primary-900"
                          : isDisabled
                          ? "text-gray-500"
                          : "text-gray-900"
                      }`}
                    >
                      {date}
                    </p>
                    <p
                      className={`text-sm ${
                        isSelected
                          ? "text-primary-700"
                          : isDisabled
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {time}
                    </p>
                  </div>
                </div>
                {slot.reason && (
                  <p className="mt-2 text-xs text-gray-500">{slot.reason}</p>
                )}
              </div>
              {isSelected && (
                <div className="ml-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600">
                    <FiCheck className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
