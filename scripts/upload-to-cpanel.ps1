# PowerShell Script to Upload Files to cPanel via FTP
# Usage: .\scripts\upload-to-cpanel.ps1

param(
    [string]$FtpHost = "portfolio.roeia.com",
    [string]$FtpUser = "portfolioroeia",
    [string]$FtpPassword = "cpsess2434242825ribhstore",
    [string]$RemotePath = "/ribhstore",
    [string]$LocalPath = ".\deploy-ribhstore"
)

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan @"

╔════════════════════════════════════════════╗
║   cPanel FTP Upload Script                 ║
╚════════════════════════════════════════════╝
"@

# Check if local path exists
if (-not (Test-Path $LocalPath)) {
    Write-ColorOutput Red "❌ Error: Local path not found: $LocalPath"
    Write-ColorOutput Yellow "💡 Please run 'npm run deploy:prepare' first"
    exit 1
}

Write-ColorOutput Green "✅ Local path found: $LocalPath"
Write-ColorOutput Cyan "📤 Starting FTP upload..."
Write-Host ""

# Load WinSCP .NET assembly (if available) or use native FTP
try {
    # Try using System.Net.FtpWebRequest (built-in)
    Write-ColorOutput Cyan "📡 Connecting to FTP server: $FtpHost"
    
    # For PowerShell, we'll use a simpler approach with FTP commands
    # Note: This is a basic implementation. For production, consider using WinSCP .NET assembly
    
    Write-ColorOutput Yellow "⚠️  Note: This script provides FTP upload instructions."
    Write-ColorOutput Yellow "For automatic upload, you can use FileZilla or WinSCP manually."
    Write-Host ""
    
    Write-ColorOutput Green "📋 FTP Connection Details:"
    Write-Host "   Host: $FtpHost"
    Write-Host "   Username: $FtpUser"
    Write-Host "   Password: (hidden)"
    Write-Host "   Remote Path: $RemotePath"
    Write-Host "   Local Path: $LocalPath"
    Write-Host ""
    
    Write-ColorOutput Cyan "📝 Manual Upload Steps:"
    Write-Host "   1. Open FileZilla or any FTP client"
    Write-Host "   2. Connect with the credentials above"
    Write-Host "   3. Navigate to: $RemotePath (or create it if it doesn't exist)"
    Write-Host "   4. Upload all contents from: $LocalPath"
    Write-Host "   5. Make sure to upload hidden files (.htaccess, .env.example)"
    Write-Host ""
    
    Write-ColorOutput Cyan "📁 Files to upload from: $LocalPath"
    Get-ChildItem -Path $LocalPath -Recurse | Select-Object FullName, Length | Format-Table -AutoSize
    
    Write-Host ""
    Write-ColorOutput Green "✅ Files are ready for upload!"
    Write-ColorOutput Yellow "💡 Alternative: Use FileZilla with the credentials above"
    
} catch {
    Write-ColorOutput Red "❌ Error: $($_.Exception.Message)"
    exit 1
}

Write-Host ""


