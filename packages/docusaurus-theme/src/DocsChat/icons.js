// Ikony inline (SVG, aria-hidden) panelu Ask CGC — bez zależności od bibliotek ikon.
import React from "react";

export function ChatBubbleIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 1.8a6.2 6.2 0 0 0-5.3 9.4L1.8 14l2.9-.8A6.2 6.2 0 1 0 8 1.8z" />
      <path d="M5.4 7h5.2M5.4 9.4h3.4" />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 3H13v3.5M13 3 8.8 7.2M6.5 13H3V9.5M3 13l4.2-4.2" />
    </svg>
  );
}

export function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 6.5H9.5V3M9.5 6.5 14 2M3 9.5h3.5V13M6.5 9.5 2 14" />
    </svg>
  );
}

export function MinimizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 6.5 8 11l4.5-4.5" />
    </svg>
  );
}

// --- E2 commit 2: akcje odpowiedzi i composer
const ACTION_ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export function CopyIcon() {
  return (
    <svg {...ACTION_ICON}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  );
}

export function RetryIcon() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M13 8a5 5 0 1 1-1.5-3.6" />
      <path d="M13 2.5V6H9.5" />
    </svg>
  );
}

export function ThumbUpIcon() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M5.5 7v6.5H3V7h2.5zM5.5 7.5l3-5.5c1.2 0 2 1 1.7 2.2L9.8 6.5H13a1 1 0 0 1 1 1.2l-1 4.8a1.5 1.5 0 0 1-1.5 1H5.5" />
    </svg>
  );
}

export function ThumbDownIcon() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M10.5 9V2.5H13V9h-2.5zM10.5 8.5l-3 5.5c-1.2 0-2-1-1.7-2.2l.4-2.3H3a1 1 0 0 1-1-1.2l1-4.8A1.5 1.5 0 0 1 4.5 2.5h6" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
    </svg>
  );
}
