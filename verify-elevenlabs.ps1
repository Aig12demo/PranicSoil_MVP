# Script to verify ElevenLabs credentials
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentId
)

Write-Host "Testing ElevenLabs API credentials..." -ForegroundColor Cyan
Write-Host ""

# Test API key by calling ElevenLabs API
Write-Host "1. Testing API Key..." -ForegroundColor Yellow
$headers = @{
    "xi-api-key" = $ApiKey
}

try {
    $response = Invoke-WebRequest -Uri "https://api.elevenlabs.io/v1/user" -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "   ✓ API Key is VALID!" -ForegroundColor Green
    $user = $response.Content | ConvertFrom-Json
    Write-Host "   User: $($user.subscription.character_count) / $($user.subscription.character_limit) characters used" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ API Key is INVALID!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testing Agent ID..." -ForegroundColor Yellow

# Test agent access
$agentUrl = "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=$AgentId"
try {
    $response = Invoke-WebRequest -Uri $agentUrl -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "   ✓ Agent ID is VALID and accessible!" -ForegroundColor Green
    Write-Host "   Agent is configured correctly" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Agent ID is INVALID or inaccessible!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Possible issues:" -ForegroundColor Yellow
    Write-Host "   - Agent ID is incorrect" -ForegroundColor Yellow
    Write-Host "   - Agent doesn't exist" -ForegroundColor Yellow
    Write-Host "   - Agent belongs to a different account" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please check: https://elevenlabs.io/app/conversational-ai" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "=== All credentials are valid! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The issue might be that the secrets in Supabase are different." -ForegroundColor Yellow
Write-Host "Let's update them now..." -ForegroundColor Yellow
Write-Host ""

supabase secrets set "ELEVENLABS_API_KEY=$ApiKey"
supabase secrets set "ELEVENLABS_AGENT_ID=$AgentId"

Write-Host ""
Write-Host "Secrets updated! Now redeploy the function:" -ForegroundColor Cyan
Write-Host "supabase functions deploy elevenlabs-agent" -ForegroundColor White

