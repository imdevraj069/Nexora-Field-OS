'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

// Marlo & Emil Kowalski motion curves
export const MARLO_EASE = [0.22, 1, 0.36, 1] as const;
export const MARLO_BACK_SPRING = { type: 'spring' as const, stiffness: 380, damping: 28 };
export const springTransition = { type: 'spring' as const, stiffness: 380, damping: 30 };
export const easeOutQuad = MARLO_EASE;

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, delay, ease: MARLO_EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealInView({
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
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.08 }}
      transition={{ duration: 0.42, delay, ease: MARLO_EASE }}
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
      transition={{ duration: 0.28, delay, ease: MARLO_EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedRing({
  percent,
  size = 52,
  strokeWidth = 5,
  label,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#nexoraRingGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.9, ease: MARLO_EASE }}
        />
        <defs>
          <linearGradient id="nexoraRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff453a" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-mono text-[11px] font-bold text-zinc-100 tabular-nums">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
