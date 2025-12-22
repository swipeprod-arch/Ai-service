param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

# ВАЖНО: у блока Tilda бывает inline style с "!important",
# поэтому CSS может не сработать. Мы удаляем элемент через JS.
$marker = 'id="ai-remove-tilda"'
$snippet = @"
<script id="ai-remove-tilda">
(function(){
  function rm(){
    try{
      var el = document.getElementById("tildacopy");
      if(el) el.remove();
      document.querySelectorAll(".t-tildalabel").forEach(function(x){
        try{ x.remove(); }catch(e){}
      });
    }catch(e){}
  }
  try{
    var mo = new MutationObserver(function(){ rm(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }catch(e){}
  rm();
  document.addEventListener("DOMContentLoaded", rm);
  window.addEventListener("load", rm);
  setTimeout(rm, 50);
  setTimeout(rm, 250);
})();
</script>
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$rootPath = Resolve-Path $Root

$snippetRegex = New-Object System.Text.RegularExpressions.Regex('(?s)<script id="ai-remove-tilda">.*?</script>\s*')
$headRegex = New-Object System.Text.RegularExpressions.Regex('</head>')
$bodyRegex = New-Object System.Text.RegularExpressions.Regex('</body>')

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter "*.html" | Where-Object {
  $p = $_.FullName
  (Select-String -Path $p -Pattern 'id="tildacopy"' -Quiet) -or (Select-String -Path $p -Pattern 'class="t-tildalabel' -Quiet)
}

Write-Host ("Found HTML files with Tilda label: " + $files.Count)

$patched = 0
$skipped = 0

foreach($f in $files){
  $p = $f.FullName
  $txt = [System.IO.File]::ReadAllText($p, $utf8NoBom)

  # 1) Дедупликация: если скрипт уже вставлялся несколько раз — оставляем только первый
  $m = $snippetRegex.Matches($txt)
  if($m.Count -gt 1){
    $first = $m[0].Value
    $rest = $snippetRegex.Replace($txt, '', ($m.Count - 1), ($m[0].Index + $m[0].Length))
    $txt = $rest
    # Вернём первую вставку обратно на место (на случай, если её затронули)
    if(-not ($txt -like "*$marker*")){
      $txt = $first + $txt
    }
  }

  # 2) Если скрипта нет — вставляем ОДИН раз (перед первым </head>, иначе перед первым </body>)
  if(-not ($txt -like "*$marker*")){
    if($headRegex.IsMatch($txt)){
      $txt = $headRegex.Replace($txt, ($snippet + '</head>'), 1)
    } elseif($bodyRegex.IsMatch($txt)){
      $txt = $bodyRegex.Replace($txt, ($snippet + '</body>'), 1)
    } else {
      $txt = $txt + "`n" + $snippet
    }
    $patched++
  } else {
    $skipped++
  }

  [System.IO.File]::WriteAllText($p, $txt, $utf8NoBom)
}

Write-Host ("Patched: " + $patched + ", skipped (already patched): " + $skipped)


