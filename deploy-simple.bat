@echo off
echo ========================================
echo ElevenLabs Function Deployment
echo ========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI not found!
    echo Install it with: npm install -g supabase
    pause
    exit /b 1
)

echo Supabase CLI found!
echo.

REM Check for .env file
if not exist .env (
    echo WARNING: .env file not found!
    echo Please create a .env file with your Supabase credentials.
    echo See setup-env-template.txt for the format.
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo ========================================
echo ElevenLabs Configuration
echo ========================================
echo.
echo Get your credentials from: https://elevenlabs.io
echo.

set /p ELEVENLABS_API_KEY="Enter your ElevenLabs API Key: "
set /p ELEVENLABS_AGENT_ID="Enter your ElevenLabs Agent ID: "

if "%ELEVENLABS_API_KEY%"=="" (
    echo ERROR: API Key is required!
    pause
    exit /b 1
)

if "%ELEVENLABS_AGENT_ID%"=="" (
    echo ERROR: Agent ID is required!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setting Supabase Secrets
echo ========================================
echo.

echo Setting ELEVENLABS_API_KEY...
supabase secrets set ELEVENLABS_API_KEY=%ELEVENLABS_API_KEY%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to set ELEVENLABS_API_KEY
    echo Make sure you are logged in: supabase login
    echo And linked to your project: supabase link --project-ref YOUR-PROJECT-ID
    pause
    exit /b 1
)
echo ELEVENLABS_API_KEY set successfully!

echo Setting ELEVENLABS_AGENT_ID...
supabase secrets set ELEVENLABS_AGENT_ID=%ELEVENLABS_AGENT_ID%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to set ELEVENLABS_AGENT_ID
    pause
    exit /b 1
)
echo ELEVENLABS_AGENT_ID set successfully!

echo.
echo ========================================
echo Deploying Edge Function
echo ========================================
echo.

echo Deploying elevenlabs-agent function...
supabase functions deploy elevenlabs-agent
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy function
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your development server (npm run dev)
echo 2. Try the voice agent again
echo.
echo To view function logs: supabase functions logs elevenlabs-agent
echo To list all functions: supabase functions list
echo.
pause

