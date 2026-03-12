/**
 * KDSTimer — Live countdown showing elapsed time since order was placed.
 * Color codes: green < 10min → yellow < 20min → red ≥ 20min
 */
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const getElapsed = (placedAt) => {
  const diffMs = Date.now() - new Date(placedAt).getTime();
  return Math.floor(diffMs / 1000); // seconds
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const getColor = (seconds) => {
  const mins = seconds / 60;
  if (mins < 10) return 'text-green-600 bg-green-50';
  if (mins < 20) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

export default function KDSTimer({ placedAt, className = '' }) {
  const [elapsed, setElapsed] = useState(() => getElapsed(placedAt));

  useEffect(() => {
    const id = setInterval(() => setElapsed(getElapsed(placedAt)), 1000);
    return () => clearInterval(id);
  }, [placedAt]);

  const isUrgent = elapsed >= 20 * 60;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold
                      ${getColor(elapsed)} ${isUrgent ? 'kds-urgent' : ''} ${className}`}>
      <Clock className="w-3 h-3" />
      {formatTime(elapsed)}
    </span>
  );
}
