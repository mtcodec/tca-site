# AlgoHand: switch Windows auto-logon on or off for the current user (after the agent was installed without it).
# Run in a PowerShell started as Administrator on the VPS:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -useb https://algohand.com/dl/autologon.ps1 -OutFile $env:TEMP\algohand-autologon.ps1; & $env:TEMP\algohand-autologon.ps1"
#   ... -Disable      switches it off again
# Why: MetaTrader terminals only run inside a signed-in Windows session. With auto-logon Windows signs this
# user in by itself after a reboot, so the terminals and the AlgoHand agent come back without anyone
# connecting. The password is verified and then stored in the Windows LSA secret store (what Sysinternals
# Autologon does), never in the registry in clear text, and it never leaves this machine.
# ASCII only in this file: Windows PowerShell 5.1 misreads UTF-8 without a BOM.
param(
  [string]$Password = '',
  [switch]$Disable
)
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Please run this in a PowerShell window started as Administrator."
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TcaLsa {
  [StructLayout(LayoutKind.Sequential)] struct LSA_UNICODE_STRING { public ushort Length; public ushort MaximumLength; public IntPtr Buffer; }
  [StructLayout(LayoutKind.Sequential)] struct LSA_OBJECT_ATTRIBUTES { public int Length; public IntPtr RootDirectory; public IntPtr ObjectName; public uint Attributes; public IntPtr SecurityDescriptor; public IntPtr SecurityQualityOfService; }
  [DllImport("advapi32.dll")] static extern uint LsaOpenPolicy(IntPtr SystemName, ref LSA_OBJECT_ATTRIBUTES ObjectAttributes, uint DesiredAccess, out IntPtr PolicyHandle);
  [DllImport("advapi32.dll")] static extern uint LsaStorePrivateData(IntPtr PolicyHandle, ref LSA_UNICODE_STRING KeyName, IntPtr PrivateData);
  [DllImport("advapi32.dll")] static extern uint LsaClose(IntPtr ObjectHandle);
  [DllImport("advapi32.dll")] static extern uint LsaNtStatusToWinError(uint Status);
  static LSA_UNICODE_STRING Str(string s) {
    var u = new LSA_UNICODE_STRING(); u.Buffer = Marshal.StringToHGlobalUni(s);
    u.Length = (ushort)(s.Length * 2); u.MaximumLength = (ushort)((s.Length + 1) * 2); return u;
  }
  // value == null deletes the secret
  public static void SetSecret(string key, string value) {
    var attrs = new LSA_OBJECT_ATTRIBUTES(); attrs.Length = Marshal.SizeOf(attrs);
    IntPtr h; uint st = LsaOpenPolicy(IntPtr.Zero, ref attrs, 0x000F0FFF, out h);
    if (st != 0) throw new Exception("LsaOpenPolicy failed: " + LsaNtStatusToWinError(st));
    var k = Str(key);
    IntPtr pv = IntPtr.Zero;
    try {
      if (value != null) { var v = Str(value); pv = Marshal.AllocHGlobal(Marshal.SizeOf(v)); Marshal.StructureToPtr(v, pv, false); }
      st = LsaStorePrivateData(h, ref k, pv);
    } finally { Marshal.FreeHGlobal(k.Buffer); if (pv != IntPtr.Zero) Marshal.FreeHGlobal(pv); LsaClose(h); }
    if (st != 0) throw new Exception("LsaStorePrivateData failed: " + LsaNtStatusToWinError(st));
  }
}
'@

$wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
if ($Disable) {
  Set-ItemProperty $wl AutoAdminLogon '0'
  Remove-ItemProperty $wl DefaultPassword -ErrorAction SilentlyContinue
  [TcaLsa]::SetSecret('DefaultPassword', $null)
  Write-Host "Auto-logon is off. After a reboot the terminals start when you next sign in over Remote Desktop." -ForegroundColor Green
  exit 0
}

function Test-WindowsPassword([string]$password) {
  Add-Type -AssemblyName System.DirectoryServices.AccountManagement
  $type = [DirectoryServices.AccountManagement.ContextType]::Machine
  $name = $env:COMPUTERNAME
  if ($env:USERDOMAIN -and $env:USERDOMAIN -ne $env:COMPUTERNAME -and $env:USERDOMAIN -ne 'WORKGROUP') { $type = [DirectoryServices.AccountManagement.ContextType]::Domain; $name = $env:USERDOMAIN }
  try {
    $ctx = New-Object DirectoryServices.AccountManagement.PrincipalContext($type, $name)
    return $ctx.ValidateCredentials($env:USERNAME, $password)
  } catch { return $null }
}

if (-not $Password) {
  Write-Host "Auto-logon for '$env:USERNAME': Windows will sign this user in by itself after a reboot, so that the"
  Write-Host "MetaTrader terminals and the AlgoHand agent come back without anyone connecting. The password is"
  Write-Host "verified, stored in the protected Windows LSA store, and never leaves this machine."
  for ($try = 1; $try -le 3; $try++) {
    $sec = Read-Host -AsSecureString "Windows password of $env:USERNAME (or Enter to cancel)"
    $pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    if (-not $pw) { Write-Host "cancelled, nothing changed"; exit 0 }
    $ok = Test-WindowsPassword $pw
    if ($ok -eq $false) { Write-Host "    that is not the password of $env:USERNAME (attempt $try of 3)" -ForegroundColor Yellow; continue }
    if ($ok -eq $null) { Write-Host "    could not verify the password on this account type; storing it as given" -ForegroundColor Yellow }
    $Password = $pw; break
  }
  if (-not $Password) { throw "no valid password entered" }
}

$domain = $env:COMPUTERNAME
if ($env:USERDOMAIN -and $env:USERDOMAIN -ne $env:COMPUTERNAME -and $env:USERDOMAIN -ne 'WORKGROUP') { $domain = $env:USERDOMAIN }
[TcaLsa]::SetSecret('DefaultPassword', $Password)
Set-ItemProperty $wl AutoAdminLogon '1'
Set-ItemProperty $wl DefaultUserName $env:USERNAME
Set-ItemProperty $wl DefaultDomainName $domain
Remove-ItemProperty $wl DefaultPassword -ErrorAction SilentlyContinue
Remove-ItemProperty $wl AutoLogonCount -ErrorAction SilentlyContinue
Write-Host "Auto-logon is on for $domain\$env:USERNAME. After a reboot the terminals and the agent start by themselves." -ForegroundColor Green
