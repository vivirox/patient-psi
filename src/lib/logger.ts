import { monitoring, ErrorSeverity } from './monitoring';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  chatId?: string;
  component?: string;
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private buffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 1000;

  private constructor() {
    // Set minimum log level based on environment
    this.minLevel = (process.env.NODE_ENV === 'development')
      ? LogLevel.DEBUG
      : LogLevel.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(entry: LogEntry): string {
    const context = entry.context
      ? ` | ${JSON.stringify(entry.context)}`
      : '';
    
    const error = entry.error
      ? ` | ${entry.error.message}\n${entry.error.stack}`
      : '';

    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${context}${error}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };

    // Add to buffer
    this.buffer = [...this.buffer, entry].slice(-this.BUFFER_SIZE);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage(entry);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }

    // Send to monitoring service for ERROR level
    if (level === LogLevel.ERROR && error) {
      monitoring.logError(error, {
        severity: ErrorSeverity.HIGH,
        ...context,
      });
    }
  }

  public debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, error: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.buffer.slice(-count);
  }

  public clearBuffer() {
    this.buffer = [];
  }
}

export const logger = Logger.getInstance();
