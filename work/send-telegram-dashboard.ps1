param(
    [string]$DashboardDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) "outputs\kgld-dashboard"),
    [string]$ConfigDirectory = (Join-Path $PSScriptRoot "telegram")
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Security

$tokenPath = Join-Path $ConfigDirectory "bot-token.dpapi"
$configPath = Join-Path $ConfigDirectory "config.json"
if (-not (Test-Path -LiteralPath $tokenPath) -or -not (Test-Path -LiteralPath $configPath)) {
    throw "Telegram is not configured. Run work\setup-telegram.ps1 first."
}

try {
    $protectedToken = [Convert]::FromBase64String((Get-Content -Raw -LiteralPath $tokenPath).Trim())
    $tokenBytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protectedToken,
        $null,
        [Security.Cryptography.DataProtectionScope]::LocalMachine
    )
    $token = [Text.Encoding]::UTF8.GetString($tokenBytes)
    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $dataPath = Join-Path $DashboardDirectory "dashboard-data.js"
    $indexPath = Join-Path $DashboardDirectory "index.html"
    $imagePath = Join-Path $DashboardDirectory "kgld-daily-dashboard.png"
    $bundlePath = Join-Path $DashboardDirectory "kgld-dashboard-html.zip"

    $node = "C:\Users\yghan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    $nodeModules = "C:\Users\yghan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
    $pnpmNodeModules = Join-Path $nodeModules ".pnpm\node_modules"
    $renderScript = Join-Path $PSScriptRoot "render-dashboard.js"
    if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $renderScript)) {
        throw "Dashboard renderer dependencies were not found."
    }

    $previousNodePath = $env:NODE_PATH
    $env:NODE_PATH = "$nodeModules;$pnpmNodeModules"
    try {
        & $node $renderScript $indexPath $imagePath
        $renderExitCode = $LASTEXITCODE
    }
    finally {
        $env:NODE_PATH = $previousNodePath
    }
    if ($renderExitCode -ne 0 -or -not (Test-Path -LiteralPath $imagePath)) {
        throw "Dashboard image rendering failed."
    }

    if (Test-Path -LiteralPath $bundlePath) {
        Remove-Item -LiteralPath $bundlePath -Force
    }
    $bundleFiles = @(
        (Join-Path $DashboardDirectory "index.html"),
        (Join-Path $DashboardDirectory "styles.css"),
        (Join-Path $DashboardDirectory "app.js"),
        (Join-Path $DashboardDirectory "dashboard-data.js")
    )
    Compress-Archive -LiteralPath $bundleFiles -DestinationPath $bundlePath -CompressionLevel Optimal

    $python = "C:\Users\yghan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    $telegramScript = Join-Path $PSScriptRoot "send-telegram.py"
    $payloadPath = Join-Path $ConfigDirectory "send-payload.json"
    $sendPayload = [ordered]@{
        chat_id = [string]$config.chatId
        data_path = $dataPath
        image_path = $imagePath
        bundle_path = $bundlePath
        links = [ordered]@{
            token = "https://etherscan.io/token/0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE"
            issue = "https://etherscan.io/address/0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95"
            redeem = "https://etherscan.io/address/0xe257fe24611CfabCa4a48869C1222D1cC2602E70"
        }
    } | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText($payloadPath, $sendPayload, (New-Object Text.UTF8Encoding($false)))

    $previousTelegramToken = $env:KGLD_TELEGRAM_TOKEN
    $env:KGLD_TELEGRAM_TOKEN = $token
    try {
        & $python $telegramScript $payloadPath
        if ($LASTEXITCODE -ne 0) {
            throw "Telegram send failed."
        }
    }
    finally {
        $env:KGLD_TELEGRAM_TOKEN = $previousTelegramToken
        Remove-Item -LiteralPath $payloadPath -Force -ErrorAction SilentlyContinue
    }
}
finally {
    if ($tokenBytes) {
        [Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
    }
    Remove-Variable token -ErrorAction SilentlyContinue
}
