param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$marker = 'id="ai-mobile-brand-hide"'
$snippet = @"
<script id="ai-mobile-brand-hide">
(function(){
  function apply(){
    try{
      var isMobile = window.matchMedia && window.matchMedia('(max-width: 560px)').matches;
      var nodes = document.querySelectorAll('.nav a.brand span:not(.logo)');
      nodes.forEach(function(sp){
        try{
          if(isMobile) sp.style.setProperty('display','none','important');
          else sp.style.removeProperty('display');
        }catch(e){}
      });
    }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  window.addEventListener('resize', apply);
  setTimeout(apply, 200);
  setTimeout(apply, 900);
})();
</script>
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$rootPath = Resolve-Path $Root

$headRegex = New-Object System.Text.RegularExpressions.Regex('</head>')
$bodyRegex = New-Object System.Text.RegularExpressions.Regex('</body>')
$snippetRegex = New-Object System.Text.RegularExpressions.Regex('(?s)<script id="ai-mobile-brand-hide">.*?</script>\s*')

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter "*.html" | Where-Object {
  $p = $_.FullName
  ($p -notmatch '\\\\tools\\\\') -and
  (Select-String -Path $p -Pattern 'class="nav"' -Quiet)
}

Write-Host ("Found HTML files with nav: " + $files.Count)

$patched = 0
$skipped = 0

foreach($f in $files){
  $p = $f.FullName
  $txt = [System.IO.File]::ReadAllText($p, $utf8NoBom)

  # дедупликация (если вдруг уже вставляли несколько раз)
  $m = $snippetRegex.Matches($txt)
  if($m.Count -gt 1){
    $txt = $snippetRegex.Replace($txt, $snippet, 1)
    $txt = $snippetRegex.Replace($txt, '', ($m.Count - 1))
    $patched++
  }

  if($txt -like "*$marker*"){
    $skipped++
    [System.IO.File]::WriteAllText($p, $txt, $utf8NoBom)
    continue
  }

  if($headRegex.IsMatch($txt)){
    $txt = $headRegex.Replace($txt, ($snippet + '</head>'), 1)
  } elseif($bodyRegex.IsMatch($txt)){
    $txt = $bodyRegex.Replace($txt, ($snippet + '</body>'), 1)
  } else {
    $txt = $txt + "`n" + $snippet
  }

  [System.IO.File]::WriteAllText($p, $txt, $utf8NoBom)
  $patched++
}

Write-Host ("Injected mobile brand hide into: " + $patched + " files; skipped: " + $skipped)


