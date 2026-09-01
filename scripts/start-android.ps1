$ErrorActionPreference = 'Stop'

# Port 8081 is unavailable on this Windows workstation (Node receives EACCES).
# Keep the Metro port explicit so the ADB reverse rule and Expo URL stay aligned.
$metroPort = 8082

$androidAdbPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $androidAdbPath)) {
  throw "ADB was not found at $androidAdbPath. Install Android SDK Platform-Tools first."
}

& $androidAdbPath start-server | Out-Null
$connectedDevices = & $androidAdbPath devices
if (-not ($connectedDevices -match "`tdevice`$")) {
  throw 'No authorized Android phone was detected. Enable USB debugging, reconnect the cable, and accept the authorization prompt.'
}

& $androidAdbPath reverse tcp:2588 tcp:2588 | Out-Null
& $androidAdbPath reverse "tcp:$metroPort" "tcp:$metroPort" | Out-Null

Write-Host 'Android USB tunnel ready:' -ForegroundColor Green
Write-Host '  Phone 127.0.0.1:2588 -> computer Stratos API :2588'
Write-Host "  Phone 127.0.0.1:$metroPort -> computer Expo Metro :$metroPort"
Write-Host ''

# Bind Metro on all local interfaces, but advertise the phone-side loopback
# address reached through ADB reverse. On this workstation, --localhost binds
# only to IPv6 ::1, while ADB reverse reaches the IPv4 loopback listener.
$env:EXPO_PACKAGER_PROXY_URL = "http://127.0.0.1:$metroPort"
npx expo start --dev-client --lan --port $metroPort
