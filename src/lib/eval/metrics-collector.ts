/**
 * Metrics Collector
 *
 * Small utilities for extracting and normalizing metrics from provider responses
 * for persistence in EvalResult rows.
 */

import type { ProviderResponse } from '@/lib/providers/types';

export interface CollectedLatencyMetrics {
  /** Time to first byte in ms */
  ttfb: number | null;
  /** Total time in ms */
  total: number | null;
}

/**
 * Extract latency metrics from a ProviderResponse.
 *
 * Provider adapters are expected to populate `response.latency`.
 * This function is defensive and will return nulls if values are missing/invalid.
 */
export function collectLatencyMetrics(response: ProviderResponse | null | undefined): CollectedLatencyMetrics {
  if (!response) {
    return { ttfb: null, total: null };
  }

  const ttfb = typeof response.latency?.ttfb === 'number' && Number.isFinite(response.latency.ttfb)
    ? response.latency.ttfb
    : null;

  const total = typeof response.latency?.total === 'number' && Number.isFinite(response.latency.total)
    ? response.latency.total
    : null;

  return { ttfb, total };
}
