# Voice Agent Testing Guide

## Current Configuration

### Agents Configured:
- **PUBLIC Agent:** `agent_2201k97w3beafrst77er2w40ghdq` (Welcome page)
- **ADVISOR Agent:** `agent_9501k92pkwe3ep0tgjbnab2xbxcc` (Authenticated users)

---

## Testing Procedure

### Step 1: Test Welcome Page (Public Agent)

1. **Logout** (if logged in)
2. Go to welcome/landing page
3. Open browser console (F12)
4. Click voice agent button
5. **Check console logs for:**
   ```
   🔍 Debug: Context type: public
   🔍 Debug: IS PUBLIC: true
   🔍 Server confirmed context type: public
   📦 Response data: {context_type: "public", ...}
   ```
6. Speak to the agent
7. **Look for:**
   - `🎤 Sent X audio chunks` (confirms audio is being sent)
   - `🎤 Your speech: "..."` (confirms speech recognition)
   - `💬 Agent text response: "..."` (confirms agent is responding)
   - `🔊 Playing audio chunk` (confirms audio playback)

### Step 2: Test Dashboard (Advisor Agent)

1. **Login** to your account
2. Go to dashboard
3. Open browser console (F12)
4. Click voice agent button
5. **Check console logs for:**
   ```
   🔍 Debug: Context type: authenticated
   🔍 Debug: IS AUTHENTICATED: true
   🔍 Server confirmed context type: authenticated
   📦 Response data: {context_type: "authenticated", ...}
   ```
6. Speak to the agent
7. **Look for same indicators as above**

---

## Common Issues & Solutions

### Issue: Agent speaks greeting but doesn't respond to questions

**Symptom:**
- Hearing audio greeting
- Seeing `🎤 Sent X audio chunks`
- Only `ping` messages, no `agent_response`

**Possible Causes:**
1. **Agent not configured to listen** in ElevenLabs
2. **First message blocks conversation** - agent waits for you to respond to greeting
3. **Turn-taking settings too aggressive**

**Solution:**
1. Go to: https://elevenlabs.io/app/conversational-ai
2. For EACH agent:
   - Check "First Message" is **empty** or very short
   - Set "Turn timeout" to 25-30 seconds
   - Set "Silence end call timeout" to 30+ seconds
   - Make sure voice is selected and configured
   - Save changes

### Issue: Hearing "annoying voice"

This means the agent's voice isn't configured as desired in ElevenLabs.

**Solution:**
1. Go to agent in ElevenLabs
2. Click voice dropdown
3. Select different voice
4. Test in ElevenLabs dashboard first
5. Save agent
6. Refresh your app and try again

### Issue: Both agents sound the same

**Check:** Make sure you assigned DIFFERENT voices to each agent in ElevenLabs dashboard.

---

## Diagnostic Checklist

Run through this checklist if having issues:

### ElevenLabs Dashboard Checks:
- [ ] Public agent exists and has voice assigned
- [ ] Advisor agent exists and has voice assigned
- [ ] Both agents have different voices
- [ ] First message is empty or very short
- [ ] Turn timeout is 25+ seconds
- [ ] Silence timeout is 30+ seconds
- [ ] "Enable voice conversation" is ON
- [ ] Test each agent in ElevenLabs dashboard first

### Browser Console Checks:
- [ ] See correct `Context type` in logs
- [ ] See `🎤 Sent X audio chunks` when speaking
- [ ] See `🎤 Your speech: "..."` after speaking
- [ ] See `💬 Agent text response` 
- [ ] See `🔊 Playing audio chunk`
- [ ] No error messages in red

### Supabase Checks:
- [ ] Run: `supabase secrets list`
- [ ] Confirm both agent IDs are set and different
- [ ] Check edge function logs if available

---

## Expected Behavior

### Welcome Page (Public Agent):
- User clicks voice button
- Agent greets with friendly intro about Pranic Soil
- User asks questions about services
- Agent responds with information
- Encourages signup

### Dashboard (Advisor Agent):
- User clicks voice button
- Agent greets by name with professional tone
- Has access to user's profile data
- Provides personalized advice
- References user's specific situation

---

## If Still Not Working

1. **Check browser console for the detailed logs**
2. **Copy the full console output** starting from clicking the voice button
3. **Check specifically:**
   - What `context_type` is shown?
   - Are audio chunks being sent?
   - What messages are received from ElevenLabs?
   - Any error messages?

4. **Verify in ElevenLabs dashboard:**
   - Test EACH agent directly in ElevenLabs
   - Make sure they work there first
   - Check all settings match recommendations above

5. **Share console logs** for further diagnosis

