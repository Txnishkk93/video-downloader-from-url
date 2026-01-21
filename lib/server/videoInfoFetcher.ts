/**
 * Video info fetcher that works on Vercel
 * Falls back to external API when yt-dlp is unavailable
 */

interface VideoFormat {
  format_id: string;
  quality: string;
  ext: string;
  filesize: number;
  has_audio: boolean;
  has_video: boolean;
  resolution?: string;
}

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  formats: VideoFormat[];
  audio_formats: VideoFormat[];
}

interface ApiFormat {
  format_id?: string;
  itag?: string;
  height?: number;
  width?: number;
  ext?: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  abr?: number;
}

interface ApiResponse {
  title?: string;
  duration?: number;
  thumbnail?: string;
  formats?: ApiFormat[];
  audio_formats?: ApiFormat[];
}

/**
 * Fetch video metadata using ytsearch API (works on Vercel)
 */
async function fetchFromYtSearch(url: string): Promise<VideoMetadata> {
  console.log("[video-info] Using ytsearch API fallback");
  
  try {
    // Extract video ID or use URL
    let videoId = "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      videoId = match?.[1] || "";
    }

    if (!videoId) {
      throw new Error("Could not extract video ID");
    }

    // Use napi.hackertab.cn (free, no auth needed)
    const response = await fetch(`https://www.napi.hackertab.cn/api/v1/yt?url=https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    // Transform API response to our format
    return {
      title: data.title || "Unknown Title",
      duration: data.duration || 0,
      thumbnail: data.thumbnail || "",
      formats: (data.formats || []).map((f: ApiFormat) => ({
        format_id: f.format_id || f.itag || "",
        quality: `${f.height || "unknown"}p`,
        ext: f.ext || "mp4",
        filesize: f.filesize || 0,
        has_audio: f.acodec !== "none",
        has_video: f.vcodec !== "none",
        resolution: f.height ? `${f.height}p` : undefined,
      })),
      audio_formats: (data.audio_formats || []).map((f: ApiFormat) => ({
        format_id: f.format_id || f.itag || "",
        quality: `${f.abr || "unknown"}kbps`,
        ext: f.ext || "m4a",
        filesize: f.filesize || 0,
        has_audio: true,
        has_video: false,
        resolution: "audio",
      })),
    };
  } catch (error) {
    console.error("[video-info] ytsearch failed:", error);
    throw error;
  }
}

/**
 * Fetch video info with fallback strategy
 */
export async function fetchVideoInfo(url: string, tryYtDlp: boolean = true): Promise<VideoMetadata> {
  // On Vercel, skip yt-dlp and go straight to fallback
  const isVercel = process.env.VERCEL === "1";

  if (isVercel || !tryYtDlp) {
    return fetchFromYtSearch(url);
  }

  // Local development: try yt-dlp first
  try {
    const { getYtDlpWrap } = await import("./ytDlp");
    const ytDlp = await getYtDlpWrap();
    
    const args = [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      url,
    ];

    const stdout = await ytDlp.execPromise(args, { shell: false });
    const json: ApiResponse = JSON.parse(stdout);

    // Format the response
    const formats: VideoFormat[] = [];
    const audioFormats: VideoFormat[] = [];

    (json.formats || []).forEach((f: ApiFormat) => {
      if (f.vcodec !== "none" && f.acodec !== "none") {
        formats.push({
          format_id: f.format_id || f.itag || "",
          quality: `${f.height || "unknown"}p`,
          ext: f.ext || "mp4",
          filesize: f.filesize || 0,
          has_audio: true,
          has_video: true,
          resolution: f.height ? `${f.height}p` : undefined,
        });
      } else if (f.vcodec === "none" && f.acodec !== "none") {
        audioFormats.push({
          format_id: f.format_id || f.itag || "",
          quality: f.abr ? `${f.abr}kbps` : "unknown",
          ext: f.ext || "m4a",
          filesize: f.filesize || 0,
          has_audio: true,
          has_video: false,
          resolution: "audio",
        });
      }
    });

    return {
      title: json.title || "Unknown Title",
      duration: json.duration || 0,
      thumbnail: json.thumbnail || "",
      formats: formats.slice(0, 10),
      audio_formats: audioFormats.slice(0, 5),
    };
  } catch (error) {
    console.error("[video-info] yt-dlp failed, falling back to API:", error);
    return fetchFromYtSearch(url);
  }
}
