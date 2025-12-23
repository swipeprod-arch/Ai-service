# PowerShell script to fix navigation menu
# Remove "Услуги" and "Кейсы", add "Галерея работ"

$root = Split-Path -Parent $PSScriptRoot

# Process body files
$bodyFiles = Get-ChildItem -Path "$root\files" -Filter "*body.html" -ErrorAction SilentlyContinue

foreach ($file in $bodyFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $changed = $false
    
    # Remove services link
    if ($content -match '<a href="/services') {
        $content = $content -replace '<a href="/services\.html">[^<]+</a>\s*', ''
        $content = $content -replace '<a href="/services">[^<]+</a>\s*', ''
        $changed = $true
    }
    
    # Remove cases link
    if ($content -match '<a href="/cases') {
        $content = $content -replace '<a href="/cases\.html">[^<]+</a>\s*', ''
        $content = $content -replace '<a href="/cases">[^<]+</a>\s*', ''
        $changed = $true
    }
    
    # Add gallery link after experts if not present
    if ($content -notmatch 'href="[^"]*gallery') {
        if ($content -match '<a href="[^"]*experts[^"]*">[^<]+</a>') {
            $content = $content -replace '(<a href="[^"]*experts[^"]*">[^<]+</a>)', '$1 <a href="/gallery.html">Галерея работ</a>'
            $changed = $true
        }
    }
    
    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding $false))
        Write-Host "UPDATED: $($file.Name)"
    }
}

# Process main HTML files
$mainFiles = Get-ChildItem -Path $root -Filter "*.html" -ErrorAction SilentlyContinue | Where-Object { 
    $_.DirectoryName -eq $root -and $_.Name -notmatch "^(gallery|seed|test)"
}

foreach ($file in $mainFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $changed = $false
    
    # Remove services link
    if ($content -match '<a href="/services') {
        $content = $content -replace '<a href="/services\.html">[^<]+</a>\s*', ''
        $content = $content -replace '<a href="/services">[^<]+</a>\s*', ''
        $changed = $true
    }
    
    # Remove cases link
    if ($content -match '<a href="/cases') {
        $content = $content -replace '<a href="/cases\.html">[^<]+</a>\s*', ''
        $content = $content -replace '<a href="/cases">[^<]+</a>\s*', ''
        $changed = $true
    }
    
    # Add gallery link after experts if not present
    if ($content -notmatch 'href="[^"]*gallery') {
        if ($content -match '<a href="[^"]*experts[^"]*">[^<]+</a>') {
            $content = $content -replace '(<a href="[^"]*experts[^"]*">[^<]+</a>)', '$1 <a href="/gallery.html">Галерея работ</a>'
            $changed = $true
        }
    }
    
    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding $false))
        Write-Host "UPDATED: $($file.Name)"
    }
}

Write-Host "Done!"
