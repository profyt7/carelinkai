'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion, durations, easings } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
  delay?: number;
  onClick?: () => void;
}

export default function AnimatedCard({
  children,
  className = '',
  hoverScale = 1.02,
  hoverY = -4,
  delay = 0,
  onClick,
}: AnimatedCardProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn(
          'rounded-xl bg-white shadow-sm border border-neutral-200',
          'transition-shadow duration-200 hover:shadow-lg',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div
        className={cn(
          'rounded-xl bg-white shadow-sm border border-neutral-200',
          'hover:shadow-lg',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durations.normal,
        delay,
        ease: easings.easeOut ,
      }}
      whileHover={{
        scale: hoverScale,
        y: hoverY,
        transition: { duration: durations.fast },
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'rounded-xl bg-white shadow-sm border border-neutral-200',
        'hover:shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
