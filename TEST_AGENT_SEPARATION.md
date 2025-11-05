# Test Agent Separation

## Purpose
Verify that only ONE voice agent (public OR authenticated) is active at a time.

## Test Steps

### Test 1: Public Agent Only
1. Open the app WITHOUT logging in
2. Click "Try Voice Agent" on welcome page
3. Allow microphone access
4. **Expected in Console:**
   ```
   🆔 Hook instance created: [xxxxx]
   🚨 [xxxxx] CONNECT CALLED - Context: public, UserId: null
   🔒 [xxxxx] Registered as global active connection (Context: public)
   ```
5. Speak to the agent - you should hear ONE voice responding

### Test 2: Switching from Public to Authenticated
1. While public agent is active, CLOSE the modal
2. Log in to your account
3. Go to Dashboard → Click "Voice Consultation"
4. **Expected in Console:**
   ```
   🆔 Hook instance created: [yyyyy]
   🚨 [yyyyy] CONNECT CALLED - Context: authenticated, UserId: <your-user-id>
   ⚠️ [yyyyy] Closing previous global connection from [xxxxx] (Context: public)
   🔒 [yyyyy] Registered as global active connection (Context: authenticated)
   ```
5. Speak to the agent - you should hear ONE voice (the authenticated agent)

### Test 3: React StrictMode (Development)
In development, React may mount components twice. Watch for:
```
🆔 Hook instance created: [aaaaa]
🆔 Hook instance created: [bbbbb]
```
Even with two instances, only ONE should connect:
```
🔒 [bbbbb] Registered as global active connection (Context: public)
```

## What to Look For

### ✅ SUCCESS INDICATORS:
- Only ONE connection ID in logs at a time
- Only ONE voice speaking
- New connections automatically close old ones
- Clear `[instanceId]` tags in all logs

### ❌ FAILURE INDICATORS:
- Two different connection IDs active simultaneously
- Hearing two voices (echo or different voices)
- No "Closing previous global connection" message when switching

## Debugging

If you still hear two voices:
1. Check console for TWO different `[connectionId]` values in WebSocket logs
2. Look for MISSING "Closing previous global connection" warnings
3. Share the full console output with the assistant

## Note About Agent Voices

- **Public Agent**: Uses `ELEVENLABS_PUBLIC_AGENT_ID` 
  - Configure voice in ElevenLabs dashboard for this agent ID
- **Authenticated Agent**: Uses `ELEVENLABS_AUTHENTICATED_AGENT_ID`
  - Configure voice in ElevenLabs dashboard for this agent ID
- They should have DIFFERENT voices to easily distinguish them during testing

