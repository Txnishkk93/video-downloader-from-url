# Production Deployment Guide

## ⚠️ Important: yt-dlp Dependency

This application requires `yt-dlp` to be installed on your production server to work properly.

### Common Production Error: "Failed to fetch formats"

If you're getting this error in production but the app works locally, it's because **`yt-dlp` is not installed** on your production server.

## Installation Instructions by Platform

### 🐧 Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y yt-dlp
```

### 🍎 macOS
```bash
brew install yt-dlp
```

### 🪟 Windows Server
```powershell
# Using Chocolatey
choco install yt-dlp

# Or using Python pip
pip install yt-dlp
```

### 🐳 Docker
Add this to your Dockerfile:
```dockerfile
# For Node.js base image
RUN apt-get update && apt-get install -y yt-dlp && rm -rf /var/lib/apt/lists/*
```

### ☁️ Cloud Platforms

#### **Vercel**
Vercel doesn't support installing system packages directly. You have two options:

**Option 1: Use a Python wrapper with pre-built yt-dlp**
```bash
npm install --save yt-dlp-web
```

**Option 2: Use Vercel API Routes with external service**
Instead of running `yt-dlp` locally, use an external API that provides video information.

#### **Railway.app**
Add to your `Procfile`:
```
release: apt-get update && apt-get install -y yt-dlp
web: npm run start
```

#### **Render**
In your `render.yaml`:
```yaml
services:
  - type: web
    buildCommand: apt-get update && apt-get install -y yt-dlp && npm install
```

#### **DigitalOcean App Platform**
Add to your app spec:
```yaml
services:
  - name: app
    buildCommand: apt-get update && apt-get install -y yt-dlp && npm install
```

#### **AWS EC2 / Self-Hosted**
SSH into your server and run:
```bash
sudo apt-get update
sudo apt-get install -y yt-dlp
```

## Debugging in Production

The updated API routes now provide better error messages:

- **Status 503 (Service Unavailable)**: `yt-dlp` is not installed
  ```json
  {
    "error": "yt-dlp is not installed on this server. Please install it to use this feature.",
    "details": "yt-dlp command not found"
  }
  ```

- **Status 500 (Server Error)**: Other execution errors (network, invalid URL, etc.)

- Check your server logs for detailed error information:
  ```
  [yt-dlp formats error] { code: 127, message: '...' }
  [yt-dlp download error] { code: 127, message: '...' }
  ```

## Environment Variables (Optional)

You can configure timeouts in production by adding to your `.env.local`:
```
# Default: 30000ms for formats, 300000ms for downloads
YT_DLP_FORMAT_TIMEOUT=30000
YT_DLP_DOWNLOAD_TIMEOUT=300000
```

## Troubleshooting

### "Command not found" error
- Verify `yt-dlp` is installed: `which yt-dlp` (Linux/Mac) or `where yt-dlp` (Windows)
- Check if it's in the PATH: `yt-dlp --version`

### "Process timeout" error
- Increase timeout values
- Check your internet connection on the server
- The video might be too large or slow to download

### "File not found" error
- Check if the temp directory has write permissions
- Ensure at least 5GB free space for video files

## Performance Tips

1. **Set reasonable timeouts** to prevent requests from hanging
2. **Monitor disk space** on the temp directory
3. **Consider CDN** if you're serving to multiple users
4. **Rate limiting** recommended to prevent abuse

## Security Notes

⚠️ **Important Security Considerations:**

1. **Input Validation**: The app validates URLs but still passes them to shell commands
2. **Command Injection**: Ensure URLs are properly validated (already implemented)
3. **Disk Space**: Downloads use the system temp directory - monitor free space
4. **Rate Limiting**: Consider implementing rate limiting on API endpoints
5. **HTTPS Only**: Always use HTTPS in production

## Testing Before Deploying

```bash
# Test locally
npm run build
npm run start

# Then visit http://localhost:3000 and try:
# 1. Check Formats with a YouTube URL
# 2. Download a video
```

If both work locally, you're ready to deploy. Just ensure `yt-dlp` is installed on your production server!
