import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Define log levels and their numeric values
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private logLevel: number;
  private logToFile: boolean;
  private logFile: string | null;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    this.logLevel = LOG_LEVELS[config.logLevel as keyof typeof LOG_LEVELS];
    this.logToFile = config.logToFile;
    this.logFile = this.logToFile ? path.resolve(process.cwd(), config.logFile) : null;
    
    // Initialize log file stream if logging to file
    if (this.logToFile && this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private writeLog(level: string, message: string): void {
    const formattedMessage = this.formatMessage(level, message);
    
    if (this.logToFile && this.logStream) {
      this.logStream.write(formattedMessage + '\n');
    } else {
      // Use appropriate console method based on level
      switch (level) {
        case 'debug':
          if (config.debug) console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
  }

  public debug(message: string): void {
    if (this.logLevel <= LOG_LEVELS.debug) {
      this.writeLog('debug', message);
    }
  }

  public info(message: string): void {
    if (this.logLevel <= LOG_LEVELS.info) {
      this.writeLog('info', message);
    }
  }

  public warn(message: string): void {
    if (this.logLevel <= LOG_LEVELS.warn) {
      this.writeLog('warn', message);
    }
  }

  public error(message: string | Error): void {
    if (this.logLevel <= LOG_LEVELS.error) {
      if (message instanceof Error) {
        this.writeLog('error', `${message.message}\n${message.stack}`);
      } else {
        this.writeLog('error', message);
      }
    }
  }

  // Close the log stream when the application is shutting down
  public close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Create and export a singleton logger instance
const logger = new Logger();

// Handle process termination to properly close log files
process.on('exit', () => {
  logger.close();
});

process.on('SIGINT', () => {
  logger.close();
  process.exit(0);
});

export default logger;