export type EventType = 'FIRESTORE_READ' | 'FIRESTORE_WRITE' | 'GEMINI_CALL' | 'RENDER' | 'STATE_CHANGE' | 'PIPELINE_EVENT' | 'ERROR';

export interface TraceContext {
  component?: string;
  hook?: string;
  func?: string;
  service?: string;
  repository?: string;
}

export interface TraceEvent {
  id: string;
  type: EventType;
  name: string;
  startTime: number;
  duration?: number;
  context?: TraceContext;
  details?: any;
  timestamp: Date;
  originStack?: string;
}

export interface DiagnosticSuggestion {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  cause: string;
  suggestion: string;
  timestamp: Date;
}

class DiagnosticTracker {
  public enabled: boolean = true;
  public isExecutingInternalDiagnostic: boolean = false;
  
  public sessionStart: Date = new Date();
  public reads: number = 0;
  public writes: number = 0;
  public geminiCalls: number = 0;
  public internalReads: number = 0;
  public internalWrites: number = 0;
  public internalGeminiCalls: number = 0;
  public errorsCount: number = 0;
  public renderCounts: Record<string, number> = {};
  
  public events: TraceEvent[] = [];
  public suggestions: DiagnosticSuggestion[] = [];

  private generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  private getOriginStack(): string {
    const err = new Error();
    const stack = err.stack || '';
    return stack.split('\n').slice(3).map(line => line.trim()).join('\n');
  }

  public logRead(collection: string, operation: string, count: number, durationMs: number, context: TraceContext, details?: any) {
    if (!this.enabled) return;
    const isInternal = this.isExecutingInternalDiagnostic || operation?.includes('benchmark') || details?.isInternal || collection?.includes('benchmark');
    if (isInternal) {
      this.internalReads += count;
    } else {
      this.reads += count;
    }
    this.events.push({
      id: this.generateId(),
      type: isInternal ? 'INTERNAL_DIAGNOSTIC' as any : 'FIRESTORE_READ',
      name: `${isInternal ? 'INTERNAL_DIAG' : 'READ'} ${collection} [${operation}]`,
      startTime: performance.now() - durationMs,
      duration: durationMs,
      context,
      details: { collection, operation, count, isInternal, ...details },
      timestamp: new Date(),
      originStack: this.getOriginStack()
    });
    this.analyzeEvents();
  }

  public logWrite(collection: string, operation: string, count: number, durationMs: number, context: TraceContext, details?: any) {
    if (!this.enabled) return;
    const isInternal = this.isExecutingInternalDiagnostic || operation?.includes('benchmark') || details?.isInternal || collection?.includes('benchmark');
    if (isInternal) {
      this.internalWrites += count;
    } else {
      this.writes += count;
    }
    this.events.push({
      id: this.generateId(),
      type: isInternal ? 'INTERNAL_DIAGNOSTIC' as any : 'FIRESTORE_WRITE',
      name: `${isInternal ? 'INTERNAL_DIAG' : 'WRITE'} ${collection} [${operation}]`,
      startTime: performance.now() - durationMs,
      duration: durationMs,
      context,
      details: { collection, operation, count, isInternal, ...details },
      timestamp: new Date(),
      originStack: this.getOriginStack()
    });
  }

  public logStateChange(component: string, stateName: string, oldVal: any, newVal: any, reason?: string) {
    if (!this.enabled) return;
    this.events.push({
      id: this.generateId(),
      type: 'STATE_CHANGE',
      name: `STATE ${component}.${stateName}`,
      startTime: performance.now(),
      context: { component },
      details: { stateName, reason, oldVal: String(oldVal).substring(0, 50), newVal: String(newVal).substring(0, 50) },
      timestamp: new Date(),
      originStack: this.getOriginStack()
    });
  }

