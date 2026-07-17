export const MetricTracker = {
  reads: 0,
  writes: 0,
  listeners: 0,
  queries: [] as any[],

  logRead: (collection: string, timeMs: number, count: number = 1) => {
    if (process.env.NODE_ENV === 'development') {
      MetricTracker.reads += count;
      MetricTracker.queries.push({ type: 'READ', collection, timeMs, count, timestamp: new Date() });
      console.log(`[Firestore Audit] READ on ${collection} (${count} docs) in ${timeMs}ms. Total reads: ${MetricTracker.reads}`);
    }
  },

  logWrite: (collection: string, timeMs: number, count: number = 1) => {
    if (process.env.NODE_ENV === 'development') {
      MetricTracker.writes += count;
      MetricTracker.queries.push({ type: 'WRITE', collection, timeMs, count, timestamp: new Date() });
      console.log(`[Firestore Audit] WRITE on ${collection} (${count} docs) in ${timeMs}ms. Total writes: ${MetricTracker.writes}`);
    }
  }
};
