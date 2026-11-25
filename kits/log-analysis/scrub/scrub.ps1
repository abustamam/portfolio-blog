<#
.SYNOPSIS
  Replace private values in a log file with placeholders, before any AI sees it.

.DESCRIPTION
  Reads the input file, writes a scrubbed copy, and prints how many values each
  rule replaced. The input file is never changed. Runs in Windows PowerShell 5.1
  or PowerShell 7, entirely on this machine: nothing is sent anywhere.

  The rules below are the same, in the same order, as the RULES in scrub.py.
  If you add a rule, add it to both files. Rules run top to bottom, so the
  specific ones (tokens, keys) come before the general ones (emails, numbers).
  Regexes are not a guarantee: always read a sample of the output before you
  share it.

.EXAMPLE
  .\scrub.ps1 -InputPath .\app.log -OutputPath .\app.scrubbed.log

  If scripts are blocked on your machine, run it once with:
  powershell -ExecutionPolicy Bypass -File .\scrub.ps1 -InputPath .\app.log -OutputPath .\app.scrubbed.log
#>
param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'

# (name, pattern, placeholder)
$RULES = @(
    @('bearer token', '(?<=[Bb]earer )[A-Za-z0-9._~+/=-]+', '<TOKEN>'),
    @('jwt', '\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '<TOKEN>'),
    @('api key', '(?<=api_key=)[^\s&]+', '<SECRET>'),
    @('email', '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '<EMAIL>'),
    @('card number', '\b[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{1,4}\b', '<CARD>'),
    @('ip address', '\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', '<IP>'),
    @('user id', '\busr_[A-Za-z0-9]+\b', '<USER_ID>')
)

# Resolve relative paths against the current folder, not the process's.
$src = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InputPath)
$dst = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)

# Read and write the whole file as UTF-8 without a BOM, keeping its own line
# endings, so the output matches scrub.py byte for byte.
$utf8 = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($src, $utf8)

foreach ($rule in $RULES) {
  $name, $pattern, $placeholder = $rule
  # [regex] is case-sensitive, like Python's re (PowerShell's -replace is not).
  $n = [regex]::Matches($text, $pattern).Count
  $text = [regex]::Replace($text, $pattern, $placeholder)
  Write-Output ('{0,13}: {1} replaced' -f $name, $n)
}

[System.IO.File]::WriteAllText($dst, $text, $utf8)
Write-Output "wrote $dst"
