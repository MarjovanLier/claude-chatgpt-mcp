# ChatGPT MCP Tool Usage Guide

This MCP (Model Context Protocol) tool allows Claude to interact with the ChatGPT desktop app on macOS.

## Quick Reference

When using Claude Code, you can access ChatGPT functionality via the `mcp__ask-chatgpt__chatgpt` tool with the following operations:

- `ask`: Send a prompt to ChatGPT and get a response
- `search`: Use ChatGPT's web browsing capability to search for information
- `get_conversations`: List available conversations in ChatGPT

## Basic Usage Examples

### Regular Ask Operation

```typescript
// Example of using the ask operation
{
  "operation": "ask",
  "prompt": "Explain quantum computing in simple terms"
}
```

### Web Search Operation

```typescript
// Example of using the search operation
{
  "operation": "search",
  "prompt": "latest developments in fusion energy research"
}
```

### Getting Available Conversations

```typescript
// Example of listing available conversations
{
  "operation": "get_conversations"
}
```

## Advanced Options

### Continue Existing Conversation

To continue an existing conversation, provide its ID:

```typescript
{
  "operation": "ask",
  "prompt": "Tell me more about that",
  "conversation_id": "conversation-title-here"
}
```

### Explicitly Start a New Chat

You can explicitly control whether to start a new chat:

```typescript
{
  "operation": "ask",
  "prompt": "What is machine learning?",
  "start_new_chat": true
}
```

## Important Notes

1. **Default Behavior**: By default, `start_new_chat` is `false` for backward compatibility.

2. **Search Operations**: For search operations without a conversation_id, new chats are automatically created unless you explicitly set `start_new_chat: false`.

3. **Timeouts**:
   - Regular operations: 2 minutes
   - Search operations: 10 minutes (to accommodate thinking models)

4. **Model Compatibility**:
   - Works best with the GPT-4o model
   - Search operations with thinking models like o4-mini-high may take several minutes

## Troubleshooting

### Common Issues

If the MCP fails to respond:

1. Make sure the ChatGPT desktop app is running
2. Restart Claude to reload the MCP server
3. Check if your ChatGPT account has access to browsing (for search operations)
4. Try with a more specific, focused query

### JSON Parsing Errors

You may see errors like:
```
MCP server "ask-chatgpt" SyntaxError: Unexpected token 'O', "Operation "... is not valid JSON
```
or
```
MCP server "ask-chatgpt" SyntaxError: Unexpected token 'S', "Starting w"... is not valid JSON
```

**Don't worry!** These errors happen because console log messages are being mixed with the response data. The MCP is still working correctly:

1. Your message is still being sent to ChatGPT
2. The response is still being received
3. The errors are just noise in the communication channel

This is a known issue with the current implementation and doesn't affect the actual functionality.

## Example Claude Code Usage

Here's how to use this MCP from Claude Code:

```python
# Example: Ask ChatGPT a question
response = mcp__ask-chatgpt__chatgpt(
    operation="ask",
    prompt="What are the main features of TypeScript?",
    start_new_chat=True
)

# Example: Search the web with ChatGPT
search_results = mcp__ask-chatgpt__chatgpt(
    operation="search",
    prompt="latest research on large language models",
)

# Example: Get list of available conversations
conversations = mcp__ask-chatgpt__chatgpt(
    operation="get_conversations"
)
```

Remember that search operations may take several minutes to complete, especially with thinking models like o4-mini-high.