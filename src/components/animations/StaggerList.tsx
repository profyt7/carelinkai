'use client';

import { ReactNode, useEffect, useState, Children } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { prefersReducedMotion, durations, easings } from '@/lib/animations';

interface StaggerListProps {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
  itemClassName?: string;
  once?: boolean;
}

export default function StaggerList({
  children,
  staggerDelay = 0.05,
  initialDelay = 0,
  className = '',
  itemClassName = '',
  once = true,
}: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-30px' });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  const childArray = Children.toArray(children);

  // Avoid hydration mismatch
  if (!mounted) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  if (reducedMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: durations.normal,
            delay: initialDelay + index * staggerDelay,
            ease: easings.easeOut ,
          }}
          className={itemClassName}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
