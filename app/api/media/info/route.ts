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

interface YtDlpFormat {
  format_id: string;
  quality?: string;
  ext: string;
  filesize?: number;
  vcodec: string;
  acodec: string;
  format_note?: string;
  resolution?: string;
  height?: number;
  abr?: number;
}

interface YtDlpResponse {
  formats?: YtDlpFormat[];
  extractor?: string;
  ie_key?: string;
  title?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string }>;
  duration?: number;
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
    console.log("[media-info] Starting request for URL:", url);
    const ytDlp = await getYtDlpWrap();
    console.log("[media-info] yt-dlp initialized successfully");
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
    const json: YtDlpResponse = JSON.parse(stdout);

    // Parse yt-dlp formats for muxed (video+audio) and best mergeable pairs
    const formats: Format[] = [];
    const audioFormats: Format[] = [];
    const seenMuxed = new Set<string>();
    (json.formats || []).forEach((f: YtDlpFormat) => {
      // Muxed (video+audio in one file)
      if (f.vcodec !== "none" && f.acodec !== "none") {
        const label = `${f.format_note || f.resolution || (f.height ? f.height + 'p' : '')}`.replace(/\s+/g, ' ').trim();
        const quality = label || `${f.height ? f.height + 'p' : ''}`;
        if (!seenMuxed.has(f.format_id)) {
          formats.push({
            format_id: f.format_id,
            ext: f.ext,
            quality: quality,
            filesize: f.filesize || 0,
            has_audio: true,
            has_video: true,
            resolution: f.resolution || (f.height ? f.height + 'p' : undefined),
          });
          seenMuxed.add(f.format_id);
        }
      } else if (f.vcodec === "none" && f.acodec !== "none") {
        // Audio only
        audioFormats.push({
          format_id: f.format_id,
          ext: f.ext,
          quality: f.abr ? `${f.abr}kbps` : f.format_note || f.ext,
          filesize: f.filesize || 0,
          has_audio: true,
          has_video: false,
          resolution: "audio",
        });
      }
    });

    // If no muxed formats, try to offer bestvideo+bestaudio merge (yt-dlp will merge)
    if (formats.length === 0 && (json.formats || []).length > 0) {
      // Find best video and best audio
      const bestVideo = (json.formats || []).filter((f: YtDlpFormat) => f.vcodec !== "none" && f.acodec === "none").sort((a: YtDlpFormat, b: YtDlpFormat) => (b.height || 0) - (a.height || 0))[0];
      const bestAudio = (json.formats || []).filter((f: YtDlpFormat) => f.vcodec === "none" && f.acodec !== "none").sort((a: YtDlpFormat, b: YtDlpFormat) => (b.abr || 0) - (a.abr || 0))[0];
      if (bestVideo && bestAudio) {
        formats.push({
          format_id: `${bestVideo.format_id}+${bestAudio.format_id}`,
          ext: bestVideo.ext,
          quality: `${bestVideo.height ? bestVideo.height + 'p' : ''} (merge)`,
          filesize: (bestVideo.filesize || 0) + (bestAudio.filesize || 0),
          has_audio: true,
          has_video: true,
          resolution: bestVideo.resolution || (bestVideo.height ? bestVideo.height + 'p' : undefined),
        });
      }
    }

    // Remove duplicates and sort by quality descending
    const uniqueFormats = Array.from(new Map(formats.map(f => [f.format_id, f])).values());
    uniqueFormats.sort((a, b) => {
      const getHeight = (q: string) => parseInt((q.match(/(\d+)p/) || [])[1] || '0', 10);
      return getHeight(b.quality) - getHeight(a.quality);
    });
    audioFormats.sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

    return NextResponse.json({
      success: true,
      extractor: json.extractor || json.ie_key || "unknown",
      title: json.title || "Unknown Title",
      thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
      duration: json.duration || 0,
      formats: uniqueFormats,
      audio_formats: audioFormats,
    });
  } catch (err) {
    console.error("[media-info] Caught error:", err);
    console.error("[media-info] Error stack:", err instanceof Error ? err.stack : "N/A");
    const raw = err instanceof Error ? err.message : String(err);
    let errorMessage = "Failed to fetch media info";

    console.error("Error details:", { message: raw });

    if (raw.includes("video is unavailable") || raw.includes("Video unavailable")) {
      errorMessage = "This video is unavailable.";
    } else if (raw.includes("Requested format is not available") || raw.includes("Requested format")) {
      errorMessage = "This video format is not available. The video may be private or restricted.";
    } else if (raw.includes("Unsupported URL")) {
      errorMessage = "This URL is not supported. Please check the URL and try again.";
    } else if (raw.includes("HTTP Error 403")) {
      errorMessage = "Access denied. The video may be age-restricted or region-locked.";
    } else if (raw.includes("HTTP Error 404")) {
      errorMessage = "Video not found. The URL may be incorrect or the video may have been removed.";
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

