# Claude-ChatGPT MCP Integration Improvements

This document summarizes the improvements made to the Claude-ChatGPT MCP (Model Context Protocol) integration, focusing on the search functionality and layout detection.

## Search Operation Improvements

1. **Automatic New Chat Creation**
   - Search operations now automatically create a new chat in ChatGPT for cleaner results
   - This prevents confusion with previous conversation content
   - Only applies when no specific conversation ID is provided
   - New `start_new_chat` parameter added to explicitly control this behavior
     - Default is `false` for backward compatibility 
     - Can be set to `true` to always start a new chat

2. **Enhanced Search Detection**
   - Added multiple indicators to detect when searches are still in progress:
     - Text indicators: "Thinking", "Searching", "browsing"
     - UI element attributes: progress bars, spinners, loading elements
     - Visual position detection and sorting
   - More detailed logging to show search progress

3. **Improved Error Handling**
   - Added try/catch block around search operations
   - Better error reporting with model compatibility information
   - Warning messages for partially complete search results

4. **Timeout Optimization**
   - Initial delay before checking for search results (allows search to start)
   - Increased timeouts for search operations (10 minutes vs 2 minutes for regular operations)
   - Dynamic wait time feedback in logs based on operation progress

## UI Text Extraction Improvements

1. **Conversation Container Detection**
   - Identifies the main conversation area in ChatGPT
   - Focuses text extraction on relevant content
   - Falls back to full window scan if container can't be identified

2. **Position-Based Sorting**
   - Sorts UI elements by their vertical (Y) position first
   - Preserves the natural reading order (top to bottom, left to right)
   - Handles elements with missing position data gracefully

3. **Completion Detection**
   - Multiple checks for stable content across consecutive polls
   - Checks for UI completion indicators like "Regenerate" buttons
   - More context-aware detection of complete vs incomplete responses

## Test Tools

1. **Standard Test Script (test.js)**
   - Supports both regular queries (--ask) and search queries (--search)
   - Directly interfaces with ChatGPT app outside the MCP
   - Useful for quick testing of basic functionality

2. **Search-Specific Testing (test_search.js)**
   - Dedicated script for testing search operations
   - Includes improved New Chat detection
   - Longer wait times for thinking models
   - Detailed output of text capture at different stages

## How to Test

1. **Building the Code**
   ```bash
   npm run build
   ```

2. **Testing Regular Queries**
   ```bash
   node test.js --ask "your question here"
   ```

3. **Testing Search Queries**
   ```bash
   node test.js --search "your search query"
   ```

4. **Testing Search with Dedicated Script**
   ```bash
   node test_search.js "your search query"
   ```

## Note for Users

When using the MCP integration:

1. Search operations work best with the GPT-4o model
2. Search operations with thinking models like o4-mini-high may take several minutes to complete
3. If the search seems incomplete, try running it again with a specific, focused query
4. After making code changes, restart the Claude desktop app to apply the changes