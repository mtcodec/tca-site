# Launcher loop for the TCA agent (scheduled task TCA-Agent runs this script).
# Runs the release named in D:\TCA\agent\releases\current.txt (falls back to the source checkout),
# restarts the agent whenever it exits (auto-update exits on purpose), and rolls back to
# previous.txt if a new release dies three times within its first minute.
# Install root is derived from this script's location (<root>\agent\run-agent.ps1): D:\TCA on the test VPS,
# C:\TCA on machines without a D: drive.
$base = $PSScriptRoot                                   # <root>\agent
$root = Split-Path $base -Parent                        # <root>
$py = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python313\python.exe'
$fallback = Join-Path $root 'src\agent'
$log = Join-Path $root 'logs\agent.out.log'
$env:TCA_AGENT_CONFIG = Join-Path $base 'agent.local.yaml'     # the agent's built-in default is D:\TCA\agent\agent.local.yaml
New-Item -ItemType Directory -Force -Path (Join-Path $root 'logs') | Out-Null
$crashes = 0

function Get-AgentDir {
  $cur = Join-Path $base 'releases\current.txt'
  if (Test-Path $cur) {
    $d = (Get-Content $cur -Raw).Trim()
    if ($d -and ((Test-Path (Join-Path $d 'tca_agent\__init__.py')) -or (Test-Path (Join-Path $d 'tca-agent.exe')))) { return $d }
  }
  return $fallback
}

while ($true) {
  $dir = Get-AgentDir
  Set-Location $dir
  $exe = Join-Path $dir 'tca-agent.exe'
  "$(Get-Date -Format s) launcher: starting agent from $dir$(if (Test-Path $exe) { ' (exe)' })" | Add-Content $log
  $t0 = Get-Date
  if (Test-Path $exe) { & $exe run *>> $log } else { & $py -X utf8 -m tca_agent run *>> $log }
  $code = $LASTEXITCODE
  $ran = ((Get-Date) - $t0).TotalSeconds
  "$(Get-Date -Format s) launcher: agent exited code=$code after $([int]$ran)s" | Add-Content $log
  if ($ran -lt 60) { $crashes++ } else { $crashes = 0 }
  $prev = Join-Path $base 'releases\previous.txt'
  if ($crashes -ge 3 -and (Test-Path $prev)) {
    Copy-Item $prev (Join-Path $base 'releases\current.txt') -Force
    Remove-Item $prev -Force
    "$(Get-Date -Format s) launcher: rolled back to $((Get-Content (Join-Path $base 'releases\current.txt') -Raw).Trim())" | Add-Content $log
    $crashes = 0
  }
  Start-Sleep -Seconds 5
}
