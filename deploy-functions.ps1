# PowerShell script to deploy all Edge Functions
# Usage: .\deploy-functions.ps1

Write-Host "🚀 Deploying Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if logged in
Write-Host "📋 Checking Supabase CLI status..." -ForegroundColor Yellow
$linkStatus = npx supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in. Please login first:" -ForegroundColor Red
    Write-Host "   npx supabase login" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 You need to create an Access Token first:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    Write-Host "   2. Generate new token" -ForegroundColor Yellow
    Write-Host "   3. Copy and use it when running 'npx supabase login'" -ForegroundColor Yellow
    exit 1
}

# Link project if not already linked
Write-Host "🔗 Linking project..." -ForegroundColor Yellow
npx supabase link --project-ref bwimmqwtmrprnrhdszts

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project might already be linked, continuing..." -ForegroundColor Yellow
}

# Deploy functions
$functions = @(
    "confirm-buyer-email",
    "get-signed-url",
    "send-otp",
    "translate-text",
    "upload-image",
    "verify-otp"
)

Write-Host ""
Write-Host "📦 Deploying functions..." -ForegroundColor Cyan
Write-Host ""

foreach ($func in $functions) {
    Write-Host "📤 Deploying: $func" -ForegroundColor Yellow
    npx supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "✅ All functions deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart dev server: npm run dev" -ForegroundColor Yellow
Write-Host "   2. Test the application" -ForegroundColor Yellow
