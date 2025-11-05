# Quick Debug Guide - Voice Agent Disconnecting

## ✅ What's Working Now
- Connection to Supabase ✅
- Edge function deployed ✅
- ElevenLabs API credentials valid ✅
- WebSocket connects ✅

## ❌ Current Issue
The voice agent screen appears but disappears before you can speak.

## 🔍 Debug Steps

### Step 1: Check Browser Console (F12)

When you try the voice agent, look for these messages:

**Good signs:**
```
✅ Debug: Got response from edge function
WebSocket connected to ElevenLabs
🟢 Connected! Agent is ready
```

**What to look for:**
```
⚠️ Conversation ended by ElevenLabs: {reason: "timeout"}
🔌 WebSocket closed
🔌 Close code: 1000 (or other)
🔌 Close reason: ...
```

The close reason and any "conversation_ended" messages will tell us why it's disconnecting.

### Step 2: Adjust ElevenLabs Agent Settings

The most common cause is aggressive timeout settings.

**Go to:** https://elevenlabs.io/app/conversational-ai

**Edit your agent:** `agent_9501k92pkwe3ep0tgjbnab2xbxcc`

**Change these settings:**

1. **Response Timeout:** Increase to 10-15 seconds
2. **Responsiveness:** Set to "Moderate" (not "Very Eager")
3. **Turn Taking:** Set to "Relaxed"
4. **End of Speech Detection:** Increase to 2000ms
5. **Interruption:** Set to "Low" or "Off"

See `ELEVENLABS_AGENT_CONFIG.md` for detailed instructions.

### Step 3: Test Again with Logging

1. Open browser console (F12)
2. Start voice agent
3. Watch the console messages
4. Wait 2 seconds after seeing "Listening..."
5. Then speak clearly

**Share these console messages if still having issues:**
- Any "conversation_ended" messages
- The WebSocket close code and reason
- Any error messages

## Common Scenarios

### Scenario 1: Sees "timeout" in console
**Fix:** Increase "Response Timeout" in ElevenLabs agent settings

### Scenario 2: Closes immediately with code 1000
**Fix:** Agent thinks conversation is over - adjust "Turn Taking" to "Relaxed"

### Scenario 3: Closes with code 1006
**Fix:** Network issue or agent configuration problem

### Scenario 4: See "conversation_ended" message
**Fix:** Agent is ending conversation too quickly - increase timeouts

## WebSocket Close Codes Reference

| Code | Meaning | Solution |
|------|---------|----------|
| 1000 | Normal closure | Agent ended conversation - adjust timeout settings |
| 1006 | Abnormal closure | Network issue or server-side problem |
| 1011 | Server error | ElevenLabs agent configuration issue |

## Next Steps

1. **Try the voice agent again** with browser console open
2. **Copy the console output** showing the disconnect
3. **Go to ElevenLabs** and adjust the timeout/eagerness settings
4. **Test again** and monitor console

**The enhanced logging will now show you exactly why it's disconnecting!** 📊

