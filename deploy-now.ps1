# Quick deployment script - run this after getting your ElevenLabs credentials
# Usage: .\deploy-now.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentId
)

Write-Host "Setting ElevenLabs secrets..." -ForegroundColor Cyan

# Set secrets
supabase secrets set "ELEVENLABS_API_KEY=$ApiKey"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set API key" -ForegroundColor Red
    exit 1
}

supabase secrets set "ELEVENLABS_AGENT_ID=$AgentId"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set Agent ID" -ForegroundColor Red
    exit 1
}

Write-Host "Secrets set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Deploying function..." -ForegroundColor Cyan

# Deploy function
supabase functions deploy elevenlabs-agent
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy function" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== SUCCESS! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your dev server: npm run dev" -ForegroundColor White
Write-Host "2. Try the voice agent in your app" -ForegroundColor White
Write-Host ""
Write-Host "The debug logs will show in your browser console!" -ForegroundColor Yellow

