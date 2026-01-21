import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { getFfmpegLocation, getYtDlpWrap } from "@/lib/server/ytDlp";
import { jobStore } from "@/lib/server/jobStore";

const DOWNLOAD_DIR = path.join(process.env.TMPDIR || "/tmp", "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { url, format_id, type, audio_format } = await req.json().catch(() => ({}));

  if (!url || !format_id) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
  }

  if (type && !["video", "audio"].includes(type)) {
    return NextResponse.json({ success: false, error: "Type must be 'video' or 'audio'" }, { status: 400 });
  }

  const jobId = uuid();
  const outputTemplate = path.join(DOWNLOAD_DIR, `${jobId}.%(ext)s`);

  jobStore.createJob(jobId);

  console.log("=== DOWNLOAD REQUEST ===");
  console.log("Job ID:", jobId);
  console.log("URL:", url);
  console.log("Format ID:", format_id);
  console.log("Type:", type);
  console.log("Audio Format:", audio_format);

  (async () => {
    try {
      const ytDlp = await getYtDlpWrap();
      const ffmpegLocation = getFfmpegLocation();

      const args: string[] = [
        "--no-playlist",
        "--newline",
        "--no-warnings",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "-o",
        outputTemplate,
      ];

      if (ffmpegLocation) {
        args.push("--ffmpeg-location", ffmpegLocation);
      }

      if (type === "audio") {
        const audioFormatArg = audio_format || "mp3";
        console.log("=== AUDIO DOWNLOAD MODE ===");
        args.push(
          "-x",
          "--audio-format",
          audioFormatArg,
          "--audio-quality",
          "0",
          "-f",
          "bestaudio/best",
        );
      } else {
        // For video, always use the selected format_id (should be video+audio)
        // Defensive: if format_id is audio-only, fallback to bestvideo+bestaudio
        const isAudioOnly = String(format_id).startsWith("bestaudio");
        const videoFormat = isAudioOnly ? "bestvideo+bestaudio/best" : String(format_id);
        console.log("=== VIDEO DOWNLOAD MODE ===");
        console.log("Using format:", videoFormat);
        args.push(
          "-f",
          videoFormat,
          "--merge-output-format",
          "mp4",
        );
      }

      args.push(url);

      console.log("Final yt-dlp args:", args.filter(a => !a.includes('http')).join(' '));

      const emitter = ytDlp.exec(args, { shell: false });

      emitter.on('progress', (progress: any) => {
        const percent = typeof progress?.percent === "number" ? progress.percent : 0;
        jobStore.updateJob(jobId, { progress: Math.max(0, Math.min(100, percent)) });
        console.log(`Job ${jobId} progress:`, percent);
      });

      emitter.on("error", (err: Error) => {
        console.error("yt-dlp error for job", jobId, ":", err);
        jobStore.updateJob(jobId, {
          status: "error",
          error: err.message || "Download failed",
        });
      });

      emitter.on("close", () => {
        console.log(`Job ${jobId} download process closed`);
        try {
          const files = fs.readdirSync(DOWNLOAD_DIR);
          const file = files.find((f) => f.startsWith(jobId));
          console.log(`Found file for job ${jobId}:`, file);
          
          if (file) {
            jobStore.updateJob(jobId, {
              status: "completed",
              progress: 100,
              file: file,
            });
          } else {
            jobStore.updateJob(jobId, {
              status: "error",
              error: "File not found after download",
            });
          }
        } catch (e: any) {
          console.error(`Error finalizing job ${jobId}:`, e);
          jobStore.updateJob(jobId, {
            status: "error",
            error: e?.message || "Failed to locate downloaded file",
          });
        }
      });
    } catch (e: any) {
      console.error(`Failed to start download for job ${jobId}:`, e);
      jobStore.updateJob(jobId, {
        status: "error",
        error: e?.message || "Download failed",
      });
    }
  })();

  return NextResponse.json({ success: true, job_id: jobId });
}

export { DOWNLOAD_DIR };

