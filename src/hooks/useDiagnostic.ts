import { useRef, useState } from 'react';
import { MetricTracker } from '../lib/instrumentation';

export function useTrackedRender(componentName: string, props: any, state?: any) {
  const prevProps = useRef<any>({});
  const prevState = useRef<any>({});
  
  if (MetricTracker.enabled) {
    const changedProps = Object.keys(props).filter(k => props[k] !== prevProps.current[k]);
    const changedState = state ? Object.keys(state).filter(k => state[k] !== prevState.current[k]) : [];
    
    let reason = 'Initial Render';
    if (changedProps.length > 0) reason = `Props changed: ${changedProps.join(', ')}`;
    else if (changedState.length > 0) reason = `State changed: ${changedState.join(', ')}`;
    else if (Object.keys(prevProps.current).length > 0) reason = 'Parent rendered / Force update';
    
    MetricTracker.logRender(componentName, reason, { changedProps, changedState });
    
    prevProps.current = { ...props };
    if (state) prevState.current = { ...state };
  }
}

export function useTrackedState<T>(initialValue: T | (() => T), componentName: string, stateName: string): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  
  const setTrackedState = (val: T | ((prev: T) => T)) => {
    if (MetricTracker.enabled) {
      const newVal = typeof val === 'function' ? (val as any)(state) : val;
      if (state !== newVal) {
        MetricTracker.logStateChange(componentName, stateName, state, newVal);
      }
      setState(newVal);
    } else {
      setState(val);
    }
  };
  
  return [state, setTrackedState];
}
