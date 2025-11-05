# React StrictMode Fix for Voice Agent

## Problem Identified

**Root Cause:** React StrictMode (enabled in `src/main.tsx`) intentionally mounts components **twice** in development to detect side effects. This was causing:
- Multiple hook instances to be created simultaneously
- Multiple WebSocket connections to ElevenLabs
- **Two voices speaking at the same time**

## Solutions Implemented

### 1. **Unique Instance IDs with Timestamp**
```typescript
const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
```
- Each hook instance now has a TRULY unique ID
- Format: `1730745892123-a3f9k2` (timestamp + random)

### 2. **Connection Lock Mechanism**
```typescript
let globalConnectionLock: boolean = false;
```
- Prevents concurrent connection attempts
- First instance to call `connect()` acquires the lock
- Other instances are blocked with: `🚫 Connection already in progress`

### 3. **Proper Mount/Unmount Logging**
```typescript
useEffect(() => {
  console.log(`🆔 Hook instance MOUNTED: [${instanceId}]`);
  return () => {
    console.log(`💀 Hook instance UNMOUNTING: [${instanceId}]`);
    // Auto-cleanup on unmount
  };
}, []);
```
- Logs only once per mount (not on every render)
- Automatic cleanup when component unmounts

### 4. **Lock Release on All Exit Paths**
- ✅ On successful connection: `ws.onopen`
- ✅ On connection error: `catch` block
- ✅ On WebSocket error: `ws.onerror`

## What You'll See in Console Now

### ✅ SUCCESS SCENARIO (Only ONE connection)

```
🆔 Hook instance MOUNTED: [1730745892123-a3f9k2]
🌍 Current global state: No active connection

💀 Hook instance UNMOUNTING: [1730745892120-xyz789]  ← StrictMode cleanup

🆔 Hook instance MOUNTED: [1730745892125-b4g8n3]     ← StrictMode remount
🌍 Current global state: No active connection

🚨 [1730745892125-b4g8n3] CONNECT CALLED - Context: public, UserId: null
🔐 [1730745892125-b4g8n3] Acquired connection lock
🔒 [1730745892125-b4g8n3] Registered as global active connection
✅ [1730745892125-b4g8n3] WebSocket connected to ElevenLabs
🔓 [1730745892125-b4g8n3] Released connection lock
```

### 🚫 BLOCKED SCENARIO (Preventing second connection)

```
🚨 [1730745892130-c5h9o4] CONNECT CALLED - Context: public, UserId: null
🚫 [1730745892130-c5h9o4] Connection already in progress, blocking concurrent attempt
```

## Testing Instructions

1. **Open the welcome page** (not logged in)
2. **Click "Try Voice Agent"**
3. **Watch the console** for:
   - Multiple `MOUNTED` messages (normal with StrictMode)
   - Only ONE `Acquired connection lock` message
   - Possible `Connection already in progress` for blocked attempts
   - Only ONE active connection

4. **Listen carefully** - you should hear **ONLY ONE voice**

## What the Numbers Mean

When you see: `2useElevenLabsAgent.ts:41`
- The `2` means there are 2 console logs grouped together
- This is normal during React StrictMode's double-mount
- The key is that only ONE should acquire the lock

## Development vs Production

### Development (with StrictMode)
- Components mount twice
- You'll see multiple `MOUNTED` logs
- Lock mechanism prevents duplicate connections

### Production (no StrictMode)
- Components mount once
- Single clean connection
- No duplicate warnings

## If You Still Hear Two Voices

Check console for:
1. **TWO different instance IDs acquiring the lock** - this should NOT happen
2. **No `Connection already in progress` messages** - should appear for blocked attempts
3. **Multiple `Registered as global active connection` messages** - should only be ONE

If the issue persists, share the console output showing:
- All `MOUNTED` messages
- All `CONNECT CALLED` messages  
- All lock acquisition/release messages
- Any `WebSocket connected` messages

## Notes About StrictMode

**Do NOT remove StrictMode!** It helps catch bugs in development.

The proper solution (implemented here) is to handle StrictMode's double-mounting gracefully with:
- Singleton pattern
- Connection locks
- Proper cleanup on unmount

## Related Files Modified

- `src/hooks/useElevenLabsAgent.ts` - Added lock mechanism and unique IDs
- `TEST_AGENT_SEPARATION.md` - Testing guide
- `REACT_STRICTMODE_FIX.md` - This document

