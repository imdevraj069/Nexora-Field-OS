'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface CountUpMetricProps {
  target: number;
  suffix?: string;
  prefix?: string;
  label: string;
  sublabel: string;
}

export function CountUpMetric({
  target,
  suffix = '',
  prefix = '',
  label,
  sublabel,
}: CountUpMetricProps) {
  const [display, setDisplay] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: 'power3.out',
        onUpdate: () => {
          setDisplay(Math.round(obj.val));
        },
      });
    }, elRef);
    return () => ctx.revert();
  }, [target]);

  return (
    <div
      ref={elRef}
      className="glass-card rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1"
    >
      <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#111318]">
        {prefix}
        {display}
        <span className="text-orange-600">{suffix}</span>
      </p>
      <p className="text-xs font-bold mt-1 text-[#111318]">{label}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{sublabel}</p>
    </div>
  );
}
