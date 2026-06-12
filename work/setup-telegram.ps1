param(
    [string]$ConfigDirectory = (Join-Path $PSScriptRoot "telegram")
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Security

New-Item -ItemType Directory -Force -Path $ConfigDirectory | Out-Null

Write-Host ""
Write-Host "KGLD Telegram setup"
Write-Host "1. Revoke the exposed token in @BotFather and create a new token."
Write-Host "2. Open the bot chat and send /start."
Write-Host ""

$secureToken = Read-Host "Enter the NEW bot token (input is hidden)" -AsSecureString
$tokenPath = Join-Path $ConfigDirectory "bot-token.dpapi"

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $tokenBytes = [Text.Encoding]::UTF8.GetBytes($token)
    $protectedToken = [Security.Cryptography.ProtectedData]::Protect(
        $tokenBytes,
        $null,
        [Security.Cryptography.DataProtectionScope]::LocalMachine
    )
    [IO.File]::WriteAllText($tokenPath, [Convert]::ToBase64String($protectedToken), [Text.Encoding]::ASCII)

    $client = New-Object Net.Http.HttpClient

    $meJson = $client.GetStringAsync("https://api.telegram.org/bot$token/getMe").GetAwaiter().GetResult()
    $me = $meJson | ConvertFrom-Json
    if (-not $me.ok) {
        throw "Telegram rejected the bot token."
    }

    Write-Host ""
    Write-Host ("Verified bot: @{0}" -f $me.result.username)
    Write-Host ("Open https://t.me/{0} and send /start now." -f $me.result.username)
    Write-Host "Waiting for the private chat (up to 2 minutes)..."

    $chat = $null
    $deadline = (Get-Date).AddMinutes(2)
    while (-not $chat -and (Get-Date) -lt $deadline) {
        $updatesJson = $client.GetStringAsync("https://api.telegram.org/bot$token/getUpdates").GetAwaiter().GetResult()
        $updates = $updatesJson | ConvertFrom-Json
        $chat = $updates.result |
            ForEach-Object { $_.message.chat } |
            Where-Object { $_ -and $_.type -eq "private" } |
            Select-Object -Last 1

        if (-not $chat) {
            Start-Sleep -Seconds 3
        }
    }

    if (-not $chat) {
        throw "No private chat found for @$($me.result.username). Confirm that /start was sent to this exact bot."
    }

    $chatNameParts = @($chat.first_name, $chat.last_name) | Where-Object { $_ }
    $config = [ordered]@{
        chatId = [string]$chat.id
        chatName = ($chatNameParts -join " ").Trim()
        botUsername = $me.result.username
        configuredAt = (Get-Date).ToString("o")
    }
    $configPath = Join-Path $ConfigDirectory "config.json"
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

    Write-Host ""
    Write-Host "Telegram connection configured."
    Write-Host ("Bot: @{0}" -f $me.result.username)
    Write-Host ("Chat: {0}" -f $config.chatName)
    Write-Host ""
    Write-Host "Run send-telegram-dashboard.ps1 to send a test dashboard."
}
finally {
    if ($client) {
        $client.Dispose()
    }
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($tokenBytes) {
        [Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
    }
    Remove-Variable token -ErrorAction SilentlyContinue
}
