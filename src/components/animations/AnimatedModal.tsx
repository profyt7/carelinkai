'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdropVariants, modalContentVariants, prefersReducedMotion } from '@/lib/animations';
import { FiX } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  className = '',
}: AnimatedModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  if (reducedMotion) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div
          className={cn(
            'relative bg-white rounded-xl shadow-2xl w-full p-6',
            sizeStyles[size],
            className
          )}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between mb-4">
              {title && (
                <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500"
                >
                  <FiX className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={cn(
              'relative bg-white rounded-xl shadow-2xl w-full p-6',
              sizeStyles[size],
              className
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between mb-4">
                {title && (
                  <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
