import React from 'react';

export function NexoraMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#0e121a" stroke="rgba(255,255,255,0.12)" />
      <path d="M9 22V10L16 16.5L23 10V22" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="22" r="2" fill="#f59e0b" />
    </svg>
  );
}
