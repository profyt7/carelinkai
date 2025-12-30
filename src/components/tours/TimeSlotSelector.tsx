"use client";

import React, { useState, useEffect } from "react";
import { FiClock, FiCheck, FiStar } from "react-icons/fi";
import { format, parseISO } from "date-fns";

interface TimeSlot {
  time: string; // ISO 8601 datetime string
  available: boolean;
  reason?: string;
  score?: number; // AI confidence score (0-100)
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

  // CRITICAL FIX: Sync internal state with prop changes to prevent state mismatch
  // This prevents browser crashes caused by competing sources of truth
  useEffect(() => {
    if (selectedSlot) {
      setSelectedSlots([selectedSlot]);
    } else {
      setSelectedSlots([]);
    }
  }, [selectedSlot]);

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

  // Sort slots by AI score (highest first)
  const sortedSlots = [...slots].sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    return scoreB - scoreA;
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedSlots.map((slot, index) => {
        const { date, time } = formatDateTime(slot.time);
        const isSelected = selectedSlots.includes(slot.time);
        const isDisabled = !slot.available;
        const isHighScore = (slot.score || 0) >= 85;

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
                : isHighScore
                ? "border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100"
                : "border-gray-300 bg-white hover:border-primary-300 hover:bg-primary-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiClock
                      className={`mr-2 h-5 w-5 ${
                        isSelected
                          ? "text-primary-600"
                          : isDisabled
                          ? "text-gray-400"
                          : isHighScore
                          ? "text-green-600"
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
                            : isHighScore
                            ? "text-green-900"
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
                            : isHighScore
                            ? "text-green-700"
                            : "text-gray-600"
                        }`}
                      >
                        {time}
                      </p>
                    </div>
                  </div>
                  
                  {/* AI Badge and Score */}
                  {!isSelected && isHighScore && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center rounded-full bg-green-600 px-3 py-1">
                        <FiStar className="mr-1 h-3 w-3 text-white" />
                        <span className="text-xs font-semibold text-white">
                          AI Recommended
                        </span>
                      </div>
                      {slot.score && (
                        <span className="mt-1 text-xs font-medium text-green-700">
                          {slot.score}% match
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Show score for non-high-score slots */}
                  {!isSelected && !isHighScore && slot.score && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-500">
                        {slot.score}% match
                      </span>
                    </div>
                  )}
                </div>
                
                {/* AI Reasoning - More Prominent */}
                {slot.reason && (
                  <div className="mt-3 flex items-start rounded-md bg-white/70 p-2">
                    <FiStar className={`mr-2 mt-0.5 h-4 w-4 flex-shrink-0 ${
                      isHighScore ? "text-green-600" : "text-gray-400"
                    }`} />
                    <p className={`text-sm leading-relaxed ${
                      isHighScore 
                        ? "font-medium text-green-800" 
                        : "text-gray-600"
                    }`}>
                      {slot.reason}
                    </p>
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="ml-3 flex-shrink-0">
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
