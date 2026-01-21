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
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(binPath)) return;

    if (!downloadPromise) {
      downloadPromise = (async () => {
        try {
          await YTDlpWrap.downloadFromGithub(binPath);
          try {
            fs.chmodSync(binPath, 0o755);
          } catch {
            // ignore on Windows
          }
        } catch (error) {
          console.error("Failed to download yt-dlp:", error);
          downloadPromise = null; // Reset on error so it can retry
          throw error;
        }
      })();
    }

    await downloadPromise;
  } catch (error) {
    console.error("Error ensuring yt-dlp binary:", error);
    throw new Error("Failed to initialize yt-dlp. Please check your internet connection and try again.");
  }
}

export async function getYtDlpWrap() {
  await ensureBinary();
  if (!ytDlpWrapSingleton) {
    ytDlpWrapSingleton = new YTDlpWrap(getBinaryPath());
  }
  return ytDlpWrapSingleton;
}

export function getFfmpegLocation() {
  // ffmpeg-static returns string | null
  return typeof ffmpegPath === "string" ? ffmpegPath : undefined;
}

