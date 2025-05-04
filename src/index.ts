#!/usr/bin/env node
import { ChatGPTMCPServer } from './core/mcp-server.js';
import logger from './utils/logger.js';
import config from './utils/config.js';

/**
 * Main application entry point
 */
async function main() {
  try {
    // Log configuration information
    logger.info('Starting ChatGPT MCP Server');
    logger.debug(`Configuration: Debug mode: ${config.debug}, Log level: ${config.logLevel}`);
    
    // Create and start the server
    const mcpServer = new ChatGPTMCPServer();
    await mcpServer.start();
  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

// Start the application
main();