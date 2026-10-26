#Requires -Version 5.1
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [switch]$Enable
)
$ErrorActionPreference = 'Stop'
$configFull = (Resolve-Path -LiteralPath $ConfigPath).Path
$nodeFull = (Resolve-Path -LiteralPath $NodePath).Path
$watcher = Join-Path $PSScriptRoot 'watch-release.mjs'
if ($configFull.Contains('"') -or $nodeFull.Contains('"')) { throw 'Invalid path' }
$action = New-ScheduledTaskAction -Execute $nodeFull -Argument ('"{0}" "{1}"' -f $watcher,$configFull) -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
if (-not $Enable) {
  Write-Output 'Preview only. With -Enable this registers Cat Coup Deploy for the current signed-in user every five minutes.'
  Write-Output 'Docker Desktop must already be running. Existing tasks are never overwritten.'
  $action | Select-Object Execute,Arguments,WorkingDirectory
  return
}
if (Get-ScheduledTask -TaskName 'Cat Coup Deploy' -ErrorAction SilentlyContinue) { throw 'Task exists; inspect it before changes.' }
Register-ScheduledTask -TaskName 'Cat Coup Deploy' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Pull explicitly promoted Cat Coup releases; drain before replacing the app.'
