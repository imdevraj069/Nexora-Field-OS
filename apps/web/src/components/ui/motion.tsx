'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

// Transition definitions adhering to Emil Kowalski 4 Golden Laws
export const springTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
};

export const easeOutQuad = [0.16, 1, 0.3, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, delay, ease: easeOutQuad }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  delay = 0,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.24, delay, ease: easeOutQuad }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
