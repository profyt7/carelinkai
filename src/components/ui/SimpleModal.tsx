import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A simple modal component that doesn't depend on @headlessui/react
 * Can be used as a drop-in replacement for Dialog components
 */
export const SimpleModal: React.FC<SimpleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Store the previously focused element and focus the modal when opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal container or the first focusable element
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 10);
    } else if (previousFocusRef.current) {
      // Restore focus when modal closes
      (previousFocusRef.current as HTMLElement).focus();
    }
  }, [isOpen]);

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Close on ESC key
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    // Trap focus within modal
    if (event.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Don't render anything if the modal is closed
  if (!isOpen) return null;

  // Create portal to render modal outside of normal DOM hierarchy
  return createPortal(
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={title ? 'modal-title' : undefined}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal positioning */}
      <div className="min-h-screen px-4 text-center">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span
          className="inline-block h-screen align-middle"
          aria-hidden="true"
        >
          &#8203;
        </span>
        
        {/* Modal content */}
        <div
          ref={modalRef}
          className={`inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg ${className}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Header with title and close button */}
          <div className="flex justify-between items-center mb-4">
            {title && (
              <h3 
                id="modal-title"
                className="text-lg font-medium text-neutral-900"
              >
                {title}
              </h3>
            )}
            
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700"
                aria-label="Close modal"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          
          {/* Modal body */}
          <div>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Child component to match Dialog.Title API
 */
SimpleModal.Title = function SimpleModalTitle({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-medium text-neutral-900 ${className}`} {...props}>
      {children}
    </h3>
  );
};

/**
 * Child component to match Dialog.Overlay API
 */
SimpleModal.Overlay = function SimpleModalOverlay({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity ${className}`}
      {...props}
    />
  );
};

export default SimpleModal;
