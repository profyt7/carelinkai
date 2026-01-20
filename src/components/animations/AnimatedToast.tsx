'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastVariants, prefersReducedMotion } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

const typeStyles = {
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: FiCheckCircle,
    iconColor: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: FiAlertCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: FiAlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: FiInfo,
    iconColor: 'text-blue-500',
  },
};

export default function AnimatedToast({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const styles = typeStyles[type];
  const Icon = styles.icon;

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 200);
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, id, onClose]);

  if (!mounted || !isVisible) return null;

  if (reducedMotion) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
          styles.bg,
          styles.text
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', styles.iconColor)} />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose(id);
          }}
          className="p-1 hover:bg-black/5 rounded"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
            styles.bg,
            styles.text
          )}
        >
          <Icon className={cn('h-5 w-5 flex-shrink-0', styles.iconColor)} />
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(id), 200);
            }}
            className="p-1 hover:bg-black/5 rounded transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
