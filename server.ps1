$path = "d:\antigravity"
$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on http://localhost:$port/"
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        if ($requestUrl -eq "/") { $requestUrl = "/index.html" }
        $filePath = Join-Path $path $requestUrl
        
        $context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        
        if (Test-Path $filePath) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            switch ($ext) {
                ".html" { $context.Response.ContentType = "text/html" }
                ".css" { $context.Response.ContentType = "text/css" }
                ".js" { $context.Response.ContentType = "application/javascript" }
            }
            $content = [System.IO.File]::ReadAllBytes($filePath)
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
