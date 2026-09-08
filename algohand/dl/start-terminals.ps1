# TCA terminal launcher (bundled with the agent; the agent refreshes <root>\agent\start-terminals.ps1 from it).
#
#   -Interactive : called by the at-logon task inside the user's session -> terminals visible over RDP.
#   (no switch)  : called by the at-startup task in session 0 -> waits up to 120 s for a user session
#                  (autologon); if present, hands over to the interactive task. Only AlgoHand's own portable
#                  terminals under <root>\terminals\ may ever be started headless in session 0; a terminal the
#                  customer installed is never started there (it would be invisible to them and fail to open
#                  charts) - it waits for the interactive task at the next logon.
#
# Terminals: <root>\terminals\<name>\ (ours, /portable) plus the ones the agent discovered (state\terminals.json),
# started as  terminal64.exe [/portable] [/config:<root>\agent\<name>-startup.ini]  where the ini, when present,
# contains ONLY the [StartUp] section attaching TCA\TcaManager (service mode needs no ini at all).
# ASCII only in this file: Windows PowerShell 5.1 misreads UTF-8 without a BOM.
param([switch]$Interactive)
$agentDir = $PSScriptRoot
$root = Split-Path $agentDir -Parent
New-Item -ItemType Directory -Force -Path (Join-Path $root 'logs') | Out-Null
$log = Join-Path $root 'logs\launcher.log'
$mySession = [System.Diagnostics.Process]::GetCurrentProcess().SessionId
function Log($m) { Add-Content -Path $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " [$(if ($Interactive) {'interactive'} else {'startup'}) s$mySession] " + $m) }
function Running($exe) { Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object Path -eq $exe }
function Terminals() {
  $list = @()
  foreach ($t in Get-ChildItem (Join-Path $root 'terminals') -Directory -ErrorAction SilentlyContinue) {
    $list += [pscustomobject]@{ name = $t.Name; path = $t.FullName; portable = $true; own = $true; ini = (Join-Path $agentDir "$($t.Name)-startup.ini") }
  }
  $json = Join-Path $agentDir 'state\terminals.json'
  if (Test-Path $json) {
    foreach ($d in (Get-Content $json -Raw | ConvertFrom-Json)) {
      if ($list | Where-Object path -eq $d.path) { continue }
      $ini = if ($d.startup_ini) { $d.startup_ini } else { (Join-Path $agentDir "$($d.name)-startup.ini") }
      $list += [pscustomobject]@{ name = $d.name; path = $d.path; portable = [bool]$d.portable; own = $false; ini = $ini }
    }
  }
  return $list
}
function StopHeadlessCopies() {
  # a copy of one of our terminals running in session 0 (started headless by an older launcher after a reboot)
  # is invisible to the customer and cannot open charts: close it so the visible start below can take its place
  foreach ($t in Terminals) {
    $exe = Join-Path $t.path 'terminal64.exe'
    foreach ($p in (Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe -and $_.SessionId -eq 0 })) {
      Log "$($t.name): closing the headless copy in session 0 (pid $($p.Id)) before starting it here"
      try { $p.CloseMainWindow() | Out-Null; if (-not $p.WaitForExit(20000)) { Stop-Process -Id $p.Id -Force } } catch { try { Stop-Process -Id $p.Id -Force } catch {} }
      Start-Sleep 3
    }
  }
}
function StartAll($how) {
  foreach ($t in Terminals) {
    $exe = Join-Path $t.path 'terminal64.exe'; $ini = $t.ini
    if (-not (Test-Path $exe)) { continue }
    if (Running $exe) { Log "$($t.name): already running"; continue }
    $argList = @(@($(if ($t.portable) { '/portable' } else { '' }), $(if (Test-Path $ini) { "/config:$ini" } else { '' })) | Where-Object { $_ })
    $args = $argList -join ' '
    if ($how -eq 'session') {
      try {
        if ($argList.Count -gt 0) { $p = Start-Process -FilePath $exe -ArgumentList $argList -WorkingDirectory $t.path -PassThru }
        else { $p = Start-Process -FilePath $exe -WorkingDirectory $t.path -PassThru }
        Log "$($t.name): started in session $($p.SessionId) pid $($p.Id) ($args)"
      } catch { Log "$($t.name): Start-Process failed: $_" }
    } elseif (-not $t.own) {
      # the customer's terminal: never headless - invisible over RDP, charts fail in session 0, and a standard
      # install would even run with SYSTEM's profile. The at-logon task starts it when the user logs in.
      Log "$($t.name): customer terminal and no user session - left for the interactive task (never started in session 0)"
    } else {
      $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "`"$exe`" $args"; CurrentDirectory = $t.path }
      Log "$($t.name): started headless pid $($r.ProcessId) (return $($r.ReturnValue))"
    }
    Start-Sleep 15   # never start the next terminal while the previous one is still initialising
  }
}
Log "launcher start"
if ($Interactive) {
  StopHeadlessCopies
  StartAll 'session'
} else {
  $deadline = (Get-Date).AddSeconds(120); $found = $false
  while ((Get-Date) -lt $deadline) {
    $q = (quser 2>$null) -join "`n"
    # any logged-on user session (Active, or Disc after an RDP disconnect) counts; after an RDP disconnect quser
    # shows no session name, so the name column is optional
    if ($q -match '(?m)^\s*>?\s*[^\s>]+\s+(?:(?:console|rdp-tcp#\d+)\s+)?\d+\s+(Active|Disc)') { $found = $true; break }
    Start-Sleep 5
  }
  if ($found) {
    Log "user session present -> handing over to TCA-Terminals-Interactive"
    Start-ScheduledTask -TaskName 'TCA-Terminals-Interactive'
    $n = @(Terminals).Count
    Start-Sleep (60 + 20 * $n)   # the interactive task starts them one by one, 15 s apart, and MT5 takes its time
    foreach ($t in Terminals) { if ((Test-Path (Join-Path $t.path 'terminal64.exe')) -and -not (Running (Join-Path $t.path 'terminal64.exe'))) { Log "$($t.name): not running after the interactive task" } }
    StartAll 'headless'      # only AlgoHand's own portable terminals; customer terminals are logged and left alone
  } else {
    Log "no user session within 120 s -> headless start of AlgoHand's own terminals only"
    StartAll 'headless'
  }
}
Log "launcher done"
