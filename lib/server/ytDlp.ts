import fs from "fs";
import os from "os";
import path from "path";
import YTDlpWrap from "yt-dlp-wrap";
import ffmpegPath from "ffmpeg-static";

let ytDlpWrapSingleton: YTDlpWrap | null = null;
let downloadPromise: Promise<void> | null = null;

function getBinaryPath() {
  // For Vercel, use /tmp which is writable during function execution
  // For local development, use system temp directory
  const base = process.env.TMPDIR || process.env.TMP || os.tmpdir() || "/tmp";
  const filename = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(base, filename);
}

async function ensureBinary() {
  const binPath = getBinaryPath();
  const dir = path.dirname(binPath);
  
  console.log("[yt-dlp] Binary path:", binPath);
  console.log("[yt-dlp] Environment - TMPDIR:", process.env.TMPDIR, "TMP:", process.env.TMP, "tmpdir():", os.tmpdir());
  console.log("[yt-dlp] Platform:", process.platform);
  
  try {
    if (!fs.existsSync(dir)) {
      console.log("[yt-dlp] Creating directory:", dir);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(binPath)) {
      console.log("[yt-dlp] Binary already exists");
      return;
    }

    console.log("[yt-dlp] Binary not found, downloading...");
    if (!downloadPromise) {
      downloadPromise = (async () => {
        try {
          console.log("[yt-dlp] Starting download from GitHub...");
          await YTDlpWrap.downloadFromGithub(binPath);
          console.log("[yt-dlp] Download completed");
          
          try {
            fs.chmodSync(binPath, 0o755);
            console.log("[yt-dlp] Permissions set to executable");
          } catch {
            console.log("[yt-dlp] Could not set executable permissions (Windows?)");
          }
        } catch (error) {
          console.error("[yt-dlp] Failed to download:", error instanceof Error ? error.message : error);
          downloadPromise = null;
          throw error;
        }
      })();
    }

    await downloadPromise;
  } catch (error) {
    console.error("[yt-dlp] Error ensuring binary:", error instanceof Error ? error.message : error);
    throw new Error(`Failed to initialize yt-dlp: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getYtDlpWrap() {
  console.log("[yt-dlp] getYtDlpWrap called");
  await ensureBinary();
  if (!ytDlpWrapSingleton) {
    console.log("[yt-dlp] Creating new YTDlpWrap instance");
    ytDlpWrapSingleton = new YTDlpWrap(getBinaryPath());
  }
  return ytDlpWrapSingleton;
}

export function getFfmpegLocation() {
  return typeof ffmpegPath === "string" ? ffmpegPath : undefined;
}

