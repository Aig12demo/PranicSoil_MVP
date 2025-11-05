# Debug: Two ElevenLabs Agents Speaking

## User Report
From welcome page, hearing TWO voices:
1. **Voice 1:** "Hello there"
2. **Voice 2:** "Hi, my name is Rajani"

Both are ElevenLabs voices (not Web Speech API).

## Analysis

### Agent IDs in Supabase:
```
ELEVENLABS_PUBLIC_AGENT_ID        = 381176bd72a856286796ce309c4f64ecbd251dd8511891691b7ae614f977b5f8
ELEVENLABS_AUTHENTICATED_AGENT_ID = aab6e8c913184bddf720c07b8420bfaafe1d5f23d88020d5b54ac772381fb04f
```

### Hypothesis
Since both agents are speaking with different introductions, this means:
- Two separate WebSocket connections to ElevenLabs are being established
- Each connection is using a different agent ID
- The connection lock is NOT preventing the race condition

## Debugging Steps

Need to check console logs for:
1. How many times `🚨 CONNECT CALLED` appears
2. How many times `🔐 ACQUIRED CONNECTION LOCK` appears
3. How many times `🔗 Creating WebSocket connection` appears
4. Whether `🚫 BLOCKED` ever appears

## Possible Causes

### 1. React StrictMode Double Mount
Even with random delay, both might still connect if:
- Delay isn't long enough
- Lock isn't being checked properly

### 2. Multiple VoiceAgent Components
If somehow two VoiceAgent components are being rendered

### 3. Edge Function Being Called Twice
Frontend making two simultaneous requests

### 4. ElevenLabs Agent Configuration
The agents themselves might be configured to call each other or have linked conversations

## Next Steps
1. User needs to share FULL console logs
2. Check for duplicate connection IDs
3. Verify only ONE agent ID is being sent to edge function

