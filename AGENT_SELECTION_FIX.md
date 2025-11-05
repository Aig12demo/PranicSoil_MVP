# Agent Selection Fix - Public vs Authenticated

## Problem Identified

**Symptom:** When testing the **PUBLIC agent** from the welcome page (not logged in), users were hearing **"I'm Alex, an agriculture consultant"** - which is the AUTHENTICATED agent's introduction.

## Root Cause

The edge function (`supabase/functions/elevenlabs-agent/index.ts`) determines which agent to use by checking if an **Authorization header** is present:

```typescript
// Edge function logic (lines 32-38)
if (authHeader) {
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (!authError && user) {
    userId = user.id;
    contextType = "authenticated";  // ← Sets to authenticated!
  }
}
```

**The Bug:** The frontend was sending `Authorization: Bearer <anon_key>` for BOTH public and authenticated users:

```typescript
// OLD CODE (WRONG)
if (contextType === 'authenticated') {
  headers['Authorization'] = `Bearer ${session.access_token}`;
} else {
  headers['Authorization'] = `Bearer ${supabaseAnonKey}`;  // ← BUG!
}
```

When the edge function received the anon key in the Authorization header, it attempted to validate it as a user token, which might have caused unexpected behavior or defaulted to the authenticated agent.

## The Fix

**Only send Authorization header for AUTHENTICATED users:**

```typescript
// NEW CODE (CORRECT)
if (contextType === 'authenticated') {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
    console.log('🔍 Debug: Using authenticated session with access token');
  } else {
    throw new Error('Authentication required but no valid session');
  }
} else {
  console.log('🔍 Debug: Public access - NO Authorization header (only apikey)');
  // DO NOT send Authorization header for public users
}
```

## How It Works Now

### Public User (Welcome Page)
```
Frontend → Edge Function
Headers:
  ✅ apikey: <anon_key>
  ❌ NO Authorization header

Edge Function Logic:
  authHeader = null
  → contextType = "public"
  → Uses ELEVENLABS_PUBLIC_AGENT_ID
```

### Authenticated User (Dashboard)
```
Frontend → Edge Function
Headers:
  ✅ apikey: <anon_key>
  ✅ Authorization: Bearer <user_access_token>

Edge Function Logic:
  authHeader exists
  → supabase.auth.getUser(token) validates user
  → contextType = "authenticated"
  → Uses ELEVENLABS_AUTHENTICATED_AGENT_ID
```

## Verification in Console

### Public Agent (Welcome Page)
```
🔍 Debug: Context type: public
🔍 Debug: IS PUBLIC: true
🔍 Debug: Public access - NO Authorization header (only apikey)

// Edge function logs (server-side):
Context type: public
Using agent: PUBLIC
Agent ID: <your-public-agent-id>
```

### Authenticated Agent (Dashboard)
```
🔍 Debug: Context type: authenticated
🔍 Debug: IS AUTHENTICATED: true
🔍 Debug: Using authenticated session with access token

// Edge function logs (server-side):
Context type: authenticated
Using agent: AUTHENTICATED
Agent ID: <your-authenticated-agent-id>
```

## Testing Steps

1. **Clear browser console**
2. **Test Public Agent:**
   - Go to welcome page (NOT logged in)
   - Click "Try Voice Agent"
   - Say "Who are you?"
   - **Expected:** "I'm a friendly agricultural consultant for Pranic Soil..."

3. **Test Authenticated Agent:**
   - Log in to your account
   - Go to Dashboard → Click "Voice Consultation"
   - Say "Who are you?"
   - **Expected:** "I'm Alex, an agricultural consultant..." (with your name/details)

## Related Files Modified

- `src/hooks/useElevenLabsAgent.ts` - Fixed Authorization header logic
- `AGENT_SELECTION_FIX.md` - This document

## Configuration Requirements

Ensure both agent IDs are set in Supabase:
```bash
supabase secrets list | Select-String "ELEVENLABS"
```

Should show:
```
ELEVENLABS_PUBLIC_AGENT_ID = <your-public-agent-id>
ELEVENLABS_AUTHENTICATED_AGENT_ID = <your-authenticated-agent-id>
```

## Notes

- **apikey header** is always required for Supabase Edge Functions
- **Authorization header** should ONLY be sent for authenticated users
- The edge function auto-detects context based on Authorization header presence
- Different agents should have different voice configurations in ElevenLabs dashboard

