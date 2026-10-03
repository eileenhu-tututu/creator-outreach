'use client';

import { useEffect } from 'react';

import { trackAppOpened } from '@/lib/analytics';

export function AnalyticsProvider() {
  useEffect(() => {
    trackAppOpened();
  }, []);

  return null;
}
