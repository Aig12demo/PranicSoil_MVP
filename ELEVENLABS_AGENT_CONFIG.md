# Fix ElevenLabs Agent Configuration

## Problem
The voice agent connects successfully but disconnects too quickly before you can speak. This is caused by aggressive timeout and eagerness settings in your ElevenLabs agent configuration.

## Solution: Adjust Agent Settings in ElevenLabs Dashboard

### Step 1: Open Your Agent Settings

1. Go to: https://elevenlabs.io/app/conversational-ai
2. Select your agent: `agent_9501k92pkwe3ep0tgjbnab2xbxcc`
3. Click **"Edit"** or **"Settings"**

### Step 2: Adjust Conversation Settings

Look for these settings and adjust them:

#### **Timeout Settings (Critical!)**

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| **Response Timeout** | 8-10 seconds | How long the agent waits for a response before timing out |
| **End of Turn Detection** | Moderate or Relaxed | How quickly it detects you've stopped speaking |
| **Turn Timeout** | 3000-5000ms | Milliseconds before it assumes you're done talking |

#### **Eagerness Settings**

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| **Interruption Eagerness** | Low or Off | How easily it interrupts itself |
| **Response Eagerness** | Moderate | How quickly it responds after silence |

### Step 3: Specific Recommended Settings

For a **web-based conversational AI** (like your app), use these settings:

```yaml
Conversation Settings:
  - Responsiveness: Moderate (not "Very Eager")
  - Turn Taking: Moderate or Relaxed
  - End of Speech Detection: 1500-2000ms (not too fast)
  - Silence Timeout: 8-10 seconds (not 3-5 seconds)
  - Allow Interruptions: Off or Low
  - First Message: Optional greeting or empty
```

### Step 4: Test Settings

**Testing Flow:**
1. Save your agent settings
2. Go back to your app
3. Click the voice agent button
4. Wait for "Connected! Agent is ready"
5. **Pause for 1-2 seconds** after seeing "Listening..."
6. Then start speaking clearly

## Common Issues & Fixes

### Issue: Agent disconnects immediately
**Fix:** Increase "Silence Timeout" to 10+ seconds

### Issue: Agent interrupts you while speaking
**Fix:** 
- Set "Interruption Eagerness" to Low or Off
- Increase "End of Speech Detection" to 2000ms+

### Issue: Agent responds before you finish
**Fix:** Set "Turn Taking" to "Relaxed"

### Issue: Long delay before agent responds
**Fix:** This is normal - reduce "End of Speech Detection" to 1000-1500ms

## Optimal Settings for Your Use Case

Based on your scenario (web app with gardeners, farmers, ranchers):

```yaml
Agent Configuration:
  Name: Pranic Soil Agricultural Advisor
  
  Conversation Style:
    - Response Style: Helpful and conversational
    - Tone: Friendly, knowledgeable
    - Length: Concise (2-3 sentences per turn)
  
  Technical Settings:
    - Responsiveness: Moderate
    - Turn Timeout: 4000ms
    - Silence Timeout: 10000ms (10 seconds)
    - Interruption: Low
    - End of Speech Detection: 1800ms
    
  Voice Settings:
    - Use a clear, professional voice
    - Speed: 1.0x (normal)
    - Stability: 0.5-0.7 (balanced)
```

## Alternative: Send Initial Context

You can also add an initial system message to tell the agent to wait. Update the conversation context in the edge function if needed.

## After Adjusting Settings

1. **Save** your agent configuration in ElevenLabs
2. **No need to redeploy** - agent changes are immediate
3. **Test again** in your app
4. **Speak clearly** and at normal pace
5. **Wait for visual feedback** before speaking

---

## If Still Having Issues

Add logging to see what's happening:

```javascript
// Already added in your code - check browser console for:
- "WebSocket connected to ElevenLabs"
- "ElevenLabs message: {type: ...}"
- Any disconnect messages
```

If you see `{type: 'conversation.ended'}` or similar messages, it means the agent is timing out.

---

**Next:** Go to https://elevenlabs.io/app/conversational-ai, edit your agent, and adjust the timeout/eagerness settings!

