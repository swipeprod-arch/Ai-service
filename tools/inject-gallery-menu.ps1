# PowerShell скрипт для инъекции JS-кода управления меню
# - Убирает "Услуги" и "Кейсы"
# - Добавляет "Галерея работ" с правильной ссылкой

$root = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $root -Filter "*.html" -Recurse | Where-Object { 
    $_.DirectoryName -notmatch "\\tools$" -and $_.Name -ne "gallery.html"
}

# JavaScript код для управления меню
$scriptBlock = @'
<script id="ai-gallery-menu">
(function(){
  function fixNavMenu(){
    var navLinks = document.querySelector('.nav-links');
    if(!navLinks) return;
    
    // Убираем "Услуги" и "Кейсы"
    var links = navLinks.querySelectorAll('a');
    links.forEach(function(a){
      var text = a.textContent.trim().toLowerCase();
      if(text === 'услуги' || text === 'кейсы' || a.href.indexOf('services') > -1 || a.href.indexOf('cases') > -1){
        a.remove();
      }
    });
    
    // Проверяем, есть ли уже правильная ссылка на галерею
    var hasGallery = false;
    navLinks.querySelectorAll('a').forEach(function(a){
      if(a.href.indexOf('gallery') > -1){
        // Исправляем текст и ссылку
        a.textContent = 'Галерея работ';
        a.href = '/gallery.html';
        hasGallery = true;
      }
    });
    
    // Если нет - добавляем после "Исполнители"
    if(!hasGallery){
      var expertsLink = null;
      navLinks.querySelectorAll('a').forEach(function(a){
        if(a.href.indexOf('experts') > -1 || a.textContent.toLowerCase().indexOf('исполнител') > -1){
          expertsLink = a;
        }
      });
      
      if(expertsLink){
        var galleryLink = document.createElement('a');
        galleryLink.href = '/gallery.html';
        galleryLink.textContent = 'Галерея работ';
        expertsLink.insertAdjacentElement('afterend', galleryLink);
      }
    }
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixNavMenu);
  } else {
    fixNavMenu();
  }
  setTimeout(fixNavMenu, 300);
  setTimeout(fixNavMenu, 1000);
})();
</script>
'@

$scriptId = 'id="ai-gallery-menu"'

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # Если скрипт уже есть - удаляем старую версию
    if ($content -match '<script id="ai-gallery-menu">[\s\S]*?</script>') {
        $content = $content -replace '<script id="ai-gallery-menu">[\s\S]*?</script>', ''
    }
    
    # Ищем </head> и вставляем перед ним
    if ($content -match '</head>') {
        $newContent = $content -replace '</head>', "$scriptBlock</head>"
        [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "UPDATED: $($file.Name)"
    } else {
        Write-Host "SKIP (no </head>): $($file.Name)"
    }
}

Write-Host "`nDone! Gallery menu script updated."
