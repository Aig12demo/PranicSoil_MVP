# Quick Fix for "Failed to fetch" Error

## The Problem
**This is NOT an ElevenLabs issue** - it's your Supabase Edge Function that isn't deployed or configured properly.

The error happens at line 126 of `useElevenLabsAgent.ts` when trying to call your Supabase function **BEFORE** connecting to ElevenLabs.

## Quick Setup (5 Steps)

### Step 1: Create .env file
1. Look at `setup-env-template.txt` in this folder
2. Create a new file called `.env` (note the dot at the start)
3. Copy the contents from the template
4. Fill in your actual Supabase URL and Anon Key from: https://app.supabase.com/project/_/settings/api

Your `.env` should look like:
```env
VITE_SUPABASE_URL=https://yourprojectid.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
```

### Step 2: Install Supabase CLI (if needed)
```powershell
npm install -g supabase
```

### Step 3: Login & Link Project
```powershell
# Login to Supabase
supabase login

# Link to your project (get project-id from your Supabase URL)
supabase link --project-ref your-project-id
```

### Step 4: Run the Deployment Script

**Option A - PowerShell Script:**
```powershell
cd PranicSoil_MVP
.\deploy-elevenlabs-function.ps1
```

**Option B - Batch File (if PowerShell has issues):**
```cmd
cd PranicSoil_MVP
deploy-simple.bat
```

**Option C - Manual Commands (if both scripts fail):**
```powershell
cd PranicSoil_MVP

# Set the secrets (replace with your actual values)
supabase secrets set ELEVENLABS_API_KEY=your_api_key_here
supabase secrets set ELEVENLABS_AGENT_ID=your_agent_id_here

# Deploy the function
supabase functions deploy elevenlabs-agent
```

Any of these will:
- ✅ Check if Supabase CLI is installed
- ✅ Prompt for your ElevenLabs API Key and Agent ID
- ✅ Set the secrets in Supabase
- ✅ Deploy the edge function

### Step 5: Restart Dev Server
```powershell
# Stop current server (Ctrl+C if running)
npm run dev
```

## Verify It's Working

1. Open your app in the browser
2. Open DevTools Console (F12)
3. Try to start a voice conversation
4. Look for these debug messages:
   ```
   🔍 Debug: Supabase URL: https://yourproject.supabase.co
   🔍 Debug: Function URL: https://yourproject.supabase.co/functions/v1/elevenlabs-agent
   🔍 Debug: Calling edge function...
   ✅ Debug: Got response from edge function
   ```

If you see `❌ Debug: Response not OK`, the function isn't deployed or has an error.

## Common Issues

### Issue: "supabase: command not found"
**Fix:** Install Supabase CLI: `npm install -g supabase`

### Issue: "VITE_SUPABASE_URL is undefined" in console
**Fix:** Your `.env` file is missing or has wrong names. Make sure it starts with `VITE_`

### Issue: Still getting "Failed to fetch"
**Check:**
1. Is your `.env` file in the `PranicSoil_MVP` folder?
2. Did you restart the dev server after creating `.env`?
3. Is the URL in `.env` correct? (check for typos)
4. Run `supabase functions list` - do you see `elevenlabs-agent`?

### Issue: Function deploys but returns 500 error
**Check:**
1. Did you set the ElevenLabs secrets?
   ```powershell
   supabase secrets list
   ```
   Should show `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`

2. Check function logs:
   ```powershell
   supabase functions logs elevenlabs-agent
   ```

## Manual Deployment (Alternative to Script)

If the PowerShell script doesn't work:

```powershell
# Set secrets manually
supabase secrets set ELEVENLABS_API_KEY=your-key-here
supabase secrets set ELEVENLABS_AGENT_ID=your-agent-id-here

# Deploy function
supabase functions deploy elevenlabs-agent
```

## Where to Get ElevenLabs Credentials

1. **API Key:** https://elevenlabs.io/app/settings/api-keys
2. **Agent ID:** 
   - Go to https://elevenlabs.io/app/conversational-ai
   - Select your agent
   - Copy the Agent ID from settings

## Still Not Working?

Check the debug output in your browser console. The enhanced logging will show you:
- What URL is being called
- What the response status is
- Detailed error messages

Share the console output and I can help diagnose further!
