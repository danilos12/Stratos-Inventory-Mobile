param(
  [switch]$RepairNativeCacheOnly
)

$ErrorActionPreference = 'Stop'

# Port 8081 cannot be bound on this Windows workstation. Match the port used
# by start-android.ps1 so native builds and daily Metro sessions behave alike.
$metroPort = 8082

# Native CMake files contain absolute paths into Gradle's cache. Pin the cache
# to the signed-in Windows user so builds started by tooling cannot leak a
# temporary execution account into later local builds.
$androidGradleUserHome = Join-Path $env:USERPROFILE '.gradle'
$env:GRADLE_USER_HOME = $androidGradleUserHome

Write-Host "Using Gradle cache: $androidGradleUserHome" -ForegroundColor Cyan

# Ninja and CMake store absolute Gradle-cache paths in generated .cxx files.
# If this workspace was built by a different Windows account (for example an
# isolated automation account), those paths can become unreadable. Record the
# cache owner and discard only regenerable native outputs when it changes.
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$nativeCacheMarkerDirectory = Join-Path $projectRoot 'android\.gradle'
$nativeCacheMarker = Join-Path $nativeCacheMarkerDirectory 'native-cache-gradle-home.txt'
$expectedGradleHome = [System.IO.Path]::GetFullPath($androidGradleUserHome).TrimEnd('\')
$recordedGradleHome = if (Test-Path -LiteralPath $nativeCacheMarker) {
  (Get-Content -Raw -LiteralPath $nativeCacheMarker).Trim().TrimEnd('\')
} else {
  ''
}

if (-not [string]::Equals($recordedGradleHome, $expectedGradleHome, [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Host 'Gradle cache owner changed. Regenerating native build files...' -ForegroundColor Yellow

  $generatedNativePaths = @(
    'android\app\.cxx',
    'android\app\build',
    'node_modules\expo-modules-core\android\.cxx',
    'node_modules\expo-modules-core\android\build',
    'node_modules\react-native-gesture-handler\android\.cxx',
    'node_modules\react-native-gesture-handler\android\build',
    'node_modules\react-native-reanimated\android\.cxx',
    'node_modules\react-native-reanimated\android\build',
    'node_modules\react-native-screens\android\.cxx',
    'node_modules\react-native-screens\android\build',
    'node_modules\react-native-worklets\android\.cxx',
    'node_modules\react-native-worklets\android\build'
  )

  foreach ($relativePath in $generatedNativePaths) {
    $targetPath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $targetPath)) {
      continue
    }

    $resolvedTarget = (Resolve-Path -LiteralPath $targetPath).Path
    $workspacePrefix = $projectRoot.TrimEnd('\') + '\'
    if (-not $resolvedTarget.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove native cache outside the project: $resolvedTarget"
    }

    Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
  }

  New-Item -ItemType Directory -Path $nativeCacheMarkerDirectory -Force | Out-Null
  Set-Content -LiteralPath $nativeCacheMarker -Value $expectedGradleHome -Encoding UTF8
}

if ($RepairNativeCacheOnly) {
  Write-Host 'Native build cache is ready.' -ForegroundColor Green
  exit 0
}

$env:EXPO_PACKAGER_PROXY_URL = "http://127.0.0.1:$metroPort"
if ($args -contains '--no-bundler') {
  & npx.cmd expo run:android @args
} else {
  & npx.cmd expo run:android --port $metroPort @args
}
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
