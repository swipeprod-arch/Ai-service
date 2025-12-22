param(
  [string]$Root = ".",
  [string]$NewToken = ""
)

$ErrorActionPreference = "Stop"

if([string]::IsNullOrWhiteSpace($NewToken)){
  # простой токен, чтобы гарантированно обойти кеш (секунды Unix)
  $NewToken = [string][int]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$rootPath = Resolve-Path $Root

$pattern = 'css/custom\.css\?t=\d+'
$replacement = ('css/custom.css?t=' + $NewToken)

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter "*.html" | Where-Object {
  $p = $_.FullName
  ($p -notmatch '\\\\tools\\\\') -and (Select-String -Path $p -Pattern $pattern -Quiet)
}

Write-Host ("Found HTML files with custom.css token: " + $files.Count)

$updated = 0
foreach($f in $files){
  $p = $f.FullName
  $txt = [System.IO.File]::ReadAllText($p, $utf8NoBom)
  $txt2 = [System.Text.RegularExpressions.Regex]::Replace($txt, $pattern, $replacement)
  if($txt2 -ne $txt){
    [System.IO.File]::WriteAllText($p, $txt2, $utf8NoBom)
    $updated++
  }
}

Write-Host ("Updated files: " + $updated + " (token=" + $NewToken + ")")


