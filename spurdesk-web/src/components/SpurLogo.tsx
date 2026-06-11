import React from 'react';

interface SpurLogoProps {
  className?: string;
  size?: number;
}

export default function SpurLogo({ className = 'text-blue-600', size = 24 }: SpurLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bag Handle */}
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      
      {/* Bag Body with Speech Bubble Tail (Bottom-Left) */}
      <path d="M5 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" fill="none" />
      
      {/* Eyes */}
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
      
      {/* Smile */}
      <path d="M9.5 15s1.5 1.5 2.5 1.5 2.5-1.5 2.5-1.5" stroke="currentColor" fill="none" />
    </svg>
  );
}
