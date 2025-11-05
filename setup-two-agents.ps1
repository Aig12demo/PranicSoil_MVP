# PowerShell script to set up TWO separate ElevenLabs agents
# One for public (welcome page), one for authenticated users

Write-Host "=== ElevenLabs Two-Agent Setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "You need TWO separate agents in ElevenLabs:" -ForegroundColor Yellow
Write-Host "1. PUBLIC agent - for welcome page visitors (before login)" -ForegroundColor White
Write-Host "2. AUTHENTICATED agent - for logged-in users (with their data)" -ForegroundColor White
Write-Host ""

Write-Host "Configure agents at: https://elevenlabs.io/app/conversational-ai" -ForegroundColor Cyan
Write-Host ""

# PUBLIC AGENT
Write-Host "=== PUBLIC AGENT (Welcome Page) ===" -ForegroundColor Green
Write-Host "Prompt: Talk about Pranic Soil services" -ForegroundColor Gray
Write-Host "Voice: Choose a friendly, welcoming voice" -ForegroundColor Gray
Write-Host ""
$publicAgentId = Read-Host "Enter PUBLIC agent ID"

if ([string]::IsNullOrWhiteSpace($publicAgentId)) {
    Write-Host "ERROR: Public agent ID is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# AUTHENTICATED AGENT  
Write-Host "=== AUTHENTICATED AGENT (Logged-in Users) ===" -ForegroundColor Green
Write-Host "Prompt: Provide personalized agricultural advice" -ForegroundColor Gray
Write-Host "Voice: Choose a professional, knowledgeable voice" -ForegroundColor Gray
Write-Host ""
$authAgentId = Read-Host "Enter AUTHENTICATED agent ID"

if ([string]::IsNullOrWhiteSpace($authAgentId)) {
    Write-Host "ERROR: Authenticated agent ID is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setting Supabase Secrets ===" -ForegroundColor Cyan
Write-Host ""

# Set the secrets
Write-Host "Setting ELEVENLABS_PUBLIC_AGENT_ID..." -ForegroundColor Yellow
supabase secrets set "ELEVENLABS_PUBLIC_AGENT_ID=$publicAgentId"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set public agent ID" -ForegroundColor Red
    exit 1
}
Write-Host "Public agent ID set successfully!" -ForegroundColor Green

Write-Host "Setting ELEVENLABS_AUTHENTICATED_AGENT_ID..." -ForegroundColor Yellow
supabase secrets set "ELEVENLABS_AUTHENTICATED_AGENT_ID=$authAgentId"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set authenticated agent ID" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated agent ID set successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deploying Updated Function ===" -ForegroundColor Cyan
Write-Host ""

# Deploy the function
Write-Host "Deploying elevenlabs-agent function..." -ForegroundColor Yellow
supabase functions deploy elevenlabs-agent
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to deploy function" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== SUCCESS! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "PUBLIC agent (welcome page): $publicAgentId" -ForegroundColor White
Write-Host "AUTHENTICATED agent (logged-in): $authAgentId" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your dev server: npm run dev" -ForegroundColor White
Write-Host "2. Test BOTH agents:" -ForegroundColor White
Write-Host "   - Try voice agent on welcome page (before login)" -ForegroundColor Gray
Write-Host "   - Login and try voice agent (after login)" -ForegroundColor Gray
Write-Host ""
Write-Host "Each context will now use its own dedicated agent!" -ForegroundColor Yellow

