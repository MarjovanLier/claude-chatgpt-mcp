import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chatGPTService } from './chatgpt-service.js';
import logger from '../utils/logger.js';

// Define the ChatGPT tool schema
export const CHATGPT_TOOL: Tool = {
  name: "chatgpt",
  description: "Interact with the ChatGPT desktop app on macOS",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform: 'ask', 'get_conversations', or 'search'",
        enum: ["ask", "get_conversations", "search"],
      },
      prompt: {
        type: "string",
        description:
          "The prompt to send to ChatGPT (required for ask and search operations)",
      },
      conversation_id: {
        type: "string",
        description:
          "Optional conversation ID to continue a specific conversation",
      },
      start_new_chat: {
        type: "boolean",
        description:
          "Whether to start a new chat before sending the prompt (default: false)",
      },
    },
    required: ["operation"],
  },
};

/**
 * Type guard for ChatGPT arguments
 */
function isChatGPTArgs(args: unknown): args is {
  operation: "ask" | "get_conversations" | "search";
  prompt?: string;
  conversation_id?: string;
  start_new_chat?: boolean;
} {
  if (typeof args !== "object" || args === null) return false;

  const { operation, prompt, conversation_id, start_new_chat } = args as any;

  if (!operation || !["ask", "get_conversations", "search"].includes(operation)) {
    return false;
  }

  // Validate required fields based on operation
  if ((operation === "ask" || operation === "search") && !prompt) return false;

  // Validate field types if present
  if (prompt && typeof prompt !== "string") return false;
  if (conversation_id && typeof conversation_id !== "string") return false;
  if (start_new_chat !== undefined && typeof start_new_chat !== "boolean") return false;

  return true;
}

/**
 * Create and configure the MCP server
 */
export class ChatGPTMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: "ChatGPT MCP Tool",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    
    this.configureRequestHandlers();
  }
  
  /**
   * Set up the MCP request handlers
   */
  private configureRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [CHATGPT_TOOL],
    }));
    
    // Handle tool invocation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error("No arguments provided");
        }

        if (name === "chatgpt") {
          if (!isChatGPTArgs(args)) {
            throw new Error("Invalid arguments for ChatGPT tool");
          }

          switch (args.operation) {
            case "ask": {
              if (!args.prompt) {
                throw new Error("Prompt is required for ask operation");
              }

              const response = await chatGPTService.askChatGPT({
                prompt: args.prompt,
                conversationId: args.conversation_id,
                startNewChat: args.start_new_chat
              });

              return {
                content: [
                  {
                    type: "text",
                    text: response || "No response received from ChatGPT.",
                  },
                ],
                isError: false,
              };
            }
            
            case "search": {
              if (!args.prompt) {
                throw new Error("Prompt is required for search operation");
              }

              const response = await chatGPTService.search(
                args.prompt,
                args.conversation_id,
                args.start_new_chat
              );
              
              return {
                content: [
                  {
                    type: "text",
                    text: response || "No search results received from ChatGPT.",
                  },
                ],
                isError: false,
              };
            }

            case "get_conversations": {
              const conversations = await chatGPTService.getConversations();

              return {
                content: [
                  {
                    type: "text",
                    text:
                      conversations.length > 0
                        ? `Found ${conversations.length} conversation(s):\n\n${conversations.join("\n")}`
                        : "No conversations found in ChatGPT.",
                  },
                ],
                isError: false,
              };
            }

            default:
              throw new Error(`Unknown operation: ${args.operation}`);
          }
        }

        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
      } catch (error) {
        logger.error(`MCP server error: ${error}`);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }
  
  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info("ChatGPT MCP Server running on stdio");
    } catch (error) {
      logger.error(`Failed to start MCP server: ${error}`);
      throw error;
    }
  }
}

export default ChatGPTMCPServer;