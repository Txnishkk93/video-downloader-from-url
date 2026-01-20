import { NextRequest, NextResponse } from "next/server";
import { getYtDlpWrap } from "@/lib/server/ytDlp";

interface Format {
  format_id: string;
  quality: string;
  ext: string;
  filesize: number;
  has_audio: boolean;
  has_video: boolean;
  resolution?: string;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({ url: "" }));

  if (!url) {
    return NextResponse.json({ success: false, error: "URL required" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const ytDlp = await getYtDlpWrap();

    const args: string[] = [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--newline",
      "--skip-download",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--referer",
      "https://www.youtube.com/",
    ];

    args.push(url);

    console.log("Fetching info for URL:", url);
    const stdout = await ytDlp.execPromise(args, { shell: false });
    console.log("yt-dlp raw output length:", stdout.length);
    const json: any = JSON.parse(stdout);

    const videoFormats: Format[] = [
      {
        format_id: "bestvideo[height<=2160]+bestaudio/best",
        quality: "4K (2160p)",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "2160p",
      },
      {
        format_id: "bestvideo[height<=1440]+bestaudio/best",
        quality: "2K (1440p)",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "1440p",
      },
      {
        format_id: "bestvideo[height<=1080]+bestaudio/best",
        quality: "1080p",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "1080p",
      },
      {
        format_id: "bestvideo[height<=720]+bestaudio/best",
        quality: "720p",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "720p",
      },
      {
        format_id: "bestvideo[height<=480]+bestaudio/best",
        quality: "480p",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "480p",
      },
      {
        format_id: "bestvideo[height<=360]+bestaudio/best",
        quality: "360p",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "360p",
      },
      {
        format_id: "bestvideo[height<=240]+bestaudio/best",
        quality: "240p",
        ext: "mp4",
        filesize: 0,
        has_audio: true,
        has_video: true,
        resolution: "240p",
      },
    ];

    const audioFormats: Format[] = [
      {
        format_id: "bestaudio",
        quality: "Best Audio",
        ext: "m4a",
        filesize: 0,
        has_audio: true,
        has_video: false,
        resolution: "audio",
      },
    ];

    const availableHeights = new Set<number>();
    (json.formats || []).forEach((f: any) => {
      if (f.height && f.vcodec !== "none") {
        availableHeights.add(f.height);
      }
    });

    const filteredVideoFormats = videoFormats.filter((format) => {
      const height = parseInt(format.resolution || "0", 10);
      return Array.from(availableHeights).some((h) => h >= height);
    });

    return NextResponse.json({
      success: true,
      extractor: json.extractor || json.ie_key || "unknown",
      title: json.title || "Unknown Title",
      thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
      duration: json.duration || 0,
      formats: filteredVideoFormats.length > 0 ? filteredVideoFormats : videoFormats,
      audio_formats: audioFormats,
    });
  } catch (err: any) {
    console.error("Error fetching media info:", err);
    const raw = String(err?.message || "");
    const stderr = String(err?.stderr || "");
    let errorMessage = "Failed to fetch media info";

    console.error("Error details:", { message: raw, stderr });

    if (raw.includes("video is unavailable") || stderr.includes("Video unavailable")) {
      errorMessage = "This video is unavailable.";
    } else if (raw.includes("Requested format is not available") || stderr.includes("Requested format")) {
      errorMessage = "This video format is not available. The video may be private or restricted.";
    } else if (raw.includes("Unsupported URL") || stderr.includes("Unsupported URL")) {
      errorMessage = "This URL is not supported. Please check the URL and try again.";
    } else if (raw.includes("HTTP Error 403") || stderr.includes("HTTP Error 403")) {
      errorMessage = "Access denied. The video may be age-restricted or region-locked.";
    } else if (raw.includes("HTTP Error 404") || stderr.includes("HTTP Error 404")) {
      errorMessage = "Video not found. The URL may be incorrect or the video may have been removed.";
    } else if (stderr) {
      errorMessage = `Error: ${stderr.substring(0, 200)}`;
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

