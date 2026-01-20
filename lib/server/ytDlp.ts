import fs from "fs";
import os from "os";
import path from "path";
import YTDlpWrap from "yt-dlp-wrap";
import ffmpegPath from "ffmpeg-static";

let ytDlpWrapSingleton: YTDlpWrap | null = null;
let downloadPromise: Promise<void> | null = null;

function getBinaryPath() {
  const base = process.env.TMPDIR || os.tmpdir() || "/tmp";
  const filename = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(base, filename);
}

async function ensureBinary() {
  const binPath = getBinaryPath();
  const dir = path.dirname(binPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(binPath)) return;

  if (!downloadPromise) {
    downloadPromise = (async () => {
      await YTDlpWrap.downloadFromGithub(binPath);
      try {
        fs.chmodSync(binPath, 0o755);
      } catch {
        // ignore on Windows
      }
    })();
  }

  await downloadPromise;
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

