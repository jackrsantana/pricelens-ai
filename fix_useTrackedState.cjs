const fs = require('fs');
let code = fs.readFileSync('src/hooks/useDiagnostic.ts', 'utf8');

code = code.replace(/export function useTrackedState<T>\(initialValue: T, componentName: string, stateName: string\): \[T, \(val: T \| \(\(prev: T\) => T\)\) => void\] \{/,
  "export function useTrackedState<T>(initialValue: T | (() => T), componentName: string, stateName: string): [T, (val: T | ((prev: T) => T)) => void] {");

code = code.replace(/MetricTracker\.logStateChange\(componentName, stateName, state, newVal\);/g, 
  `if (state !== newVal) {
        MetricTracker.logStateChange(componentName, stateName, state, newVal);
      }`);

fs.writeFileSync('src/hooks/useDiagnostic.ts', code);
