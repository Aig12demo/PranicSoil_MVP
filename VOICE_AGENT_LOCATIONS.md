# Voice Agent Instances in Application

## Summary

There are **THREE** VoiceAgent components in the application:

## 1. WelcomePage.tsx (Public Users)
**Location:** `src/pages/WelcomePage.tsx`
**Purpose:** For visitors who are NOT logged in
**Configuration:**
```tsx
<VoiceAgent
  onClose={() => setShowVoiceAgent(false)}
  contextType="public"
/>
```
**Trigger:** "Try Voice Agent" button on the welcome page
**Agent Used:** `ELEVENLABS_PUBLIC_AGENT_ID`
**Expected Behavior:** General introduction to Pranic Soil services

---

## 2. DashboardPage.tsx (Authenticated Users)
**Location:** `src/pages/DashboardPage.tsx`
**Purpose:** For logged-in users accessing from dashboard overview
**Configuration:**
```tsx
<VoiceAgent
  onClose={() => setShowVoiceAgent(false)}
  contextType="authenticated"
  userId={profile?.user_id || null}
/>
```
**Trigger:** "Voice Consultation" button in Quick Actions
**Agent Used:** `ELEVENLABS_AUTHENTICATED_AGENT_ID`
**Expected Behavior:** Personalized advice based on user profile

---

## 3. ChatInterface.tsx (Authenticated Users) ⚠️ FIXED
**Location:** `src/components/ChatInterface.tsx`
**Purpose:** For logged-in users accessing from the AI Assistant tab
**Configuration (BEFORE FIX):**
```tsx
<VoiceAgent onClose={() => setShowVoiceAgent(false)} />
```
❌ **Problem:** Missing `contextType` and `userId` - defaulted to "public"

**Configuration (AFTER FIX):**
```tsx
<VoiceAgent
  onClose={() => setShowVoiceAgent(false)}
  contextType="authenticated"
  userId={profile?.user_id || null}
/>
```
✅ **Fixed:** Now properly uses authenticated agent with user context
**Trigger:** "Voice Call" button in chat interface
**Agent Used:** `ELEVENLABS_AUTHENTICATED_AGENT_ID`
**Expected Behavior:** Personalized advice (same as dashboard voice consultation)

---

## Agent Selection Logic

### Edge Function Logic
**File:** `supabase/functions/elevenlabs-agent/index.ts`

```typescript
// Uses explicitly passed contextType from frontend
let contextType = requestedContext || "public";

// Select agent based on context
const agentId = contextType === "public" 
  ? ELEVENLABS_PUBLIC_AGENT_ID 
  : ELEVENLABS_AUTHENTICATED_AGENT_ID;
```

### Frontend Logic
**File:** `src/hooks/useElevenLabsAgent.ts`

```typescript
// Public users: Send anon key
headers['Authorization'] = `Bearer ${supabaseAnonKey}`;

// Authenticated users: Send user access token
headers['Authorization'] = `Bearer ${session.access_token}`;

// Always send contextType explicitly
body: JSON.stringify({ 
  action: 'get-signed-url',
  contextType: contextType  // ← Explicit context
})
```

---

## Configuration Requirements

### Supabase Secrets
```bash
ELEVENLABS_API_KEY                  # Your ElevenLabs API key
ELEVENLABS_PUBLIC_AGENT_ID          # Agent for public users
ELEVENLABS_AUTHENTICATED_AGENT_ID   # Agent for authenticated users
```

### Verification
```powershell
supabase secrets list | Select-String "ELEVENLABS"
```

---

## Common Issues & Solutions

### Issue 1: Wrong Agent Being Used
**Symptom:** Public user hears authenticated agent (or vice versa)
**Cause:** Missing `contextType` prop on VoiceAgent component
**Solution:** Always specify `contextType` and `userId` for authenticated contexts

### Issue 2: Two Voices Simultaneously
**Symptom:** Hearing echo or two different voices
**Cause:** React StrictMode mounting components twice + race condition
**Solution:** Connection lock with random delay (implemented in useElevenLabsAgent.ts)

### Issue 3: 401 Unauthorized
**Symptom:** "Missing authorization header" error
**Cause:** Not sending Authorization header to Supabase Edge Function
**Solution:** Always send either anon key or user access token

---

## Testing Guide

### Test Public Agent
1. **Log out** (or open incognito window)
2. **Go to welcome page**
3. **Click "Try Voice Agent"**
4. **Check console:** Should show `contextType: "public"`
5. **Say "Who are you?"**
6. **Expected:** General Pranic Soil introduction

### Test Authenticated Agent (Dashboard)
1. **Log in**
2. **Go to Dashboard**
3. **Click "Voice Consultation" in Quick Actions**
4. **Check console:** Should show `contextType: "authenticated"`
5. **Say "Who are you?"**
6. **Expected:** Personalized response with your name

### Test Authenticated Agent (Chat Interface)
1. **Log in**
2. **Go to Dashboard → AI Assistant tab**
3. **Click "Voice Call" button**
4. **Check console:** Should show `contextType: "authenticated"`
5. **Say "Who are you?"**
6. **Expected:** Personalized response (same as dashboard)

---

## Files Modified in This Fix

1. ✅ `src/components/ChatInterface.tsx` - Added `contextType` and `userId` props
2. ✅ `src/hooks/useElevenLabsAgent.ts` - Connection lock with race prevention
3. ✅ `supabase/functions/elevenlabs-agent/index.ts` - Explicit contextType handling

---

## Next Steps

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Test all three locations:**
   - Welcome page (public)
   - Dashboard Quick Actions (authenticated)
   - AI Assistant Voice Call (authenticated)
3. **Verify console logs** show correct contextType
4. **Confirm only ONE voice** is heard in each case

---

## Summary

- **Total VoiceAgent Instances:** 3
- **Public Context:** 1 (WelcomePage)
- **Authenticated Context:** 2 (DashboardPage + ChatInterface)
- **All Fixed:** ✅

