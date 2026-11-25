'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const WORDS = [
  'Construction',
  'Solar & Energy',
  'Telecom Rollout',
  'Field Logistics',
  'Site Audits',
];

export function RotatingWords() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-flex h-[1.22em] min-w-[230px] sm:min-w-[300px] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          initial={{ y: '100%', opacity: 0, rotateX: -35 }}
          animate={{ y: '0%', opacity: 1, rotateX: 0 }}
          exit={{ y: '-100%', opacity: 0, rotateX: 35 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block bg-gradient-to-r from-[#ff3b30] to-[#f97316] bg-clip-text text-transparent"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
