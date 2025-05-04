#!/usr/bin/osascript

tell application "ChatGPT" to activate
delay 1

set textOutput to ""
set progressOutput to ""

tell application "System Events"
  tell process "ChatGPT"
    -- Get the front window
    set frontWin to front window
    
    -- Get all UI elements
    set allUIElements to entire contents of frontWin
    
    -- Text elements
    set textElements to {}
    repeat with e in allUIElements
      try
        if role of e is "AXStaticText" then
          set end of textElements to {text:description of e, pos:position of e}
        end if
      end try
    end repeat
    
    -- Progress indicators
    set progressElements to {}
    repeat with e in allUIElements
      try
        set elemRole to role of e
        set elemDesc to ""
        try
          set elemDesc to description of e
        end try
        
        if elemRole contains "progress" or elemRole contains "busy" or elemDesc contains "processing" or elemDesc contains "thinking" or elemDesc contains "searching" then
          set end of progressElements to {role:elemRole, desc:elemDesc}
        end if
      end try
    end repeat
    
    -- Format text output
    set textOutput to "TEXT ELEMENTS (" & (count of textElements) & "):" & return & return
    repeat with i from 1 to count of textElements
      set t to item i of textElements
      set textOutput to textOutput & i & ". " & text of t & return
      try
        set textOutput to textOutput & "   Position: " & item 1 of (pos of t) & ", " & item 2 of (pos of t) & return
      end try
      set textOutput to textOutput & return
    end repeat
    
    -- Format progress output
    set progressOutput to "PROGRESS INDICATORS (" & (count of progressElements) & "):" & return & return
    if (count of progressElements) > 0 then
      repeat with i from 1 to count of progressElements
        set p to item i of progressElements
        set progressOutput to progressOutput & i & ". Role: " & role of p & return
        set progressOutput to progressOutput & "   Description: " & desc of p & return & return
      end repeat
    else
      set progressOutput to progressOutput & "No progress indicators found." & return
    end if
    
    return textOutput & return & progressOutput
  end tell
end tell