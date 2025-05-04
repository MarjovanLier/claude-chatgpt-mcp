#!/usr/bin/env node
import { chatGPTService } from '../core/chatgpt-service.js';
import logger from '../utils/logger.js';

/**
 * Test script specifically for ChatGPT search functionality
 * Performs a more detailed search test with progress reporting
 */
async function testSearch(searchQuery: string) {
  try {
    logger.info(`Starting detailed search test for: "${searchQuery}"`);
    
    // Check ChatGPT access
    await chatGPTService.checkAccess();
    
    // Always start a new chat for cleaner search results
    const startNewChat = true;
    logger.info('Creating a new chat for clean search results');
    
    // Send the search query
    logger.info('Sending search query to ChatGPT...');
    const searchPromise = chatGPTService.search(searchQuery, undefined, startNewChat);
    
    // Set up progress reporting
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      logger.info(`Search in progress... (${elapsedSeconds}s elapsed)`);
    }, 15000); // Report progress every 15 seconds
    
    // Wait for search to complete
    const result = await searchPromise;
    
    // Stop progress reporting
    clearInterval(progressInterval);
    
    // Calculate total time
    const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
    logger.info(`Search completed in ${totalSeconds} seconds`);
    
    // Display the result
    console.log('\n===== SEARCH RESULTS =====\n');
    console.log(result);
    
    // Check for indicators of incomplete search
    if (result.includes('still in progress') || result.includes('still searching')) {
      logger.warn('Search may not be complete. Results may be partial.');
    } else {
      logger.info('Search appears to be complete.');
    }
    
  } catch (error) {
    logger.error(`Error during search test: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run the test with command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx ts-node src/scripts/test_search.ts "your search query"');
  process.exit(1);
}

const searchQuery = args.join(' ');
testSearch(searchQuery);