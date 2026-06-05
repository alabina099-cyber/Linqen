// =============================================
// Structured Logger with Persistent Storage
// Remplace console.log par un système formalisé
// =============================================

import { pool } from "./db";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  source?: string;
}

class Logger {
  private buffer: LogEntry[] = [];
  private readonly BUFFER_LIMIT = 1000;
  private readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };
  private minLevel: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) || "info";

  private shouldLog(level: LogLevel): boolean {
    return this.LEVELS[level] >= this.LEVELS[this.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      source: context?.source,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.BUFFER_LIMIT) {
      this.buffer = this.buffer.slice(-this.BUFFER_LIMIT);
    }

    // Output to console with colors
    const icon = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌", fatal: "🔥" }[level];
    const log = level === "error" || level === "fatal" ? console.error :
                level === "warn" ? console.warn : console.log;
    log(`${icon} [${level.toUpperCase()}] ${message}`, context || "");

    // Persist errors to database (async, non-blocking)
    if (level === "error" || level === "fatal") {
      this.persistError(entry).catch(() => {});
    }
  }

  private async persistError(entry: LogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO error_logs (level, message, context, source, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [entry.level, entry.message, JSON.stringify(entry.context || {}), entry.source || null]
      );
    } catch {
      // Si la table n'existe pas, ignore silencieusement
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log("debug", message, context);
  }
  info(message: string, context?: Record<string, any>): void {
    this.log("info", message, context);
  }
  warn(message: string, context?: Record<string, any>): void {
    this.log("warn", message, context);
  }
  error(message: string, context?: Record<string, any>): void {
    this.log("error", message, context);
  }
  fatal(message: string, context?: Record<string, any>): void {
    this.log("fatal", message, context);
  }

  getRecent(limit = 100, level?: LogLevel): LogEntry[] {
    let logs = this.buffer;
    if (level) {
      logs = logs.filter((l) => this.LEVELS[l.level] >= this.LEVELS[level]);
    }
    return logs.slice(-limit);
  }

  getStats() {
    const counts: Record<LogLevel, number> = {
      debug: 0, info: 0, warn: 0, error: 0, fatal: 0,
    };
    for (const log of this.buffer) counts[log.level]++;
    return { total: this.buffer.length, byLevel: counts };
  }
}

export const logger = new Logger();
