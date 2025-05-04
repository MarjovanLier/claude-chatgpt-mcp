# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands
- Build: `npm run build` (TypeScript compilation)
- Dev: `bun run index.ts` (Run with Bun)
- Start: `node dist/index.js` (Run built version)
- Prepare: `npm run prepare` (Runs build)

## Code Style Guidelines
- TypeScript with strict type checking
- ES modules with NodeNext module resolution
- Error handling with detailed error messages and contextual info
- Function documentation using descriptive comments
- Async/await for asynchronous operations
- Clean error propagation with proper error types

## Naming Conventions
- camelCase for variables and functions
- PascalCase for types and interfaces
- Descriptive function names that indicate purpose

## Architecture Notes
- MCP server using ModelContextProtocol SDK
- AppleScript execution through JXA (JavaScript for Automation)
- Error handling should include specific context information
- UI interaction with ChatGPT desktop app requires robust error handling

## Known Limitations
- Works successfully with the GPT-4o model
- Fixed sorting of UI elements based on visual position (added in May 2025)
- The previous issue with o4-mini-high model returning jumbled content has been addressed
- The AppleScript now looks for the conversation container and sorts text elements by their vertical position
- Response detection should now work with different ChatGPT UI layouts
- Enhanced search processing detection for thinking models like o4-mini-high
- Added indicators when search operations are still in progress
- Search operations now automatically start a new chat for cleaner results

## Important Usage Notes
- After making code changes, the Claude desktop app must be restarted to apply changes
- The ChatGPT MCP server is loaded when Claude starts and doesn't hot-reload code changes
- To test new features, build the code with `npm run build` and then restart Claude
- The `/search` command is available to search the web using ChatGPT's browsing capability
- Search operations with thinking models like o4-mini-high may take several minutes to complete
- Increased timeout (10 minutes) for search operations vs regular operations (2 minutes)
- Improved error handling for search operations, with better feedback on in-progress searches
- New `start_new_chat` parameter for both ask and search operations (defaults to false)
  - For search operations without a conversation_id, new chats are automatically created
  - You can explicitly set `start_new_chat: true` to always start a new chat
- For direct testing, use the included test scripts:
  - Regular queries: `node test.js --ask "question"`
  - Search queries: `node test.js --search "query"` 
  - Dedicated search testing: `node test_search.js "query"`