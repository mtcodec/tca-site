# TCA terminal launcher (interim, until the agent service owns the terminal processes).
#
#   -Interactive : called by the at-logon task inside the console session -> terminals visible in RDP.
#   (no switch)  : called by the at-startup task in session 0 -> waits up to 120 s for the console
#                  session (autologon); if present, hands over to the interactive task, otherwise
#                  starts the terminals headless in session 0 (needs SharedSection=...,8192).
#
# Terminals live in D:\TCA\terminals\<name>\ and are started with
#   terminal64.exe /portable /config:D:\TCA\agent\<name>-startup.ini
# where the ini contains ONLY the [StartUp] section attaching TCA\TcaManager.
param([switch]$Interactive)
# Install root from this script's location (<root>\agent\start-terminals.ps1): D:\TCA or C:\TCA.
$agentDir = $PSScriptRoot
$root = Split-Path $agentDir -Parent
New-Item -ItemType Directory -Force -Path (Join-Path $root 'logs') | Out-Null
$log = Join-Path $root 'logs\launcher.log'
function Log($m) { Add-Content -Path $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " [$(if ($Interactive) {'interactive'} else {'startup'})] " + $m) }
function Running($exe) { Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object Path -eq $exe }
function Terminals() {
  # our portable terminals under D:\TCA\terminals\<name> plus the ones the agent discovered (state\terminals.json)
  $list = @()
  foreach ($t in Get-ChildItem (Join-Path $root 'terminals') -Directory -ErrorAction SilentlyContinue) {
    $list += [pscustomobject]@{ name = $t.Name; path = $t.FullName; portable = $true; ini = (Join-Path $agentDir "$($t.Name)-startup.ini") }
  }
  $json = Join-Path $agentDir 'state\terminals.json'
  if (Test-Path $json) {
    foreach ($d in (Get-Content $json -Raw | ConvertFrom-Json)) {
      if ($list | Where-Object path -eq $d.path) { continue }
      $ini = if ($d.startup_ini) { $d.startup_ini } else { (Join-Path $agentDir "$($d.name)-startup.ini") }
      $list += [pscustomobject]@{ name = $d.name; path = $d.path; portable = [bool]$d.portable; ini = $ini }
    }
  }
  return $list
}
function StartAll($how) {
  foreach ($t in Terminals) {
    $exe = Join-Path $t.path 'terminal64.exe'; $ini = $t.ini
    if (-not (Test-Path $exe)) { continue }
    if (Running $exe) { Log "$($t.name): already running"; continue }
    # arguments: /portable for our own terminals, /config:<ini> only while the ini exists (chart-EA mode);
    # in service mode (the manager started by the terminal from config\services.ini) there may be none at all
    $argList = @(@($(if ($t.portable) { '/portable' } else { '' }), $(if (Test-Path $ini) { "/config:$ini" } else { '' })) | Where-Object { $_ })
    $args = $argList -join ' '
    if ($how -eq 'session') {
      try {
        # Start-Process rejects an empty -ArgumentList, hence the two forms
        if ($argList.Count -gt 0) { $p = Start-Process -FilePath $exe -ArgumentList $argList -WorkingDirectory $t.path -PassThru }
        else { $p = Start-Process -FilePath $exe -WorkingDirectory $t.path -PassThru }
        Log "$($t.name): started in session $($p.SessionId) pid $($p.Id) ($args)"
      } catch { Log "$($t.name): Start-Process failed: $_" }
    } elseif (-not $t.portable) {
      # a standard install started headless would run as SYSTEM with SYSTEM's profile: another data directory,
      # no account, none of our files - never right. Leave it; the agent's watchdog retries through the launcher.
      Log "$($t.name): standard install and no interactive session - not starting it headless"
    } else {
      $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "`"$exe`" $args"; CurrentDirectory = $t.path }
      Log "$($t.name): started headless pid $($r.ProcessId) (return $($r.ReturnValue))"
    }
    Start-Sleep 15   # never start the next terminal while the previous one is still initialising
  }
}
Log "launcher start (session $([System.Diagnostics.Process]::GetCurrentProcess().SessionId))"
if ($Interactive) {
  StartAll 'session'
} else {
  $deadline = (Get-Date).AddSeconds(120); $found = $false
  while ((Get-Date) -lt $deadline) {
    $q = (quser 2>$null) -join "`n"
    # any logged-on user session (Active, or Disc after an RDP disconnect) is a valid interactive session for
    # the at-logon task; after an RDP disconnect quser shows NO session name, so the name column is optional
    if ($q -match '(?m)^\s*>?\s*[^\s>]+\s+(?:(?:console|rdp-tcp#\d+)\s+)?\d+\s+(Active|Disc)') { $found = $true; break }
    Start-Sleep 5
  }
  if ($found) {
    Log "console session present -> handing over to TCA-Terminals-Interactive"
    Start-ScheduledTask -TaskName 'TCA-Terminals-Interactive'
    Start-Sleep 60
    foreach ($t in Terminals) { if ((Test-Path (Join-Path $t.path 'terminal64.exe')) -and -not (Running (Join-Path $t.path 'terminal64.exe'))) { Log "$($t.name): not started by interactive task -> headless fallback" } }
    StartAll 'headless'
  } else {
    Log "no console session within 120 s -> headless fallback"
    StartAll 'headless'
  }
}
Log "launcher done"
