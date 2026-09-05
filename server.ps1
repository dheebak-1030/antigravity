$path = $PSScriptRoot
$port = 5500

# Ensure data directory exists for server persistence
$dataDir = Join-Path $path "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

$usersFile = Join-Path $dataDir "users.json"
$playlistsFile = Join-Path $dataDir "playlists.json"
$songsFile = Join-Path $dataDir "songs.json"

if (-not (Test-Path $usersFile)) {
    $defaultUsers = @(
        @{
            id = "usr_demo1"
            userId = "user1"
            passwordHash = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" # sha256 of "password"
            name = "Demo Listener"
            role = "user"
            status = "active"
            createdAt = (Get-Date).ToString("o")
        }
    )
    $defaultUsers | ConvertTo-Json -Depth 5 | Set-Content $usersFile -Encoding UTF8
}

if (-not (Test-Path $playlistsFile)) {
    $defaultPlaylists = @(
        @{
            id = "pl_tm_chill"
            name = "Tamil Melody Chill"
            description = "Relaxing Tamil acoustic & melodic hits"
            cover = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80"
            created = (Get-Date).ToString("o")
            songs = @("tm_01", "tm_02", "tm_03")
            createdBy = "admin"
        }
    )
    $defaultPlaylists | ConvertTo-Json -Depth 5 | Set-Content $playlistsFile -Encoding UTF8
}

if (-not (Test-Path $songsFile)) {
    $defaultSongs = @(
        @{
            id = "tm_01"
            title = "Kannana Kanne / கண்ணான கண்ணே"
            artist = "D. Imman & Sid Sriram (Acoustic Cover)"
            album = "Viswasam (Acoustic)"
            cover_url = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80"
            file_url = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"
            audio_url = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"
            downloadable = $true
            createdAt = (Get-Date).ToString("o")
        },
        @{
            id = "tm_02"
            title = "Pudhu Vellai Mazhai / புது வெள்ளை மழை"
            artist = "AR Rahman & Unni Menon (Flute Chill)"
            album = "Roja (Instrumental)"
            cover_url = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80"
            file_url = "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=chill-abstract-intention-12099.mp3"
            audio_url = "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=chill-abstract-intention-12099.mp3"
            downloadable = $true
            createdAt = (Get-Date).ToString("o")
        }
    )
    $defaultSongs | ConvertTo-Json -Depth 5 | Set-Content $songsFile -Encoding UTF8
}

function Get-SHA256([string]$InputString) {
    if (-not $InputString) { return "" }
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputString)
    $hash = $sha256.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function Send-JsonResponse($context, $obj, $statusCode = 200) {
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $context.Response.ContentType = "application/json; charset=utf-8"
    $context.Response.ContentLength64 = $buffer.Length
    $context.Response.StatusCode = $statusCode
    $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $context.Response.Close()
}

function Get-RequestBody($context) {
    $reader = New-Object System.IO.StreamReader($context.Request.InputStream, $context.Request.ContentEncoding)
    $body = $reader.ReadToEnd()
    $reader.Close()
    if ($body) {
        return $body | ConvertFrom-Json
    }
    return $null
}

