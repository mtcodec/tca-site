<#
.SYNOPSIS
  Installs the TCA agent on a Windows VPS (image build or a single machine). Run elevated.

.DESCRIPTION
  Layout: <Root>\agent\{tca-agent.exe, agent.local.yaml, run-agent.ps1, start-terminals.ps1, state\, releases\}
          <Root>\logs\
  Tasks:  TCA-Agent                 at startup  (SYSTEM)        launcher loop -> tca-agent.exe run
          TCA-Terminals             at startup  (SYSTEM)        waits for the interactive session, hands over
          TCA-Terminals-Interactive at logon    (interactive)   starts the terminals visibly (visible mode)
  Optional: -AutoLogon <password> configures Windows autologon for the current user so the interactive
  session exists after a reboot without anyone connecting (visible mode requirement).

  The agent needs no Python and no inbound port: outbound HTTPS to agent.algohand.com only.
  Terminals are discovered automatically (discovery: true); -Terminals may pin them.

.EXAMPLE
  .\install-agent.ps1 -Root C:\TCA -Exe .\tca-agent.exe -EnrollToken enr_... -ExternalRef "VPS-3391-LDN" -AutoLogon 'P@ss'
#>
param(
  [string]$Root = 'C:\TCA',
  [Parameter(Mandatory)][string]$Exe,               # path to tca-agent.exe (from a signed release)
  [Parameter(Mandatory)][string]$EnrollToken,       # from POST /v1/clients/{client_id}/vps
  [string]$ServerUrl = 'https://agent.algohand.com',
  [string]$ExternalRef = '',
  [string]$AutoLogon = '',                          # password of the current user -> Windows autologon (LSA secret)
  [string]$ManagerSymbol = 'EURUSD'
)
$ErrorActionPreference = 'Stop'
$agentDir = Join-Path $Root 'agent'
New-Item -ItemType Directory -Force -Path $agentDir, (Join-Path $agentDir 'state'), (Join-Path $agentDir 'releases'), (Join-Path $Root 'logs') | Out-Null
$here = $PSScriptRoot

Write-Host "==> agent binary and launcher scripts -> $agentDir"
$rel = Join-Path $agentDir 'releases\installed'
New-Item -ItemType Directory -Force -Path $rel | Out-Null
Copy-Item $Exe (Join-Path $rel 'tca-agent.exe') -Force
Set-Content -Path (Join-Path $agentDir 'releases\current.txt') -Value $rel -Encoding ASCII
foreach ($f in 'run-agent.ps1', 'start-terminals.ps1') {
  $src = Join-Path $here $f
  if (-not (Test-Path $src)) { throw "missing $src (run from the deploy\windows folder of a release)" }
  Copy-Item $src (Join-Path $agentDir $f) -Force
}

Write-Host "==> agent.local.yaml"
$cfg = Join-Path $agentDir 'agent.local.yaml'
if (-not (Test-Path $cfg)) {
@"
server_url: $ServerUrl
tls: pinned
enroll_token: $EnrollToken
external_ref: $ExternalRef
agent_dir: $agentDir
state_dir: $agentDir\state
releases_dir: $agentDir\releases
log_file: $Root\logs\agent.log
launcher_task: TCA-Terminals
discovery: true
manager_symbol: $ManagerSymbol
maintenance_window_utc: '03:00-05:00'
terminals: []
"@ | Set-Content -Path $cfg -Encoding UTF8
} else { Write-Host "    exists, left untouched" }

Write-Host "==> scheduled tasks"
$noLimit = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$sys = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -RunLevel Highest
$me = [Security.Principal.WindowsIdentity]::GetCurrent().Name     # e.g. VPSNAME\trader (USERDOMAIN is 'WORKGROUP' on some VPS images)
# Visible mode: the agent runs in the user's interactive session (at logon), the same session as the
# terminals - MetaTrader5's IPC attaches to a standard-install terminal only from its own session.
Register-ScheduledTask -TaskName 'TCA-Agent' -Force -User $me -RunLevel Highest -Settings $noLimit -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $me) `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentDir\run-agent.ps1`"") | Out-Null
Register-ScheduledTask -TaskName 'TCA-Terminals' -Force -Principal $sys -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10)) -Trigger (New-ScheduledTaskTrigger -AtStartup) `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentDir\start-terminals.ps1`"") | Out-Null
$logon = New-ScheduledTaskTrigger -AtLogOn -User $me
Register-ScheduledTask -TaskName 'TCA-Terminals-Interactive' -Force -User $me -RunLevel Highest -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10)) -Trigger $logon `
  -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentDir\start-terminals.ps1`" -Interactive") | Out-Null

