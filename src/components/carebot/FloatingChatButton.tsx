"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import ChatWindow from "./ChatWindow";

/**
 * Floating chat button that opens the CareBot chat window
 * Appears on all pages in the bottom right corner
 */
export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 md:bottom-24 md:right-6">
          <ChatWindow onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          "fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full " +
          "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg " +
          "transition-all duration-300 hover:scale-110 hover:shadow-xl " +
          "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 " +
          "md:h-16 md:w-16"
        }
        aria-label={isOpen ? "Close CareBot" : "Open CareBot"}
      >
        {isOpen ? (
          <X size={24} className="animate-fade-in" />
        ) : (
          <MessageSquare size={24} className="animate-fade-in" />
        )}
      </button>

      {/* Pulsing indicator when closed */}
      {!isOpen && (
        <span className="fixed bottom-4 right-4 z-40 h-14 w-14 animate-ping rounded-full bg-primary-400 opacity-20 md:h-16 md:w-16" />
      )}
    </>
  );
}
