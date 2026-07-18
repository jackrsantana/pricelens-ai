const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/const runBenchmark = async \(\) => \{[\s\S]*?console\.error\(e\);\n    \}\n  \};/, `let benchmarkCached = false;
  const runBenchmark = async () => {
    const start = performance.now();
    try {
      if (!benchmarkCached) {
        const snap = await getDocs(query(collection(db, 'markets'), limit(1)));
        MetricTracker.logRead('markets', 'benchmark_real', snap.size, performance.now() - start, { component: 'DashboardDiagnostics', func: 'runBenchmark' });
        benchmarkCached = true;
      } else {
        MetricTracker.logRead('markets', 'benchmark_cache', 1, performance.now() - start, { component: 'DashboardDiagnostics', func: 'runBenchmark' });
      }
      MetricTracker.logGeminiCall('benchmark-test-model', 1500, { tokens: 120 });
      MetricTracker.logRender('BenchmarkTask', 'Benchmark manual');
    } catch (e) {
      console.error(e);
    }
  };`);

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed diag benchmark again");
