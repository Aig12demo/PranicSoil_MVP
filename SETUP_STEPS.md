# Final Setup Steps - DO THIS NOW! 🚀

The Supabase CLI is installed! Now complete these final steps:

## Step 1: Login to Supabase

### Option A: Interactive Login (Recommended)
Open a **NEW PowerShell window** (not in Cursor) and run:
```powershell
cd C:\Users\rkaru\OneDrive\Desktop\Cursor_MVP\PranicSoil_MVP
supabase login
```
This will open your browser to authenticate.

### Option B: Token-Based Login
1. Go to: https://app.supabase.com/account/tokens
2. Click "Generate new token"
3. Copy the token
4. Run in PowerShell:
```powershell
$env:SUPABASE_ACCESS_TOKEN="your-token-here"
supabase login
```

## Step 2: Link Your Project

Find your project ID:
- Go to: https://app.supabase.com
- Select your project
- The URL will be: `https://app.supabase.com/project/YOUR-PROJECT-ID`
- Copy the project ID

Then run:
```powershell
cd C:\Users\rkaru\OneDrive\Desktop\Cursor_MVP\PranicSoil_MVP
supabase link --project-ref YOUR-PROJECT-ID
```

## Step 3: Get Your Environment Variables

While you're in Supabase dashboard:
1. Go to: https://app.supabase.com/project/_/settings/api
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

## Step 4: Create .env File

Create a file named `.env` in the `PranicSoil_MVP` folder with:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace the values with your actual credentials from Step 3!**

## Step 5: Get ElevenLabs Credentials

1. **API Key:** https://elevenlabs.io/app/settings/api-keys
2. **Agent ID:** 
   - Go to: https://elevenlabs.io/app/conversational-ai
   - Select or create your agent
   - Copy the Agent ID

## Step 6: Deploy the Function

Open a PowerShell window and run:
```powershell
cd C:\Users\rkaru\OneDrive\Desktop\Cursor_MVP\PranicSoil_MVP
.\deploy-elevenlabs-function.ps1
```

Or manually:
```powershell
cd C:\Users\rkaru\OneDrive\Desktop\Cursor_MVP\PranicSoil_MVP

# Set secrets (replace with your actual values)
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key
supabase secrets set ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id

# Deploy
supabase functions deploy elevenlabs-agent
```

## Step 7: Restart Your Dev Server

```powershell
# Stop current server (Ctrl+C)
npm run dev
```

## Step 8: Test It!

1. Open your app in the browser
2. Open DevTools Console (F12)
3. Try the voice agent
4. Look for these debug messages:
   ```
   🔍 Debug: Supabase URL: https://yourproject.supabase.co
   🔍 Debug: Calling edge function...
   ✅ Debug: Got response from edge function
   ```

## Troubleshooting

### "supabase: command not found" in new PowerShell window
Close and reopen PowerShell, or run:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Cannot link project
Make sure you're logged in first: `supabase login`

### Function deploys but still getting errors
Check the function logs:
```powershell
supabase functions logs elevenlabs-agent
```

---

## Quick Command Reference

```powershell
# Login
supabase login

# Link project
supabase link --project-ref YOUR-PROJECT-ID

# List functions
supabase functions list

# Deploy function
supabase functions deploy elevenlabs-agent

# View function logs
supabase functions logs elevenlabs-agent

# List secrets
supabase secrets list

# Set a secret
supabase secrets set KEY_NAME=value
```

---

**Next:** Open a new PowerShell window and start with Step 1! 🚀

