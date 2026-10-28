'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { prefersReducedMotion, durations, easings } from '@/lib/animations';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  once?: boolean;
}

export default function FadeIn({
  children,
  delay = 0,
  duration = durations.normal,
  direction = 'up',
  className = '',
  once = true,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-50px' });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 30 };
      case 'down':
        return { y: -30 };
      case 'left':
        return { x: 30 };
      case 'right':
        return { x: -30 };
      default:
        return {};
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  if (reducedMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...getInitialPosition() }}
      transition={{
        duration,
        delay,
        ease: easings.easeOut ,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