  public logGeminiCall(model: string, timeMs: number, details?: any) {
    if (!this.enabled) return;
    const isInternal = this.isExecutingInternalDiagnostic || model?.includes('benchmark') || details?.isInternal;
    if (isInternal) {
      this.internalGeminiCalls++;
    } else {
      this.geminiCalls++;
    }
    this.events.push({
      id: this.generateId(),
      type: isInternal ? 'INTERNAL_DIAGNOSTIC' as any : 'GEMINI_CALL',
      name: `${isInternal ? 'INTERNAL_DIAG' : 'GEMINI'} ${model}`,
      startTime: performance.now() - timeMs,
      duration: timeMs,
      details: { model, isInternal, ...details },
      timestamp: new Date(),
      originStack: this.getOriginStack()
    });
  }

  public logError(operation: string, error: any, durationMs: number, context?: TraceContext) {
    if (!this.enabled) return;
    this.errorsCount++;
    this.events.push({
      id: this.generateId(),
      type: 'ERROR',
      name: `ERROR [${operation}]`,
      startTime: performance.now() - durationMs,
      duration: durationMs,
      context,
      details: { operation, message: error instanceof Error ? error.message : String(error) },
      timestamp: new Date(),
      originStack: this.getOriginStack()
    });
  }

  public logRender(componentName: string, reason?: string, details?: any) {
    if (!this.enabled) return;
    this.renderCounts[componentName] = (this.renderCounts[componentName] || 0) + 1;
    this.events.push({
      id: this.generateId(),
      type: 'RENDER',
      name: `RENDER ${componentName}`,
      startTime: performance.now(),
      context: { component: componentName },
      details: { count: this.renderCounts[componentName], reason, ...details },
      timestamp: new Date()
    });
    this.analyzeEvents();
  }

  private analyzeEvents() {
    if (this.events.length < 5) return;
    
    // Auto-detect excessive renders
    const recentEvents = this.events.slice(-50);
    const renderStats: Record<string, number> = {};
    recentEvents.filter(e => e.type === 'RENDER').forEach(e => {
      const name = e.context?.component;
      if (name) {
        renderStats[name] = (renderStats[name] || 0) + 1;
        if (renderStats[name] > 15 && !this.suggestions.find(s => s.title.includes(name))) {
          this.suggestions.push({
            id: this.generateId(),
            level: 'critical',
            title: `Renderização Excessiva: ${name}`,
            cause: `O componente ${name} renderizou ${renderStats[name]} vezes rapidamente.`,
            suggestion: 'Consolidar estados relacionados, verificar se há atualizações fragmentadas ou usar React.memo.',
            timestamp: new Date()
          });
        }
      }
    });

    // Auto-detect multiple queries to same collection
    const recentReads = recentEvents.filter(e => e.type === 'FIRESTORE_READ');
    if (recentReads.length >= 3) {
      const colMap: Record<string, number> = {};
      recentReads.forEach(r => {
        const col = r.details?.collection;
        if (col) {
          colMap[col] = (colMap[col] || 0) + 1;
          if (colMap[col] >= 3 && !this.suggestions.find(s => s.title.includes(`Consultas Repetidas: ${col}`))) {
            this.suggestions.push({
              id: this.generateId(),
              level: 'high',
              title: `Consultas Repetidas: ${col}`,
              cause: `Múltiplas consultas consecutivas para a coleção ${col}.`,
              suggestion: 'Verifique se há useEffect executando múltiplas vezes ou implemente um cache para evitar buscas redundantes.',
              timestamp: new Date()
            });
          }
        }
      });
    }
  }

  public getTimeline() {
    return this.events.sort((a, b) => a.startTime - b.startTime);
  }

  public clear() {
    this.reads = 0;
    this.writes = 0;
    this.geminiCalls = 0;
    this.internalReads = 0;
    this.internalWrites = 0;
    this.internalGeminiCalls = 0;
    this.errorsCount = 0;
    this.renderCounts = {};
    this.events = [];
    this.suggestions = [];
    this.sessionStart = new Date();
  }
}

export const MetricTracker = new DiagnosticTracker();

if (typeof window !== 'undefined') {
  (window as any).__FirestoreMetrics__ = MetricTracker;
}
