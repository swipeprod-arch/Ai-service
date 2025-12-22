# PowerShell скрипт для инъекции JS-кода добавления пункта меню "Галерея работ"
# Добавляет скрипт в <head> всех HTML файлов

$root = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $root -Filter "*.html" -Recurse | Where-Object { 
    $_.DirectoryName -notmatch "\\tools$" -and $_.Name -ne "gallery.html"
}

# JavaScript код для добавления пункта меню
$scriptBlock = @'
<script id="ai-gallery-menu">
(function(){
  function addGalleryMenu(){
    // Ищем nav-links
    const navLinks = document.querySelector('.nav-links');
    if(!navLinks) return;
    
    // Проверяем, есть ли уже ссылка на галерею
    if(navLinks.querySelector('a[href*="gallery"]')) return;
    
    // Ищем ссылку на исполнителей
    const expertsLink = navLinks.querySelector('a[href*="experts"]');
    if(!expertsLink) return;
    
    // Создаем ссылку на галерею
    const galleryLink = document.createElement('a');
    galleryLink.href = '/gallery';
    galleryLink.textContent = 'Галерея работ';
    
    // Вставляем после исполнителей
    expertsLink.insertAdjacentElement('afterend', galleryLink);
  }
  
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addGalleryMenu);
  } else {
    addGalleryMenu();
  }
  // Повторяем на случай динамической загрузки
  setTimeout(addGalleryMenu, 500);
  setTimeout(addGalleryMenu, 1500);
})();
</script>
'@

$scriptId = 'id="ai-gallery-menu"'

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    # Если скрипт уже есть - удаляем старую версию
    if ($content -match '<script id="ai-gallery-menu">[\s\S]*?</script>') {
        $content = $content -replace '<script id="ai-gallery-menu">[\s\S]*?</script>', ''
    }
    
    # Ищем </head> и вставляем перед ним
    if ($content -match '</head>') {
        $newContent = $content -replace '</head>', "$scriptBlock</head>"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "UPDATED: $($file.Name)"
    } else {
        Write-Host "SKIP (no </head>): $($file.Name)"
    }
}

Write-Host "`nDone! Gallery menu script injected."
