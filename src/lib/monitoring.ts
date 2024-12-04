import { env } from './env';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface ErrorContext {
  userId?: string;
  chatId?: string;
  url?: string;
  component?: string;
  additionalData?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

class Monitoring {
  private static instance: Monitoring;
  private isInitialized = false;
  private buffer: Array<{ type: string; data: any }> = [];
  private BUFFER_SIZE = 100;
  private FLUSH_INTERVAL = 10000; // 10 seconds

  private constructor() {
    // Set up periodic buffer flush
    setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL);

    // Listen for unhandled errors and rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError(event.error, { severity: ErrorSeverity.HIGH });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError(event.reason, { severity: ErrorSeverity.HIGH });
      });
    }
  }

  public static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      Monitoring.instance = new Monitoring();
    }
    return Monitoring.instance;
  }

  public initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      // Monitor page load performance
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        this.logPerformanceMetric({
          name: 'page_load',
          value: navigation.loadEventEnd - navigation.startTime,
        });
      });

      // Monitor long tasks
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.logPerformanceMetric({
              name: 'long_task',
              value: entry.duration,
              tags: {
                entryType: entry.entryType,
                name: entry.name,
              },
            });
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  public logError(error: Error, context: ErrorContext & { severity?: ErrorSeverity } = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      severity: context.severity || ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.addToBuffer('error', errorData);

    // Immediately flush for high-severity errors
    if (
      errorData.severity === ErrorSeverity.HIGH ||
      errorData.severity === ErrorSeverity.CRITICAL
    ) {
      this.flushBuffer();
    }
  }

  public logPerformanceMetric(metric: PerformanceMetric) {
    const metricData = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.addToBuffer('metric', metricData);
  }

  public logEvent(
    eventName: string,
    data: Record<string, any> = {},
    userId?: string
  ) {
    const eventData = {
      name: eventName,
      data,
      userId,
      timestamp: new Date().toISOString(),
    };

    this.addToBuffer('event', eventData);
  }

  private addToBuffer(type: string, data: any) {
    this.buffer.push({ type, data });

    if (this.buffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;

    const dataToSend = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to send monitoring data');
      }
    } catch (error) {
      console.error('Error sending monitoring data:', error);
      // Add failed items back to the buffer
      this.buffer = [...dataToSend, ...this.buffer].slice(-this.BUFFER_SIZE);
    }
  }
}

export const monitoring = Monitoring.getInstance();
