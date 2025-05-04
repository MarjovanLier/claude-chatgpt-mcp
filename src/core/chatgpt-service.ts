import { runAppleScript } from 'run-applescript';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

export interface ChatGPTOptions {
  prompt: string;
  conversationId?: string;
  startNewChat?: boolean;
}

export class ChatGPTService {
  /**
   * Check if ChatGPT app is installed and running
   * @returns Promise<boolean> True if the app is accessible
   */
  public async checkAccess(): Promise<boolean> {
    try {
      logger.debug('Checking ChatGPT app access');
      const isRunning = await runAppleScript(`
        tell application "System Events"
          return application process "ChatGPT" exists
        end tell
      `);

      if (isRunning !== "true") {
        logger.info('ChatGPT app is not running, attempting to launch...');
        try {
          await runAppleScript(`
            tell application "ChatGPT" to activate
            delay 2
          `);
        } catch (activateError) {
          logger.error(`Error activating ChatGPT app: ${activateError}`);
          throw new Error(
            "Could not activate ChatGPT app. Please start it manually."
          );
        }
      }

      return true;
    } catch (error) {
      logger.error(`ChatGPT access check failed: ${error}`);
      throw new Error(
        `Cannot access ChatGPT app. Please make sure ChatGPT is installed and properly configured. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Safely encode text for AppleScript
   * @param text The text to encode
   * @returns Encoded text safe for AppleScript
   */
  private encodeForAppleScript(text: string): string {
    return text.replace(/"/g, '\\"');
  }

  /**
   * Save the current clipboard content
   * @returns Promise<string> The original clipboard content
   */
  private async saveClipboard(): Promise<string> {
    const saveClipboardScript = `
      set savedClipboard to the clipboard
      return savedClipboard
    `;
    return await runAppleScript(saveClipboardScript);
  }

  /**
   * Restore clipboard content
   * @param content The content to restore to clipboard
   */
  private async restoreClipboard(content: string): Promise<void> {
    const encodedContent = this.encodeForAppleScript(content);
    await runAppleScript(`set the clipboard to "${encodedContent}"`);
  }

  /**
   * Clean up ChatGPT response text
   * @param result The raw result from ChatGPT
   * @returns Cleaned up response
   */
  private cleanResponseText(result: string): string {
    // Post-process the result to clean up any UI text that might have been captured
    let cleanedResult = result
      .replace(/Regenerate( response)?/g, '')
      .replace(/Continue generating/g, '')
      .replace(/▍/g, '')
      .trim();
      
    // More context-aware incomplete response detection
    const isLikelyComplete = 
      cleanedResult.length > 50 || // Longer responses are likely complete
      cleanedResult.endsWith('.') || 
      cleanedResult.endsWith('!') || 
      cleanedResult.endsWith('?') ||
      cleanedResult.endsWith(':') ||
      cleanedResult.endsWith(')') ||
      cleanedResult.endsWith('}') ||
      cleanedResult.endsWith(']') ||
      cleanedResult.includes('\n\n') || // Multiple paragraphs suggest completeness
      /^[A-Z].*[.!?]$/.test(cleanedResult); // Complete sentence structure
      
    if (cleanedResult.length > 0 && !isLikelyComplete) {
      logger.warn("Warning: ChatGPT response may be incomplete");
    }
    
    return cleanedResult;
  }

  /**
   * Generate the AppleScript to interact with ChatGPT
   * @param options ChatGPT interaction options
   * @returns AppleScript code
   */
  private generateAppleScript(options: ChatGPTOptions): string {
    const { prompt, conversationId, startNewChat } = options;
    const encodedPrompt = this.encodeForAppleScript(prompt);
    
    // Check if this is a search operation
    const isSearchOperation = prompt.toLowerCase().includes("search the web");
    
    // Determine if we should start a new chat
    const shouldStartNewChat = startNewChat !== undefined 
      ? startNewChat 
      : (isSearchOperation && !conversationId);

    // Log the operation details
    const operationType = isSearchOperation ? "Web Search" : "Standard Ask";
    logger.info(`Operation type: ${operationType}`);
    
    if (shouldStartNewChat) {
      logger.info("Starting a new chat for this operation");
    }
    
    // Generate the AppleScript
    return `
      tell application "ChatGPT"
        activate
        delay ${config.initialDelay / 1000}
        tell application "System Events"
          tell process "ChatGPT"
            ${
              conversationId
                ? `
              try
                click button "${conversationId}" of group 1 of group 1 of window 1
                delay 1
              end try
            `
                : ""
            }
            ${
              shouldStartNewChat
                ? `
              -- Start a fresh chat
              try
                set foundNewChat to false
                -- Look for the New chat button by name
                set allButtons to buttons of front window
                repeat with btn in allButtons
                  try
                    if name of btn is "New chat" then
                      click btn
                      set foundNewChat to true
                      delay ${config.newChatDelay / 1000}
                      exit repeat
                    end if
                  end try
                end repeat
                
                -- If not found by name, try looking by description
                if not foundNewChat then
                  set allElements to entire contents of front window
                  repeat with elem in allElements
                    try
                      if description of elem is "New chat" then
                        click elem
                        delay ${config.newChatDelay / 1000}
                        exit repeat
                      end if
                    end try
                  end repeat
                end if
                
                delay ${config.newChatDelay / 1000}
              end try
            `
                : ""
            }
            -- Clear any existing text in the input field
            keystroke "a" using {command down}
            keystroke (ASCII character 8) -- Delete key
            delay 0.5
            
            -- Set the clipboard to the prompt text
            set the clipboard to "${encodedPrompt}"
            
            -- Paste the prompt and send it
            keystroke "v" using {command down}
            delay ${config.typingDelay / 1000}
            keystroke return
            
            -- Use appropriate timeout based on operation type
            set maxWaitTime to ${isSearchOperation ? config.searchTimeout / 1000 : config.standardTimeout / 1000}
            
            set waitInterval to ${config.checkInterval / 1000} -- Check interval in seconds
            set totalWaitTime to 0
            set previousText to ""
            set stableCount to 0
            set requiredStableChecks to ${config.stableChecks} -- Number of consecutive stable checks required
            
            -- For search operations, give a bit of initial time before starting to check
            if "${isSearchOperation}" is "true" then
              delay 3
              set totalWaitTime to totalWaitTime + 3
            end if
            
            repeat while totalWaitTime < maxWaitTime
              delay waitInterval
              set totalWaitTime to totalWaitTime + waitInterval
              
              -- Get current text and layout information from ChatGPT UI
              set frontWin to front window
              
              -- First, try to find the conversation container specifically
              set conversationContainer to {}
              set allGroups to {}
              
              tell application "System Events"
                tell process "ChatGPT"
                  -- Try to find conversation container by looking for a group that might contain it
                  try
                    -- Look for groups that might contain the conversation
                    set allGroups to groups of frontWin
                    
                    -- Look for a group with many static text elements (likely the conversation)
                    repeat with g in allGroups
                      try
                        set textElements to (get UI elements of g whose role is "AXStaticText")
                        if (count of textElements) > 3 then
                          -- Likely found the main conversation container
                          set conversationContainer to g
                          exit repeat
                        end if
                      end try
                    end repeat
                  end try
                end tell
              end tell
              
              -- If we couldn't find a specific container, fall back to the entire window
              if conversationContainer is {} then
                set allUIElements to entire contents of frontWin
              else
                set allUIElements to entire contents of conversationContainer
              end if
              
              -- Create a list to store UI elements with their positions
              set positionedElements to {}
              set conversationText to {}
              
              -- First pass: collect elements with position info where available
              repeat with e in allUIElements
                try
                  if (role of e) is "AXStaticText" then
                    set elementText to description of e
                    
                    -- Skip elements that are likely UI elements and not conversation
                    if elementText is not "New chat" and elementText does not contain "Regenerate" and elementText does not contain "Continue generating" then
                      -- First try to get the element's position (y coordinate is most important)
                      try
                        set elementPosition to position of e
                        set elementSize to size of e
                        
                        -- Element is valid if it has non-zero position and text, using standard AppleScript syntax
                        if elementText is not "" and (item 1 of elementPosition) > 0 and (item 2 of elementPosition) > 0 then
                          -- Store text with y-position (vertical) and x-position (horizontal)
                          set end of positionedElements to {text:elementText, ypos:(item 2 of elementPosition), xpos:(item 1 of elementPosition), height:(item 2 of elementSize), width:(item 1 of elementSize)}
                        end if
                      on error
                        -- If we can't get position, still include the text, but at the end
                        set end of conversationText to elementText
                      end try
                    end if
                  end if
                end try
              end repeat
              
              -- Sort the positioned elements by vertical position first, then horizontal
              -- This better preserves the visual reading order (top to bottom, left to right)
              set sortedElements to {}
              
              -- Use a simple insertion sort since AppleScript doesn't have built-in sorting
              repeat with i from 1 to count of positionedElements
                set thisElement to item i of positionedElements
                set thisYPos to ypos of thisElement
                set j to 1
                
                -- Find the right position to insert this element
                repeat while j ≤ count of sortedElements
                  if thisYPos < (ypos of (item j of sortedElements)) then
                    exit repeat
                  end if
                  set j to j + 1
                end repeat
                
                -- Insert element at position j
                if j > count of sortedElements then
                  set end of sortedElements to thisElement
                else
                  set sortedElements to (items 1 thru (j - 1) of sortedElements) & thisElement & (items j thru (count of sortedElements) of sortedElements)
                end if
              end repeat
              
              -- Extract just the text from the sorted elements
              set orderedTexts to {}
              repeat with e in sortedElements
                set end of orderedTexts to text of e
              end repeat
              
              -- Append any elements without position data at the end
              repeat with t in conversationText
                set end of orderedTexts to t
              end repeat
              
              -- Set the conversation text to our better ordered elements
              set conversationText to orderedTexts
              
              set AppleScript's text item delimiters to linefeed
              set currentText to conversationText as text
              
              -- Check if text has stabilized (not changing anymore)
              if currentText is equal to previousText then
                set stableCount to stableCount + 1
                if stableCount ≥ requiredStableChecks then
                  -- Text has been stable for multiple checks, assume response is complete
                  exit repeat
                end if
              else
                -- Text changed, reset stable count
                set stableCount to 0
                set previousText to currentText
              end if
              
              -- Enhanced search operation detection - check for more indicators
              set isStillProcessing to false
              
              -- Check for response completion indicators in text
              if currentText contains "▍" or currentText contains "Thinking" or currentText contains "Searching" or currentText contains "browsing" then
                -- ChatGPT is still processing (typing indicator or thinking/searching messages)
                set isStillProcessing to true
                set stableCount to 0
                log "Still processing (text indicators): " & totalWaitTime & "s"
              else if currentText contains "Regenerate" or currentText contains "Continue generating" then
                -- Response likely complete if these UI elements are visible
                set stableCount to stableCount + 1
                log "Completion indicator found, stable count: " & stableCount
              end if
              
              -- Look for spinning elements or progress indicators
              repeat with elem in allUIElements
                try
                  set elemRole to role of elem
                  set elemDesc to ""
                  try
                    set elemDesc to description of elem
                  end try
                  
                  -- Check for spinner, progress bar, or other processing indicators
                  if elemRole contains "progress" or elemDesc contains "loading" or elemDesc contains "thinking" or elemDesc contains "searching" then
                    set isStillProcessing to true
                    set stableCount to 0
                    log "Processing indicator found: " & elemDesc
                    exit repeat
                  end if
                end try
              end repeat
              
              -- For search operations, if we're still processing after a while, give more detailed feedback
              if isStillProcessing and "${isSearchOperation}" is "true" and totalWaitTime > 30 then
                -- Show a longer wait message for search operations
                log "Search operation in progress (" & totalWaitTime & "s). This may take several minutes with thinking models."
              end if
            end repeat
            
            -- Final check for text content and check for incomplete responses
            if (count of conversationText) = 0 then
              return "No response text found. ChatGPT may still be processing or encountered an error."
            else
              -- First check if the response seems incomplete
              set isIncomplete to false
              repeat with elem in allUIElements
                try
                  set elemRole to role of elem
                  set elemDesc to ""
                  try
                    set elemDesc to description of elem
                  end try
                  
                  -- Look for indicators that suggest response is still being generated
                  if elemRole contains "progress" or elemDesc contains "loading" or elemDesc contains "thinking" or elemDesc contains "searching" then
                    set isIncomplete to true
                    exit repeat
                  end if
                end try
              end repeat
              
              -- If search is still in progress and we haven't reached the timeout, indicate this
              if isIncomplete and "${isSearchOperation}" is "true" and totalWaitTime < maxWaitTime then
                return "ChatGPT is still searching the web for information. Please wait for the complete response."
              end if
              
              -- Extract just the latest response
              set responseText to ""
              try
                -- Attempt to find the latest response by looking for patterns
                set AppleScript's text item delimiters to linefeed
                set fullText to conversationText as text
                
                -- Look for the prompt in the text to find where the response starts
                set promptPattern to "${prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"
                if fullText contains promptPattern then
                  set promptPos to offset of promptPattern in fullText
                  if promptPos > 0 then
                    -- Get text after the prompt
                    set responseText to text from (promptPos + (length of promptPattern)) to end of fullText
                  end if
                end if
                
                -- If we couldn't find the prompt, return the full text
                if responseText is "" then
                  set responseText to fullText
                end if
                
                -- Warn if search might be incomplete
                if "${isSearchOperation}" is "true" and isIncomplete then
                  set responseText to responseText & "

Note: The search may still be in progress. This is a partial result."
                end if
                
                return responseText
              on error
                -- Fallback to returning all text if parsing fails
                return conversationText as text
              end try
            end if
          end tell
        end tell
      end tell
    `;
  }

  /**
   * Send a prompt to ChatGPT and get the response
   * @param options ChatGPT interaction options
   * @returns Promise<string> Response from ChatGPT
   */
  public async askChatGPT(options: ChatGPTOptions): Promise<string> {
    await this.checkAccess();
    
    try {
      logger.info(`Sending prompt to ChatGPT: "${options.prompt.substring(0, 50)}${options.prompt.length > 50 ? '...' : ''}"`);
      
      // Log operation details
      const isSearchOperation = options.prompt.toLowerCase().includes("search the web");
      logger.info(`Operation type: ${isSearchOperation ? "SEARCH" : "ASK"}, timeout: ${isSearchOperation ? config.searchTimeout / 1000 : config.standardTimeout / 1000} seconds`);
      
      // Save original clipboard content
      logger.debug('Saving clipboard content');
      const originalClipboard = await this.saveClipboard();
      const encodedOriginalClipboard = this.encodeForAppleScript(originalClipboard);
      
      // Generate and execute AppleScript
      logger.debug('Executing AppleScript...');
      const script = this.generateAppleScript(options);
      const result = await runAppleScript(script);
      
      // Restore original clipboard content
      logger.debug('Restoring clipboard content');
      await this.restoreClipboard(originalClipboard);
      
      // Clean and return result
      const cleanedResult = this.cleanResponseText(result);
      logger.info('ChatGPT response received successfully');
      
      return cleanedResult;
    } catch (error) {
      logger.error(`Error interacting with ChatGPT: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(
        `Failed to get response from ChatGPT: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get available conversations from ChatGPT
   * @returns Promise<string[]> List of conversation IDs/titles
   */
  public async getConversations(): Promise<string[]> {
    try {
      logger.info('Getting available conversations from ChatGPT');
      
      // Run AppleScript to get conversations from ChatGPT app
      const result = await runAppleScript(`
        tell application "ChatGPT"
          -- Check if ChatGPT is running
          if not (exists (processes where name is "ChatGPT")) then
            return "ChatGPT is not running"
          end if
          
          -- Activate ChatGPT and give it time to respond
          activate
          delay 1.5
          
          tell application "System Events"
            tell process "ChatGPT"
              -- Check if ChatGPT window exists
              if not (exists window 1) then
                return "No ChatGPT window found"
              end if
              
              -- Try to get conversation titles with multiple approaches
              set conversationsList to {}
              
              try
                -- First attempt: try buttons in group 1 of group 1
                if exists group 1 of group 1 of window 1 then
                  set chatButtons to buttons of group 1 of group 1 of window 1
                  repeat with chatButton in chatButtons
                    set buttonName to name of chatButton
                    if buttonName is not "New chat" then
                      set end of conversationsList to buttonName
                    end if
                  end repeat
                end if
                
                -- If we didn't find any conversations, try an alternative approach
                if (count of conversationsList) is 0 then
                  -- Try to find UI elements by accessibility description
                  set uiElements to UI elements of window 1
                  repeat with elem in uiElements
                    try
                      if exists (attribute "AXDescription" of elem) then
                        set elemDesc to value of attribute "AXDescription" of elem
                        if elemDesc is not "New chat" and elemDesc is not "" then
                          set end of conversationsList to elemDesc
                        end if
                      end if
                    end try
                  end repeat
                end if
                
                -- If still no conversations found, return a specific message
                if (count of conversationsList) is 0 then
                  return "No conversations found"
                end if
              on error errMsg
                -- Return error message for debugging
                return "Error: " & errMsg
              end try
              
              return conversationsList
            end tell
          end tell
        end tell
      `);

      // Parse the AppleScript result into an array
      if (result === "ChatGPT is not running") {
        logger.error("ChatGPT application is not running");
        throw new Error("ChatGPT application is not running");
      } else if (result === "No ChatGPT window found") {
        logger.error("No ChatGPT window found");
        throw new Error("No ChatGPT window found");
      } else if (result === "No conversations found") {
        logger.warn("No conversations found in ChatGPT");
        return []; // Return empty array instead of error message
      } else if (result.startsWith("Error:")) {
        logger.error(result);
        throw new Error(result);
      }
      
      const conversations = result.split(", ");
      logger.info(`Found ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      logger.error(`Error getting ChatGPT conversations: ${error}`);
      throw new Error("Error retrieving conversations: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Special search method with web browsing capability
   * This is a convenience wrapper around askChatGPT
   * @param query Search query
   * @param conversationId Optional conversation ID
   * @param startNewChat Whether to start a new chat
   * @returns Promise<string> Search results
   */
  public async search(query: string, conversationId?: string, startNewChat?: boolean): Promise<string> {
    // Create a search-specific prompt
    const searchPrompt = `Please search the web for information about: ${query}\n\nUse your web browsing capability to find the most up-to-date and relevant information. I need comprehensive results from searching the internet.`;
    
    logger.info(`Starting web search for: "${query}". This may take several minutes, especially with thinking models...`);
    logger.info(`Search timeouts set to ${config.searchTimeout / 1000} seconds to accommodate thinking models`);
    
    try {
      // For search operations, we default to starting a new chat unless explicitly specified
      const effectiveStartNewChat = startNewChat !== undefined ? startNewChat : !conversationId;
      
      const response = await this.askChatGPT({
        prompt: searchPrompt,
        conversationId,
        startNewChat: effectiveStartNewChat
      });
      
      // Check if response suggests incomplete search
      if (response.includes("still searching") || response.includes("still in progress")) {
        logger.warn("Search may still be in progress. Returning partial results.");
      } else {
        logger.info("Web search completed successfully");
      }
      
      return response;
    } catch (searchError) {
      logger.error(`Search operation failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`);
      throw new Error(`Search operation failed: ${searchError instanceof Error ? searchError.message : String(searchError)}. Note that search operations work best with the GPT-4o model and may fail with other models.`);
    }
  }
}

// Export a singleton instance for convenience
export const chatGPTService = new ChatGPTService();
export default chatGPTService;