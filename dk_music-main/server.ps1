$path = $PSScriptRoot
$port = 5500
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Listening on http://localhost:$port/ from $path"
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        if ($requestUrl -eq "/" -or $requestUrl -eq "") { $requestUrl = "/index.html" }
        $cleanUrl = $requestUrl.TrimStart('/')
        $filePath = Join-Path $path $cleanUrl
        
        $context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $context.Response.Headers.Add("Cache-Control", "no-cache")
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $context.Response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $context.Response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $context.Response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $context.Response.ContentType = "application/json; charset=utf-8" }
                ".webmanifest" { $context.Response.ContentType = "application/manifest+json" }
                ".mp3"  { $context.Response.ContentType = "audio/mpeg" }
                ".wav"  { $context.Response.ContentType = "audio/wav" }
                ".svg"  { $context.Response.ContentType = "image/svg+xml" }
                ".png"  { $context.Response.ContentType = "image/png" }
                ".jpg"  { $context.Response.ContentType = "image/jpeg" }
                ".jpeg" { $context.Response.ContentType = "image/jpeg" }
                default { $context.Response.ContentType = "application/octet-stream" }
            }
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $context.Response.ContentLength64 = $content.Length
            $context.Response.OutputStream.Write($content, 0, $content.Length)
            $context.Response.StatusCode = 200
        } else {
            $context.Response.StatusCode = 404
        }
        $context.Response.Close()
    }
} finally {
    $listener.Stop()
}
