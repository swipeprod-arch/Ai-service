param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$marker = 'id="ai-logo-css"'
$style = @"
<style id="ai-logo-css">
  /* ЛОГО: /images/ai-logo.png + запасной градиент */
  .nav a.brand{
    display:flex !important;
    align-items:center !important;
    gap:10px !important;
    text-decoration:none !important;
  }
  .nav a.brand .logo{
    width: 36px !important;
    height: 36px !important;
    flex: 0 0 auto !important;
    border-radius: 999px !important;
    background:
      url("/images/ai-logo.png") center / cover no-repeat,
      linear-gradient(135deg, #1E78FF 0%, #00B7FF 100%) !important;
  }

  /* Мобильный хедер: логотип всегда виден, название можно скрыть */
  @media (max-width: 560px){
    .nav a.brand{ flex: 0 0 auto !important; min-width: auto !important; }
    /* скрываем любой текстовый span внутри бренда (оставляем только .logo) */
    .nav a.brand span:not(.logo){
      display:none !important;
    }
    .nav a.brand .logo{
      width: 34px !important;
      height: 34px !important;
    }
    .nav .nav-cta{
      flex-wrap: wrap !important;
      justify-content: flex-end;
    }
  }
</style>
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$rootPath = Resolve-Path $Root

$styleRegex = New-Object System.Text.RegularExpressions.Regex('(?s)<style id="ai-logo-css">.*?</style>\s*')
$headRegex = New-Object System.Text.RegularExpressions.Regex('</head>')
$bodyRegex = New-Object System.Text.RegularExpressions.Regex('</body>')

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter "*.html" | Where-Object {
  $p = $_.FullName
  ($p -notmatch '\\\\files\\\\') -and
  ($p -notmatch '\\\\tools\\\\') -and
  ($_.Name -notlike 'seed-*') -and
  ($_.Name -ne 'test-email.html')
}

Write-Host ("Scanning HTML files: " + $files.Count)

$patched = 0
$skipped = 0

foreach($f in $files){
  $p = $f.FullName
  $txt = [System.IO.File]::ReadAllText($p, $utf8NoBom)

  # 1) Если стиль уже есть — ОБНОВЛЯЕМ его на актуальную версию (и убираем дубли)
  $m = $styleRegex.Matches($txt)
  if($m.Count -ge 1){
    # заменяем ПЕРВЫЙ блок на актуальный $style
    $txt = $styleRegex.Replace($txt, $style, 1)
    # удаляем остальные дубли (если есть)
    if($m.Count -gt 1){
      $txt = $styleRegex.Replace($txt, '', ($m.Count - 1))
    }
    $patched++
  }

  # 2) Если стиля нет — вставляем один раз
  if(-not ($txt -like "*$marker*")){
    if($headRegex.IsMatch($txt)){
      $txt = $headRegex.Replace($txt, ($style + '</head>'), 1)
    } elseif($bodyRegex.IsMatch($txt)){
      $txt = $bodyRegex.Replace($txt, ($style + '</body>'), 1)
    } else {
      $txt = $txt + "`n" + $style
    }
    $patched++
  } else {
    $skipped++
  }

  [System.IO.File]::WriteAllText($p, $txt, $utf8NoBom)
}

Write-Host ("Injected ai-logo-css into: " + $patched + " files; skipped (already injected): " + $skipped)



