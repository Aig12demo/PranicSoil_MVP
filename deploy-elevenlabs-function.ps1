# PowerShell script to deploy the ElevenLabs Edge Function
# Run this from the PranicSoil_MVP directory

Write-Host "=== ElevenLabs Function Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "Supabase CLI installed: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Or with Scoop: scoop install supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check if .env file exists
Write-Host "Checking for .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "WARNING: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Supabase credentials." -ForegroundColor Yellow
    Write-Host "See setup-env-template.txt for the format." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host ".env file found" -ForegroundColor Green
}
Write-Host ""

# Prompt for ElevenLabs credentials
Write-Host "=== ElevenLabs Configuration ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to provide your ElevenLabs credentials." -ForegroundColor Yellow
Write-Host "Get them from: https://elevenlabs.io" -ForegroundColor Yellow
Write-Host ""

$elevenLabsApiKey = Read-Host "Enter your ElevenLabs API Key"
$elevenLabsAgentId = Read-Host "Enter your ElevenLabs Agent ID"

if ([string]::IsNullOrWhiteSpace($elevenLabsApiKey) -or [string]::IsNullOrWhiteSpace($elevenLabsAgentId)) {
    Write-Host "ERROR: Both API Key and Agent ID are required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setting Supabase Secrets ===" -ForegroundColor Cyan
Write-Host ""

# Set secrets
Write-Host "Setting ELEVENLABS_API_KEY..." -ForegroundColor Yellow
supabase secrets set "ELEVENLABS_API_KEY=$elevenLabsApiKey"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set ELEVENLABS_API_KEY" -ForegroundColor Red
    Write-Host "Make sure you are logged in: supabase login" -ForegroundColor Yellow
    Write-Host "And linked to your project: supabase link --project-ref YOUR-PROJECT-ID" -ForegroundColor Yellow
    exit 1
}
Write-Host "ELEVENLABS_API_KEY set successfully" -ForegroundColor Green

Write-Host "Setting ELEVENLABS_AGENT_ID..." -ForegroundColor Yellow
supabase secrets set "ELEVENLABS_AGENT_ID=$elevenLabsAgentId"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set ELEVENLABS_AGENT_ID" -ForegroundColor Red
    exit 1
}
Write-Host "ELEVENLABS_AGENT_ID set successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deploying Edge Function ===" -ForegroundColor Cyan
Write-Host ""

# Deploy the function
Write-Host "Deploying elevenlabs-agent function..." -ForegroundColor Yellow
supabase functions deploy elevenlabs-agent
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to deploy function" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your development server (npm run dev)" -ForegroundColor White
Write-Host "2. Try the voice agent again" -ForegroundColor White
Write-Host ""
Write-Host "To view function logs: supabase functions logs elevenlabs-agent" -ForegroundColor Yellow
Write-Host "To list all functions: supabase functions list" -ForegroundColor Yellow
