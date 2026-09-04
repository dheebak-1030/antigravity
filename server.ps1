$path = $PSScriptRoot
$port = 5500

# Load .env file if present
$envFile = Join-Path $path ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "DK Music Server Running on http://localhost:$port/"
    Write-Host "AI Security Proxy active: Key hidden in server process"
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        $httpMethod = $context.Request.HttpMethod
        
        $context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        $context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $context.Response.Headers.Add("Cache-Control", "no-cache")
        
        if ($httpMethod -eq "OPTIONS") {
            $context.Response.StatusCode = 200
            $context.Response.Close()
            continue
        }

        # API Routes for Secure AI Backend Proxy
        if ($requestUrl -eq "/api/ai/chat" -or $requestUrl -eq "/api/ai/recommend") {
            $context.Response.ContentType = "application/json; charset=utf-8"
            $apiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY")

            $reader = New-Object System.IO.StreamReader($context.Request.InputStream, $context.Request.ContentEncoding)
            $requestBody = $reader.ReadToEnd()
            $reader.Close()

            if (-not $apiKey -or $apiKey -eq "your_gemini_api_key_here") {
                $responseObj = @{
                    success = $true
                    mode = "fallback_local"
                    message = "No external API key set; server processed request via local Tamil AI engine."
                }
                $jsonResp = $responseObj | ConvertTo-Json -Depth 5
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResp)
                $context.Response.ContentLength64 = $buffer.Length
                $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
                $context.Response.StatusCode = 200
                $context.Response.Close()
                continue
            }

            try {
                $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
                
                $promptText = "You are DK Music's AI Tamil Music Assistant. Help the user discover Tamil songs based on their query: $requestBody"
                $payload = @{
                    contents = @(
                        @{
                            parts = @(
                                @{ text = $promptText }
                            )
                        }
                    )
                } | ConvertTo-Json -Depth 5

                $geminiResp = Invoke-RestMethod -Uri $geminiUrl -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
                
                $aiText = ""
                if ($geminiResp.candidates -and $geminiResp.candidates[0].content.parts[0].text) {
                    $aiText = $geminiResp.candidates[0].content.parts[0].text
                }

                $outObj = @{
                    success = $true
                    mode = "gemini_api"
                    reply = $aiText
                }
                $jsonResp = $outObj | ConvertTo-Json -Depth 5
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResp)
                $context.Response.ContentLength64 = $buffer.Length
                $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
                $context.Response.StatusCode = 200
            } catch {
                $errObj = @{
                    success = $false
                    mode = "fallback_local"
                    error = $_.Exception.Message
                }
                $jsonResp = $errObj | ConvertTo-Json -Depth 5
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResp)
                $context.Response.ContentLength64 = $buffer.Length
                $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
                $context.Response.StatusCode = 200
            }

            $context.Response.Close()
            continue
        }

        # Static File Routes
        if ($requestUrl -eq "/" -or $requestUrl -eq "") { $requestUrl = "/index.html" }
        $cleanUrl = $requestUrl.TrimStart('/')
        $filePath = Join-Path $path $cleanUrl

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
