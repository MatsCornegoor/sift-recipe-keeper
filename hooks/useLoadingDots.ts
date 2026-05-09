import { useEffect, useState } from 'react';

export function useLoadingDots(active: boolean, intervalMs = 400): string {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!active) {
      setDots('');
      return;
    }
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, intervalMs);
    return () => {
      clearInterval(interval);
      setDots('');
    };
  }, [active, intervalMs]);

  return dots;
}
