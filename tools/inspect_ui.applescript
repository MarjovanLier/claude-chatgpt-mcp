#!/usr/bin/osascript

-- Script to inspect UI elements of the ChatGPT app
tell application "ChatGPT" to activate
delay 1

set allElements to {}
set outputString to ""

tell application "System Events"
  tell process "ChatGPT"
    -- Get the front window
    set frontWin to front window
    
    -- Get all UI elements
    set allUIElements to entire contents of frontWin
    
    -- Helper function to get a property safely
    to getProperty(theObject, propertyName)
      try
        return value of attribute propertyName of theObject
      on error
        try
          return value of property propertyName of theObject
        on error
          return "N/A"
        end try
      end try
    end getProperty
    
    -- Process each element
    set elementCount to 0
    set outputString to "ChatGPT UI Elements:" & return & return
    
    repeat with e in allUIElements
      try
        set elementCount to elementCount + 1
        set elementInfo to "Element " & elementCount & ":" & return
        
        -- Get basic properties
        set elementRole to my getProperty(e, "AXRole")
        set elementDesc to "N/A"
        try
          set elementDesc to description of e
        end try
        
        set elementPosition to {0, 0}
        try
          set elementPosition to position of e
        end try
        
        set elementSize to {0, 0}
        try
          set elementSize to size of e
        end try
        
        -- Build the output string
        set elementInfo to elementInfo & "  Role: " & elementRole & return
        set elementInfo to elementInfo & "  Description: " & elementDesc & return
        set elementInfo to elementInfo & "  Position: " & item 1 of elementPosition & ", " & item 2 of elementPosition & return
        set elementInfo to elementInfo & "  Size: " & item 1 of elementSize & " x " & item 2 of elementSize & return
        
        -- Get other properties if available
        set otherProps to ""
        try
          set otherProps to otherProps & "  Title: " & title of e & return
        end try
        try
          set otherProps to otherProps & "  Value: " & value of e & return
        end try
        try
          set otherProps to otherProps & "  Identifier: " & identifier of e & return
        end try
        try
          set otherProps to otherProps & "  Class: " & class of e & return
        end try
        
        -- Add the other properties to the output
        set elementInfo to elementInfo & otherProps & return
        
        -- Add this element info to the overall output
        set outputString to outputString & elementInfo
      end try
    end repeat
    
    -- Add a summary
    set outputString to outputString & return & "Total Elements: " & elementCount & return
    
    -- Look specifically for text elements that might contain conversations
    set outputString to outputString & return & "TEXT ELEMENTS ONLY:" & return & return
    set textCount to 0
    
    repeat with e in allUIElements
      try
        if role of e is "AXStaticText" then
          set textCount to textCount + 1
          set textInfo to "Text " & textCount & ":" & return
          set textInfo to textInfo & "  Content: " & description of e & return
          
          try
            set elementPosition to position of e
            set textInfo to textInfo & "  Position: " & item 1 of elementPosition & ", " & item 2 of elementPosition & return
          end try
          
          set outputString to outputString & textInfo & return
        end if
      end try
    end repeat
    
    -- Add specific check for progress indicators or spinners
    set outputString to outputString & return & "PROGRESS INDICATORS:" & return & return
    set progressCount to 0
    
    repeat with e in allUIElements
      try
        set elemRole to role of e
        if elemRole contains "progress" or elemRole contains "busy" then
          set progressCount to progressCount + 1
          set progressInfo to "Progress " & progressCount & ":" & return
          set progressInfo to progressInfo & "  Role: " & elemRole & return
          try
            set progressInfo to progressInfo & "  Description: " & description of e & return
          end try
          set outputString to outputString & progressInfo & return
        end if
      end try
    end repeat
    
    if progressCount is 0 then
      set outputString to outputString & "No progress indicators found." & return
    end if
    
    return outputString
  end tell
end tell