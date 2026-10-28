// Animation constants and variants for Framer Motion
// Respects prefers-reduced-motion automatically

import { Variants, Transition } from 'framer-motion';

// Standard timing functions as tuples
export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring', stiffness: 300, damping: 30 } as const,
};

// Standard durations (in seconds)
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  page: 0.35,
} as const;

// Default transition
export const defaultTransition: Transition = {
  duration: durations.normal,
  ease: easings.easeOut,
};

// ============================================
// PAGE TRANSITIONS
// ============================================

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.page,
      ease: easings.easeOut ,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
    },
  },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: durations.normal },
  },
  exit: { opacity: 0 },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: { opacity: 0, y: -10 },
};

// ============================================
// STAGGER ANIMATIONS (for lists)
// ============================================

export const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
};

export const staggerFadeItem: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: durations.fast },
  },
};

// ============================================
// CARD & HOVER ANIMATIONS
// ============================================

export const cardHoverVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut ,
    },
  },
  tap: { scale: 0.98 },
};

export const cardEnterVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
};

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const buttonSpinnerVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// MODAL & DIALOG ANIMATIONS
// ============================================

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: durations.fast },
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast },
  },
};

export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: durations.fast },
  },
};

export const slideInFromRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  enter: {
    x: 0,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: durations.fast },
  },
};

export const slideInFromLeft: Variants = {
  initial: { x: '-100%', opacity: 0 },
  enter: {
    x: 0,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: durations.fast },
  },
};

// ============================================
// FORM ANIMATIONS
// ============================================

export const formFieldVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.fast,
    },
  },
};

export const errorShake: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-5, 5, -5, 5, 0],
    transition: { duration: 0.4 },
  },
};

export const successPop: Variants = {
  initial: { scale: 0, opacity: 0 },
  enter: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

// ============================================
// NAVIGATION ANIMATIONS
// ============================================

export const dropdownVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.fast,
      ease: easings.easeOut ,
    },
  },
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

export const mobileMenuVariants: Variants = {
  initial: { x: '100%' },
  enter: {
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: {
    x: '100%',
    transition: { duration: durations.fast },
  },
};

export const sidebarVariants: Variants = {
  collapsed: {
    width: 64,
    transition: { duration: durations.normal },
  },
  expanded: {
    width: 256,
    transition: { duration: durations.normal },
  },
};

// ============================================
// TOAST ANIMATIONS
// ============================================

export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut ,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: durations.fast },
  },
};

// ============================================
// LOADING ANIMATIONS
// ============================================

export const pulseVariants: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmerVariants: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// SCROLL REVEAL ANIMATIONS
// ============================================

export const scrollRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.easeOut ,
    },
  },
};

export const scrollRevealLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.easeOut ,
    },
  },
};

export const scrollRevealRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.easeOut ,
    },
  },
};

// ============================================
// UTILITY: Check for reduced motion preference
// ============================================

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
};

// Get variants that respect reduced motion preference
export const getReducedMotionVariants = (variants: Variants): Variants => {
  if (typeof window === 'undefined') return variants;
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      enter: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return variants;
};
