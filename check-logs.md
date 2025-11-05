# How to Check Function Logs

## Option 1: Supabase Dashboard (Easiest)

1. Open this URL in your browser:
   https://supabase.com/dashboard/project/zilrthstnuxncufdgiys/functions/elevenlabs-agent

2. Click on the **"Logs"** tab

3. You'll see detailed logs showing:
   - Whether the API key is being loaded correctly
   - What Agent ID is being used
   - The exact error from ElevenLabs

## Option 2: Test the Function Directly

Run this in PowerShell to test the function directly:

```powershell
$url = "https://zilrthstnuxncufdgiys.supabase.co/functions/v1/elevenlabs-agent"
$body = @{ action = "get-signed-url" } | ConvertTo-Json

Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json"
```

This will show you the exact error response.

## What to Look For in Logs:

The logs should show:
```
Calling ElevenLabs API with Agent ID: agent_9501k92pkwe3ep0tgjbnab2xbxcc
API Key exists: true
API Key length: 56
ElevenLabs response status: 200 (or error code)
```

If you see:
- **API Key exists: false** - The secret wasn't loaded properly
- **API Key length: 0** - The secret is empty
- **401 status** - The API key or Agent ID is wrong
- **404 status** - The Agent ID doesn't exist

---

**Try the voice agent again, then check the logs in the dashboard!**

