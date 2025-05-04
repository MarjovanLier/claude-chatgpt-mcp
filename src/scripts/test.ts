#!/usr/bin/env node
import { chatGPTService } from '../core/chatgpt-service.js';
import logger from '../utils/logger.js';

/**
 * Test script for ChatGPT interaction
 * Allows direct command-line testing of the ChatGPT service
 */
async function runTest() {
  try {
    const args = process.argv.slice(2);
    
    // Display help if no arguments or help flag
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      console.log(`
ChatGPT Test Script
===================

Usage:
  npx ts-node src/scripts/test.ts --ask "your question here"
  npx ts-node src/scripts/test.ts --search "your search query here"
  npx ts-node src/scripts/test.ts --conversations

Options:
  --ask "question"      Send a question to ChatGPT
  --search "query"      Search the web with ChatGPT
  --conversations       List available conversations
  --conversation-id ID  Use a specific conversation
  --new-chat            Start a new chat
  --help, -h            Show this help message
      `);
      return;
    }
    
    // Get conversation ID if specified
    let conversationId: string | undefined;
    const conversationIdIndex = args.indexOf('--conversation-id');
    if (conversationIdIndex >= 0 && conversationIdIndex < args.length - 1) {
      conversationId = args[conversationIdIndex + 1];
      logger.info(`Using conversation ID: ${conversationId}`);
    }
    
    // Check if --new-chat flag is present
    const startNewChat = args.includes('--new-chat');
    if (startNewChat) {
      logger.info('Starting a new chat');
    }
    
    // Process conversations operation
    if (args.includes('--conversations')) {
      logger.info('Getting conversations...');
      const conversations = await chatGPTService.getConversations();
      
      console.log('\n===== CONVERSATIONS =====\n');
      if (conversations.length === 0) {
        console.log('No conversations found.');
      } else {
        conversations.forEach((conversation: string, index: number) => {
          console.log(`${index + 1}. ${conversation}`);
        });
      }
      return;
    }
    
    // Process ask operation
    if (args.includes('--ask')) {
      const index = args.indexOf('--ask');
      if (index < args.length - 1) {
        const prompt = args[index + 1];
        logger.info(`Asking ChatGPT: "${prompt}"`);
        
        const response = await chatGPTService.askChatGPT({
          prompt,
          conversationId,
          startNewChat
        });
        
        console.log('\n===== CHATGPT RESPONSE =====\n');
        console.log(response);
      } else {
        console.error('Error: No question provided after --ask');
      }
      return;
    }
    
    // Process search operation
    if (args.includes('--search')) {
      const index = args.indexOf('--search');
      if (index < args.length - 1) {
        const query = args[index + 1];
        logger.info(`Searching with ChatGPT: "${query}"`);
        
        const response = await chatGPTService.search(query, conversationId, startNewChat);
        
        console.log('\n===== SEARCH RESULTS =====\n');
        console.log(response);
      } else {
        console.error('Error: No search query provided after --search');
      }
      return;
    }
    
    // If we reach here, no valid operation was specified
    console.error('Error: No valid operation specified. Use --ask, --search, or --conversations');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();