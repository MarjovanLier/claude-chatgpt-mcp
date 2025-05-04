import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

// Load .env file from project root
dotenv.config();

// Default configuration values
const defaultConfig = {
  // Logging
  debug: false,
  logToFile: false,
  logFile: 'logs/chatgpt.log',
  logLevel: 'info',
  
  // Timeouts (in milliseconds)
  standardTimeout: 120000,  // 2 minutes
  searchTimeout: 600000,    // 10 minutes
  
  // UI Interaction
  initialDelay: 1000,
  newChatDelay: 1000,
  typingDelay: 500,
  
  // Response Detection
  stableChecks: 3,
  checkInterval: 1000,
};

// Process environment variables
export interface Config {
  debug: boolean;
  logToFile: boolean;
  logFile: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  standardTimeout: number;
  searchTimeout: number;
  initialDelay: number;
  newChatDelay: number;
  typingDelay: number;
  stableChecks: number;
  checkInterval: number;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', 'yes', '1'].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Create configuration from environment variables with fallbacks to defaults
export const config: Config = {
  debug: parseBoolean(process.env.DEBUG) || defaultConfig.debug,
  logToFile: parseBoolean(process.env.LOG_TO_FILE) || defaultConfig.logToFile,
  logFile: process.env.LOG_FILE || defaultConfig.logFile,
  logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || defaultConfig.logLevel,
  standardTimeout: parseNumber(process.env.STANDARD_TIMEOUT, defaultConfig.standardTimeout),
  searchTimeout: parseNumber(process.env.SEARCH_TIMEOUT, defaultConfig.searchTimeout),
  initialDelay: parseNumber(process.env.INITIAL_DELAY, defaultConfig.initialDelay),
  newChatDelay: parseNumber(process.env.NEW_CHAT_DELAY, defaultConfig.newChatDelay),
  typingDelay: parseNumber(process.env.TYPING_DELAY, defaultConfig.typingDelay),
  stableChecks: parseNumber(process.env.STABLE_CHECKS, defaultConfig.stableChecks),
  checkInterval: parseNumber(process.env.CHECK_INTERVAL, defaultConfig.checkInterval),
};

// Ensure log directory exists if logging to file
if (config.logToFile) {
  const logDir = resolve(process.cwd(), config.logFile.split('/').slice(0, -1).join('/'));
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export default config;