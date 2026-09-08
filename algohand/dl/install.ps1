# AlgoHand agent installer (bootstrap). Run on the Windows VPS in a PowerShell started as Administrator:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -useb https://algohand.com/dl/install.ps1 -OutFile $env:TEMP\algohand-install.ps1; & $env:TEMP\algohand-install.ps1 -Token enr_..."
# Downloads the signed agent and the launcher scripts from algohand.com/dl/, installs the agent as scheduled
# tasks under C:\TCA, enrols this machine with the activation token and, if you allow it, sets Windows
# auto-logon so that the terminals come back visibly after a reboot. Outbound HTTPS only, no inbound port.
# ASCII only in this file: Windows PowerShell 5.1 misreads UTF-8 without a BOM.
param(
  [Parameter(Mandatory)][string]$Token,
  [string]$Root = 'C:\TCA',
  [string]$Base = 'https://algohand.com/dl',
  [string]$ServerUrl = 'https://agent.algohand.com',
  [string]$AutoLogon = '',
  [switch]$NoPrompt
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Activity = 'AlgoHand agent setup'

function Step([int]$n, [string]$text, [int]$pct) {
  Write-Progress -Id 1 -Activity $Activity -Status "Step $n of 4: $text" -PercentComplete $pct
  Write-Host "==> $text"
}

function Get-FileWithProgress([string]$url, [string]$dest, [int]$n, [string]$label, [int]$from, [int]$to) {
  # Invoke-WebRequest's own progress bar makes downloads painfully slow on PowerShell 5.1; stream the file by hand.
  $req = [Net.HttpWebRequest]::Create($url)
  $req.UserAgent = 'AlgoHand-installer'
  $resp = $req.GetResponse()
  try {
    $total = $resp.ContentLength
    $in = $resp.GetResponseStream()
    $out = [IO.File]::Create($dest)
    try {
      $buf = New-Object byte[] 262144
      $done = 0L; $lastPct = -1
      while (($read = $in.Read($buf, 0, $buf.Length)) -gt 0) {
        $out.Write($buf, 0, $read); $done += $read
        if ($total -gt 0) {
          $pct = [int](100 * $done / $total)
          if ($pct -ne $lastPct) {
            $lastPct = $pct
            $mb = '{0:N1} of {1:N1} MB' -f ($done / 1MB), ($total / 1MB)
            Write-Progress -Id 1 -Activity $Activity -Status "Step $n of 4: downloading $label ($mb)" -PercentComplete ($from + ($to - $from) * $pct / 100)
          }
        }
      }
    } finally { $out.Dispose(); $in.Dispose() }
  } finally { $resp.Close() }
}

function Test-WindowsPassword([string]$password) {
  Add-Type -AssemblyName System.DirectoryServices.AccountManagement
  $type = [DirectoryServices.AccountManagement.ContextType]::Machine
  $name = $env:COMPUTERNAME
  if ($env:USERDOMAIN -and $env:USERDOMAIN -ne $env:COMPUTERNAME -and $env:USERDOMAIN -ne 'WORKGROUP') { $type = [DirectoryServices.AccountManagement.ContextType]::Domain; $name = $env:USERDOMAIN }
  try {
    $ctx = New-Object DirectoryServices.AccountManagement.PrincipalContext($type, $name)
    return $ctx.ValidateCredentials($env:USERNAME, $password)
  } catch { return $null }   # cannot tell (unusual account setup): let the caller decide
}

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Please run this in a PowerShell window started as Administrator."
}
$tmp = Join-Path $env:TEMP ('algohand-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Step 1 "downloading the AlgoHand agent from $Base" 0
Get-FileWithProgress "$Base/tca-agent.exe" (Join-Path $tmp 'tca-agent.exe') 1 'tca-agent.exe' 0 55
foreach ($f in 'install-agent.ps1', 'run-agent.ps1', 'start-terminals.ps1') {
  Get-FileWithProgress "$Base/$f" (Join-Path $tmp $f) 1 $f 55 60
}

Step 2 "checking the digital signature" 60
$exe = Join-Path $tmp 'tca-agent.exe'
$sig = Get-AuthenticodeSignature $exe
if ($sig.Status -ne 'Valid') { Write-Warning "tca-agent.exe signature: $($sig.Status). Continuing (early access build)." }
else { Write-Host "    signed by $($sig.SignerCertificate.Subject)" }

if (-not $AutoLogon -and -not $NoPrompt) {
  Write-Progress -Id 1 -Activity $Activity -Status 'Step 3 of 4: one question before installing' -PercentComplete 62
  Write-Host ""
  Write-Host "Auto-logon after a reboot (recommended on a VPS)" -ForegroundColor Cyan
  Write-Host "  MetaTrader terminals only run inside a signed-in Windows session. When the VPS reboots, nobody is"
  Write-Host "  signed in, so the terminals - and your robots - stay down until you connect over Remote Desktop."
  Write-Host "  Windows can sign in the user '$env:USERNAME' by itself, but for that it must have this user's"
  Write-Host "  password stored on this machine (Windows keeps it in the protected LSA store, the same place the"
  Write-Host "  Sysinternals Autologon tool uses). Administrator rights do not give access to the password, which is"
  Write-Host "  why the installer has to ask. The password never leaves this machine; AlgoHand does not receive it."
  Write-Host "  Press Enter to skip: then the terminals start when you next sign in over Remote Desktop."
  Write-Host ""
  for ($try = 1; $try -le 3; $try++) {
    $sec = Read-Host -AsSecureString "Windows password of $env:USERNAME (or Enter to skip)"
    $pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    if (-not $pw) { Write-Host "    skipped: no auto-logon"; break }
    $ok = Test-WindowsPassword $pw
    if ($ok -eq $false) { Write-Host "    that is not the password of $env:USERNAME (attempt $try of 3)" -ForegroundColor Yellow; continue }
    if ($ok -eq $null) { Write-Host "    could not verify the password on this account type; storing it as given" -ForegroundColor Yellow }
    $AutoLogon = $pw; break
  }
}

Step 3 "installing into $Root" 65
$args = @{ Root = $Root; Exe = $exe; EnrollToken = $Token; ServerUrl = $ServerUrl }
if ($AutoLogon) { $args['AutoLogon'] = $AutoLogon }
& (Join-Path $tmp 'install-agent.ps1') @args

Step 4 "waiting for the first contact with AlgoHand" 90
$log = Join-Path $Root 'logs\agent.log'
$deadline = (Get-Date).AddSeconds(60); $seen = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 3
  if ((Test-Path $log) -and (Select-String -Path $log -Pattern 'enrolled|heartbeat|state sent|poll' -Quiet)) { $seen = $true; break }
}
Write-Progress -Id 1 -Activity $Activity -Completed
Write-Host ""
if ($seen) { Write-Host "Done. The VPS is talking to AlgoHand; it appears in your dashboard now." -ForegroundColor Green }
else { Write-Host "Installed. The agent is starting; the VPS appears in the dashboard within a minute or two." -ForegroundColor Green }
Write-Host "    Keep your MetaTrader terminals logged in. The agent restarts them once to attach its manager."
Write-Host "    Log file: $log"
