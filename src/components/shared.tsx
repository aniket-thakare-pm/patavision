import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { Waypoint } from '../lib/addressStore';

export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-[#eab308] focus-visible:outline-offset-2';

export function formatDistance(distance: string): string {
  const trimmed = distance.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^(\d+)\s*m$/i, '$1 m');
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TurnIcon({ direction }: { direction: Waypoint['turnDirection'] }) {
  if (direction === 'left') {
    return <ArrowLeft className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />;
  }
  if (direction === 'right') {
    return <ArrowRight className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />;
  }
  return <ArrowUp className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />;
}

export function turnLabel(direction: Waypoint['turnDirection']): string {
  if (direction === 'left') return 'Turn left';
  if (direction === 'right') return 'Turn right';
  return 'Go straight';
}