if ($AutoLogon) {
  Write-Host "==> autologon for $me (visible mode)"
  # The password goes into the LSA secret "DefaultPassword" (what Sysinternals Autologon does), not into the
  # registry in clear text: Winlogon reads the secret when the registry value DefaultPassword is absent.
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TcaLsa {
  [StructLayout(LayoutKind.Sequential)] struct LSA_UNICODE_STRING { public ushort Length; public ushort MaximumLength; public IntPtr Buffer; }
  [StructLayout(LayoutKind.Sequential)] struct LSA_OBJECT_ATTRIBUTES { public int Length; public IntPtr RootDirectory; public IntPtr ObjectName; public uint Attributes; public IntPtr SecurityDescriptor; public IntPtr SecurityQualityOfService; }
  [DllImport("advapi32.dll")] static extern uint LsaOpenPolicy(IntPtr SystemName, ref LSA_OBJECT_ATTRIBUTES ObjectAttributes, uint DesiredAccess, out IntPtr PolicyHandle);
  [DllImport("advapi32.dll")] static extern uint LsaStorePrivateData(IntPtr PolicyHandle, ref LSA_UNICODE_STRING KeyName, ref LSA_UNICODE_STRING PrivateData);
  [DllImport("advapi32.dll")] static extern uint LsaClose(IntPtr ObjectHandle);
  [DllImport("advapi32.dll")] static extern uint LsaNtStatusToWinError(uint Status);
  static LSA_UNICODE_STRING Str(string s) {
    var u = new LSA_UNICODE_STRING(); u.Buffer = Marshal.StringToHGlobalUni(s);
    u.Length = (ushort)(s.Length * 2); u.MaximumLength = (ushort)((s.Length + 1) * 2); return u;
  }
  public static void SetSecret(string key, string value) {
    var attrs = new LSA_OBJECT_ATTRIBUTES(); attrs.Length = Marshal.SizeOf(attrs);
    IntPtr h; uint st = LsaOpenPolicy(IntPtr.Zero, ref attrs, 0x000F0FFF, out h);
    if (st != 0) throw new Exception("LsaOpenPolicy failed: " + LsaNtStatusToWinError(st));
    var k = Str(key); var v = Str(value);
    try { st = LsaStorePrivateData(h, ref k, ref v); }
    finally { Marshal.FreeHGlobal(k.Buffer); Marshal.FreeHGlobal(v.Buffer); LsaClose(h); }
    if (st != 0) throw new Exception("LsaStorePrivateData failed: " + LsaNtStatusToWinError(st));
  }
}
'@
  [TcaLsa]::SetSecret('DefaultPassword', $AutoLogon)
  $wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
  Set-ItemProperty $wl AutoAdminLogon '1'
  Set-ItemProperty $wl DefaultUserName $env:USERNAME
  $domain = $env:COMPUTERNAME                       # local account; USERDOMAIN is 'WORKGROUP' on some VPS images
  if ($env:USERDOMAIN -and $env:USERDOMAIN -ne $env:COMPUTERNAME -and $env:USERDOMAIN -ne 'WORKGROUP') { $domain = $env:USERDOMAIN }
  Set-ItemProperty $wl DefaultDomainName $domain
  Remove-ItemProperty $wl DefaultPassword -ErrorAction SilentlyContinue
  Remove-ItemProperty $wl AutoLogonCount -ErrorAction SilentlyContinue
}

Write-Host "==> starting the agent"
Start-ScheduledTask -TaskName 'TCA-Agent'
Start-Sleep -Seconds 20
Get-Content (Join-Path $Root 'logs\agent.log') -Tail 5 -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Installed. Terminals the user starts are discovered within 5 minutes; check state via the API." -ForegroundColor Green
