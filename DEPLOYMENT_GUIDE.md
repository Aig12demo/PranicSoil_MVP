# ElevenLabs Voice Agent Deployment Guide

This guide will help you fix the "Failed to fetch" error by properly deploying the ElevenLabs agent function.

## Problem
The error occurs because the Supabase Edge Function `elevenlabs-agent` is either:
- Not deployed to Supabase cloud
- Missing required environment variables
- Missing local environment configuration

## Solution

### Step 1: Set Up Local Environment Variables

1. **Copy the example file:**
   ```bash
   Copy-Item .env.example .env
   ```

2. **Get your Supabase credentials:**
   - Go to: https://app.supabase.com/project/_/settings/api
   - Copy your:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - Anon/Public Key

3. **Update your `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

### Step 2: Install Supabase CLI (if not already installed)

**Windows (PowerShell):**
```powershell
# Using Scoop
scoop install supabase

# OR using npm
npm install -g supabase
```

**Verify installation:**
```bash
supabase --version
```

### Step 3: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

### Step 4: Link Your Project

```bash
cd PranicSoil_MVP
supabase link --project-ref your-project-id
```

To find your project ID:
- Go to https://app.supabase.com
- Select your project
- The URL will be: `https://app.supabase.com/project/YOUR-PROJECT-ID`

### Step 5: Get ElevenLabs Credentials

1. **Go to ElevenLabs:**
   - Visit: https://elevenlabs.io/app/conversational-ai
   - Create or select an AI agent
   - Copy your Agent ID from the agent settings

2. **Get your API Key:**
   - Go to: https://elevenlabs.io/app/settings/api-keys
   - Copy your API key

### Step 6: Set Supabase Secrets

```bash
cd PranicSoil_MVP

# Set ElevenLabs API Key
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Set ElevenLabs Agent ID
supabase secrets set ELEVENLABS_AGENT_ID=your_agent_id_here
```

### Step 7: Deploy the Edge Function

```bash
cd PranicSoil_MVP
supabase functions deploy elevenlabs-agent

```

### Step 8: Verify Deployment

1. **Check deployed functions:**
   ```bash
   supabase functions list
   ```
   You should see `elevenlabs-agent` in the list.

2. **Test the endpoint:**
   Open your browser console and run:
   ```javascript
   fetch('YOUR_SUPABASE_URL/functions/v1/elevenlabs-agent', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action: 'get-signed-url' })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

### Step 9: Restart Your Development Server

```bash
# Stop your current dev server (Ctrl+C)
npm run dev
```

## Troubleshooting

### Error: "supabase: command not found"
- Install Supabase CLI (see Step 2)

### Error: "Project not linked"
- Run: `supabase link --project-ref your-project-id`

### Error: "Invalid API key"
- Verify your ElevenLabs API key is correct
- Check that secrets were set: `supabase secrets list`

### Error: "CORS error"
- The function has CORS headers configured
- Make sure you're accessing from the correct domain

### Error: "Failed to fetch" still occurring
1. Clear browser cache
2. Check browser console for the actual URL being called
3. Verify your `.env` file has correct `VITE_SUPABASE_URL`
4. Make sure the dev server was restarted after updating `.env`

## Quick Verification Checklist

- [ ] `.env` file exists with correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase CLI installed and authenticated
- [ ] Project linked to Supabase
- [ ] ElevenLabs secrets set (`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`)
- [ ] Edge function deployed (`supabase functions deploy elevenlabs-agent`)
- [ ] Development server restarted
- [ ] Function appears in Supabase dashboard (Edge Functions section)

## Next Steps

Once deployed, the voice agent should work properly. The flow is:
1. User clicks "Allow Microphone Access"
2. Frontend calls your Supabase function
3. Supabase function gets signed URL from ElevenLabs
4. Frontend connects to ElevenLabs via WebSocket
5. Voice conversation begins

If you continue to have issues, check the Supabase Edge Function logs:
```bash
supabase functions logs elevenlabs-agent
```

