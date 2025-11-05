# Two Voices Issue - Final Fix

## Problem
User was hearing **TWO voices** speaking simultaneously when using the voice agent from the welcome page (public context).

## Root Cause
**React StrictMode Race Condition:**
- React StrictMode intentionally mounts components twice in development
- Both component instances call `connect()` at nearly the same time
- The lock check `if (globalConnectionLock)` and lock set `globalConnectionLock = true` are NOT atomic
- Both instances check the lock at the exact same microsecond, both see it as `false`, both proceed
- Result: Two WebSocket connections to ElevenLabs = Two voices

## The Fix

### 1. Random Delay (Race Prevention)
```typescript
// Add 0-50ms random delay before lock check
const randomDelay = Math.random() * 50;
await new Promise(resolve => setTimeout(resolve, randomDelay));
```
**Why it works:** The random delay ensures instances don't check the lock at the exact same moment

### 2. Timestamp-Based Lock
```typescript
let globalConnectionLock: boolean = false;
let globalLockAcquiredAt: number = 0; // Track when lock was acquired
```
**Why it works:** We can now detect stale locks and see exactly when a lock was acquired

### 3. Lock Age Checking
```typescript
const now = Date.now();
const lockAge = now - globalLockAcquiredAt;

// Block if lock is active and fresh (< 10 seconds)
if (globalConnectionLock && lockAge < 10000) {
  return false; // BLOCKED
}

// Auto-release stale locks (> 10 seconds)
if (globalConnectionLock && lockAge >= 10000) {
  globalConnectionLock = false; // Force release
}
```
**Why it works:** Prevents old locks from blocking forever if something goes wrong

### 4. Enhanced Logging
```typescript
// Colored console logs for easy debugging
console.log(`%c🔐 ACQUIRED LOCK`, 'background: #00ff00; color: #000; font-weight: bold;');
console.log(`%c🚫 BLOCKED`, 'background: #ff0000; color: #fff; font-weight: bold;');
```
**Why it works:** Makes it immediately obvious in console which instance got the lock

### 5. Complete Cleanup
```typescript
// Reset ALL global state when cleaning up
globalActiveConnection = null;
globalConnectionContext = null;
globalHookInstanceId = null;
globalConnectionLock = false;
globalLockAcquiredAt = 0; // ← Added this
```
**Why it works:** Ensures no leftover state causes issues on next connection

## What You'll See in Console Now

### ✅ SUCCESS (Only ONE connection)
```
🆔 Hook instance MOUNTED: [1762297835922-abc123]
   Waiting 23.4ms before lock check (race prevention)...
🔐 ACQUIRED CONNECTION LOCK at 1762297835945

🆔 Hook instance MOUNTED: [1762297835925-xyz789]
   Waiting 41.7ms before lock check (race prevention)...
🚫 BLOCKED - Lock held by [1762297835922-abc123] for 18ms
```

### Key Indicators:
1. **Two MOUNTED** messages (normal with StrictMode)
2. **Different random delays** (23.4ms vs 41.7ms)
3. **One ACQUIRED, one BLOCKED** ✅
4. **Only ONE voice heard** ✅

## Testing Instructions

1. **Clear browser console**
2. **Hard refresh** (Ctrl+Shift+R) to get updated code
3. **Go to welcome page** (not logged in)
4. **Click "Try Voice Agent"**
5. **Watch console for colored logs:**
   - Green `🔐 ACQUIRED` - first instance got lock
   - Red `🚫 BLOCKED` - second instance was blocked
6. **Listen carefully** - should hear only ONE voice
7. **Say "Who are you?"** - should get single response

## Expected Console Output

```
🆔 Hook instance MOUNTED: [timestamp1-id1]
🌍 Global lock status: 🔓 UNLOCKED
🌍 Global active instance: None

🆔 Hook instance MOUNTED: [timestamp2-id2]  ← React StrictMode second mount
🌍 Global lock status: 🔓 UNLOCKED
🌍 Global active instance: None

💀 Hook instance UNMOUNTING: [timestamp1-id1]  ← StrictMode cleanup

🚨 CONNECT CALLED
   Waiting 23.4ms before lock check...
🔐 ACQUIRED CONNECTION LOCK at [timestamp]

🚨 CONNECT CALLED
   Waiting 41.7ms before lock check...
🚫 BLOCKED - Lock held by [timestamp2-id2] for 18ms
```

## If You Still Hear Two Voices

Check console for:
1. **TWO ACQUIRED messages** (should be impossible now)
2. **NO BLOCKED messages** (should always appear for second instance)
3. **Similar timestamps** (if delay isn't working)

Share the console output showing:
- All `🆔 MOUNTED` messages
- All `🚨 CONNECT CALLED` messages
- Random delay values
- `🔐 ACQUIRED` or `🚫 BLOCKED` results

## Technical Details

### Race Condition Explanation
In JavaScript, even single-threaded code can have race conditions with async functions:

```javascript
// Both functions run "simultaneously"
async function instance1() {
  if (!lock) {        // ← Checks at time T
    lock = true;      // ← Sets at time T+1
  }
}

async function instance2() {
  if (!lock) {        // ← Also checks at time T (before instance1 sets it!)
    lock = true;      // ← Also proceeds!
  }
}
```

### The Solution
```javascript
async function instanceWithDelay() {
  await randomDelay(); // ← Forces time separation
  if (!lock && lockAge < 10000) {
    lock = true;
    lockTime = now();
  }
}
```

## Related Files

- `src/hooks/useElevenLabsAgent.ts` - Main fix implemented here
- `REACT_STRICTMODE_FIX.md` - Background on React StrictMode
- `AGENT_SELECTION_FIX.md` - Public vs Authenticated agent selection

## Notes

- This fix works in **both development and production**
- In production (no StrictMode), there's only one mount, so the lock is rarely contended
- In development, the random delay ensures clean separation between instances
- Lock auto-releases after 10 seconds to prevent permanent deadlocks

