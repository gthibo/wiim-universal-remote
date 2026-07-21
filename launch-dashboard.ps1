# Showa Hi-Fi Counter — auto-launch script (Docker Engine via WSL2)
$projectPath = "C:\Users\mrthi\Wiim-Dashboard"
$dashboardUrl = "http://localhost:39446"
$maxWait = 120

$wslProjectPath = "/mnt/c/Users/mrthi/Wiim-Dashboard"

Write-Host "Waiting for WSL Docker to be ready..."
$elapsed = 0
while ($elapsed -lt $maxWait) {
    $result = wsl -d Ubuntu -- docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker ready after $elapsed seconds."
        break
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if ($elapsed -ge $maxWait) {
    Write-Host "Docker did not become ready in time. Aborting."
    exit 1
}

Write-Host "Starting Wiim Dashboard container..."
wsl -d Ubuntu -- bash -c "cd $wslProjectPath && docker compose up -d" 2>&1 | Write-Host

# Wait for the container to be healthy AND for WSL2 port forwarding to settle
Write-Host "Waiting for dashboard to be reachable..."
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 5
    try {
        $resp = Invoke-WebRequest -Uri "$dashboardUrl/api/health" -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            Write-Host "Dashboard ready after $($i * 5 + 5) seconds."
            break
        }
    } catch {}
}

if (-not $ready) {
    Write-Host "Dashboard did not respond in time — opening anyway."
}

Write-Host "Opening dashboard..."
Start-Process $dashboardUrl
