// =============================================
// Performance Monitoring
// Mesure les temps de réponse des APIs et requêtes DB
// =============================================

interface PerfMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerfMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly SLOW_THRESHOLD_MS = 500;

  record(name: string, duration: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last N metrics to avoid memory leaks
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow operations
    if (duration > this.SLOW_THRESHOLD_MS) {
      console.warn(
        `[PERF] ⚠️ Slow operation: ${name} took ${duration}ms`,
        metadata || ""
      );
    }
  }

  // Wrapper pour mesurer une fonction async
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  // Statistiques agrégées
  getStats(name?: string) {
    const filtered = name
      ? this.metrics.filter((m) => m.name === name)
      : this.metrics;

    if (filtered.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: filtered.length,
      avg: Number((sum / filtered.length).toFixed(2)),
      min: Number(durations[0].toFixed(2)),
      max: Number(durations[durations.length - 1].toFixed(2)),
      p95: Number(durations[p95Index].toFixed(2)),
    };
  }

  // Statistiques par opération
  getStatsByOperation() {
    const grouped = new Map<string, number[]>();
    for (const m of this.metrics) {
      if (!grouped.has(m.name)) grouped.set(m.name, []);
      grouped.get(m.name)!.push(m.duration);
    }

    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of grouped) {
      result[name] = this.getStats(name);
    }
    return result;
  }

  getRecentMetrics(limit = 50) {
    return this.metrics.slice(-limit);
  }

  reset(): void {
    this.metrics = [];
  }
}

export const perfMonitor = new PerformanceMonitor();

// Helper pour wrapper les routes API Next.js
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  routeName: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    return perfMonitor.measure(`api:${routeName}`, () => handler(...args));
  }) as T;
}