function Check-IsAdminToken($context) {
    $authHeader = $context.Request.Headers["Authorization"]
    if ($authHeader -and $authHeader.StartsWith("Bearer dk_admin_token_sec_")) {
        return $true
    }
    return $false
}

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
    Write-Host "Admin REST API & Security Proxy Active"
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        $httpMethod = $context.Request.HttpMethod
        
        $context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        $context.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $context.Response.Headers.Add("Cache-Control", "no-cache")
        
        if ($httpMethod -eq "OPTIONS") {
            $context.Response.StatusCode = 200
            $context.Response.Close()
            continue
        }

        # ── 1. AUTHENTICATION APIS ─────────────────────────────
        if ($requestUrl -eq "/api/auth/login" -and $httpMethod -eq "POST") {
            $req = Get-RequestBody $context
            if (-not $req -or -not $req.userId -or -not $req.password) {
                Send-JsonResponse $context @{ success = $false; error = "User ID and Password are required." } 400
                continue
            }

            # Check Admin Password (Qwerty@866)
            if ($req.userId -eq "admin" -and $req.password -eq "Qwerty@866") {
                $adminToken = "dk_admin_token_sec_" + (Get-Date).Ticks
                Send-JsonResponse $context @{
                    success = $true
                    token = $adminToken
                    isAdmin = $true
                    user = @{
                        id = "admin_01"
                        userId = "admin"
                        name = "System Administrator"
                        role = "admin"
                        status = "active"
                    }
                } 200
                continue
            }

            # Check regular users
            $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
            $inputHash = Get-SHA256 $req.password
            $matchedUser = $users | Where-Object { $_.userId -eq $req.userId }

            if (-not $matchedUser) {
                Send-JsonResponse $context @{ success = $false; error = "Invalid User ID or Password." } 401
                continue
            }

            if ($matchedUser.status -eq "disabled") {
                Send-JsonResponse $context @{ success = $false; error = "Account has been disabled by administrator." } 403
                continue
            }

            if ($matchedUser.passwordHash -ne $inputHash -and $matchedUser.passwordHash -ne $req.password) {
                Send-JsonResponse $context @{ success = $false; error = "Invalid User ID or Password." } 401
                continue
            }

            $userToken = "dk_user_token_" + $matchedUser.userId + "_" + (Get-Date).Ticks
            Send-JsonResponse $context @{
                success = $true
                token = $userToken
                isAdmin = ($matchedUser.role -eq "admin")
                user = @{
                    id = $matchedUser.id
                    userId = $matchedUser.userId
                    name = $matchedUser.name
                    role = $matchedUser.role
                    status = $matchedUser.status
                }
            } 200
            continue
        }

        if ($requestUrl -eq "/api/auth/register" -and $httpMethod -eq "POST") {
            $req = Get-RequestBody $context
            if (-not $req -or -not $req.userId -or -not $req.password) {
                Send-JsonResponse $context @{ success = $false; error = "User ID and Password are required." } 400
                continue
            }

            if ($req.userId -eq "admin") {
                Send-JsonResponse $context @{ success = $false; error = "Cannot register reserved User ID 'admin'." } 400
                continue
            }

            $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($users | Where-Object { $_.userId -eq $req.userId }) {
                Send-JsonResponse $context @{ success = $false; error = "User ID already exists. Please choose another." } 409
                continue
            }

            $newUser = @{
                id = "usr_" + (Get-Date).Ticks
                userId = $req.userId
                passwordHash = Get-SHA256 $req.password
                name = if ($req.name) { $req.name } else { $req.userId }
                role = "user"
                status = "active"
                createdAt = (Get-Date).ToString("o")
            }

            $userList = [System.Collections.ArrayList]@()
            if ($users) { $users | ForEach-Object { [void]$userList.Add($_) } }
            [void]$userList.Add($newUser)
            $userList | ConvertTo-Json -Depth 5 | Set-Content $usersFile -Encoding UTF8

            $userToken = "dk_user_token_" + $newUser.userId + "_" + (Get-Date).Ticks
            Send-JsonResponse $context @{
                success = $true
                token = $userToken
                isAdmin = $false
                user = @{
                    id = $newUser.id
                    userId = $newUser.userId
                    name = $newUser.name
                    role = $newUser.role
                    status = $newUser.status
                }
            } 201
            continue
        }

        # ── 2. ADMIN REST APIS (PROTECTED) ──────────────────────
        if ($requestUrl.StartsWith("/api/admin/")) {
            if (-not (Check-IsAdminToken $context)) {
                Send-JsonResponse $context @{ success = $false; error = "Unauthorized: Admin authorization required." } 401
                continue
            }

            # --- Admin Users Operations ---
            if ($requestUrl -eq "/api/admin/users") {
                if ($httpMethod -eq "GET") {
                    $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    Send-JsonResponse $context @{ success = $true; users = $users } 200
                    continue
                }
                elseif ($httpMethod -eq "POST") {
                    $req = Get-RequestBody $context
                    $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    if ($users | Where-Object { $_.userId -eq $req.userId }) {
                        Send-JsonResponse $context @{ success = $false; error = "User ID already exists." } 409
                        continue
                    }
                    $newUser = @{
                        id = "usr_" + (Get-Date).Ticks
                        userId = $req.userId
                        passwordHash = Get-SHA256 $req.password
                        name = if ($req.name) { $req.name } else { $req.userId }
                        role = if ($req.role) { $req.role } else { "user" }
                        status = if ($req.status) { $req.status } else { "active" }
                        createdAt = (Get-Date).ToString("o")
                    }
                    $userList = [System.Collections.ArrayList]@()
                    if ($users) { $users | ForEach-Object { [void]$userList.Add($_) } }
                    [void]$userList.Add($newUser)
                    $userList | ConvertTo-Json -Depth 5 | Set-Content $usersFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "User created successfully."; user = $newUser } 201
                    continue
                }
                elseif ($httpMethod -eq "PUT") {
                    $req = Get-RequestBody $context
                    $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $userList = [System.Collections.ArrayList]@()
                    $found = $false
                    if ($users) {
                        foreach ($u in $users) {
                            if ($u.id -eq $req.id -or $u.userId -eq $req.userId) {
                                $found = $true
                                if ($req.name) { $u.name = $req.name }
                                if ($req.role) { $u.role = $req.role }
                                if ($req.status) { $u.status = $req.status }
                                if ($req.password) { $u.passwordHash = Get-SHA256 $req.password }
                            }
                            [void]$userList.Add($u)
                        }
                    }
                    if (-not $found) {
                        Send-JsonResponse $context @{ success = $false; error = "User not found." } 404
                        continue
                    }
                    $userList | ConvertTo-Json -Depth 5 | Set-Content $usersFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "User updated successfully." } 200
                    continue
                }
                elseif ($httpMethod -eq "DELETE") {
                    $req = Get-RequestBody $context
                    $users = Get-Content $usersFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $userList = [System.Collections.ArrayList]@()
                    if ($users) {
                        foreach ($u in $users) {
                            if ($u.id -ne $req.id -and $u.userId -ne $req.userId) {
                                [void]$userList.Add($u)
                            }
                        }
                    }
                    $userList | ConvertTo-Json -Depth 5 | Set-Content $usersFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "User deleted successfully." } 200
                    continue
                }
            }

            # --- Admin Playlists Operations ---
            if ($requestUrl -eq "/api/admin/playlists") {
                if ($httpMethod -eq "GET") {
                    $playlists = Get-Content $playlistsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    Send-JsonResponse $context @{ success = $true; playlists = $playlists } 200
                    continue
                }
                elseif ($httpMethod -eq "POST") {
                    $req = Get-RequestBody $context
                    $playlists = Get-Content $playlistsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $newPl = @{
                        id = "pl_" + (Get-Date).Ticks
                        name = $req.name
                        description = if ($req.description) { $req.description } else { "" }
                        cover = if ($req.cover) { $req.cover } else { "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500" }
                        created = (Get-Date).ToString("o")
                        songs = if ($req.songs) { $req.songs } else { @() }
                        createdBy = "admin"
                    }
                    $plList = [System.Collections.ArrayList]@()
                    if ($playlists) { $playlists | ForEach-Object { [void]$plList.Add($_) } }
                    [void]$plList.Add($newPl)
                    $plList | ConvertTo-Json -Depth 5 | Set-Content $playlistsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Playlist created successfully."; playlist = $newPl } 201
                    continue
                }
                elseif ($httpMethod -eq "PUT") {
                    $req = Get-RequestBody $context
                    $playlists = Get-Content $playlistsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $plList = [System.Collections.ArrayList]@()
                    $found = $false
                    if ($playlists) {
                        foreach ($p in $playlists) {
                            if ($p.id -eq $req.id) {
                                $found = $true
                                if ($req.name) { $p.name = $req.name }
                                if ($req.description -ne $null) { $p.description = $req.description }
                                if ($req.cover) { $p.cover = $req.cover }
                                if ($req.songs -ne $null) { $p.songs = $req.songs }
                            }
                            [void]$plList.Add($p)
                        }
                    }
                    if (-not $found) {
                        Send-JsonResponse $context @{ success = $false; error = "Playlist not found." } 404
                        continue
                    }
                    $plList | ConvertTo-Json -Depth 5 | Set-Content $playlistsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Playlist updated successfully." } 200
                    continue
                }
                elseif ($httpMethod -eq "DELETE") {
                    $req = Get-RequestBody $context
                    $playlists = Get-Content $playlistsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $plList = [System.Collections.ArrayList]@()
                    if ($playlists) {
                        foreach ($p in $playlists) {
                            if ($p.id -ne $req.id) {
                                [void]$plList.Add($p)
                            }
                        }
                    }
                    $plList | ConvertTo-Json -Depth 5 | Set-Content $playlistsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Playlist deleted successfully." } 200
                    continue
                }
            }

            # --- Admin Songs Catalog Operations ---
            if ($requestUrl -eq "/api/admin/songs") {
                if ($httpMethod -eq "GET") {
                    $songs = Get-Content $songsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    Send-JsonResponse $context @{ success = $true; songs = $songs } 200
                    continue
                }
                elseif ($httpMethod -eq "POST") {
                    $req = Get-RequestBody $context
                    $songs = Get-Content $songsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $newSong = @{
                        id = "song_" + (Get-Date).Ticks
                        title = $req.title
                        artist = $req.artist
                        album = if ($req.album) { $req.album } else { "Single" }
                        cover_url = if ($req.cover_url) { $req.cover_url } else { "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500" }
                        audio_url = $req.audio_url
                        file_url = $req.audio_url
                        downloadable = if ($req.downloadable -ne $null) { [bool]$req.downloadable } else { $true }
                        createdAt = (Get-Date).ToString("o")
                    }
                    $songList = [System.Collections.ArrayList]@()
                    if ($songs) { $songs | ForEach-Object { [void]$songList.Add($_) } }
                    [void]$songList.Add($newSong)
                    $songList | ConvertTo-Json -Depth 5 | Set-Content $songsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Song added successfully."; song = $newSong } 201
                    continue
                }
                elseif ($httpMethod -eq "PUT") {
                    $req = Get-RequestBody $context
                    $songs = Get-Content $songsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $songList = [System.Collections.ArrayList]@()
                    $found = $false
                    if ($songs) {
                        foreach ($s in $songs) {
                            if ($s.id -eq $req.id) {
                                $found = $true
                                if ($req.title) { $s.title = $req.title }
                                if ($req.artist) { $s.artist = $req.artist }
                                if ($req.album) { $s.album = $req.album }
                                if ($req.cover_url) { $s.cover_url = $req.cover_url }
                                if ($req.audio_url) { $s.audio_url = $req.audio_url; $s.file_url = $req.audio_url }
                                if ($req.downloadable -ne $null) { $s.downloadable = [bool]$req.downloadable }
                            }
                            [void]$songList.Add($s)
                        }
                    }
                    if (-not $found) {
                        Send-JsonResponse $context @{ success = $false; error = "Song not found." } 404
                        continue
                    }
                    $songList | ConvertTo-Json -Depth 5 | Set-Content $songsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Song updated successfully." } 200
                    continue
                }
                elseif ($httpMethod -eq "DELETE") {
                    $req = Get-RequestBody $context
                    $songs = Get-Content $songsFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $songList = [System.Collections.ArrayList]@()
                    if ($songs) {
                        foreach ($s in $songs) {
                            if ($s.id -ne $req.id) {
                                [void]$songList.Add($s)
                            }
                        }
                    }
                    $songList | ConvertTo-Json -Depth 5 | Set-Content $songsFile -Encoding UTF8
                    Send-JsonResponse $context @{ success = $true; message = "Song deleted successfully." } 200
                    continue
                }
            }
        }

        # ── 3. AI BACKEND PROXY ───────────────────────────────
        if ($requestUrl -eq "/api/ai/chat" -or $requestUrl -eq "/api/ai/recommend") {
            $context.Response.ContentType = "application/json; charset=utf-8"
            $apiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY")

            $reader = New-Object System.IO.StreamReader($context.Request.InputStream, $context.Request.ContentEncoding)
            $requestBody = $reader.ReadToEnd()
            $reader.Close()

            if (-not $apiKey -or $apiKey -eq "your_gemini_api_key_here") {
                Send-JsonResponse $context @{
                    success = $true
                    mode = "fallback_local"
                    message = "No external API key set; server processed request via local Tamil AI engine."
                } 200
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

                Send-JsonResponse $context @{
                    success = $true
                    mode = "gemini_api"
                    reply = $aiText
                } 200
            } catch {
                Send-JsonResponse $context @{
                    success = $false
                    mode = "fallback_local"
                    error = $_.Exception.Message
                } 200
            }
            continue
        }

        # ── 4. STATIC FILE ROUTES ──────────────────────────────
        if ($requestUrl -eq "/admin" -or $requestUrl -eq "/admin/") { $requestUrl = "/admin.html" }
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

