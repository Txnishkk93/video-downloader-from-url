/**
 * Video info fetcher that works on Vercel
 * Multiple fallback APIs for reliability
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
  itag?: number | string;
  height?: number;
  width?: number;
  ext?: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  abr?: number;
  quality?: string;
  qualityLabel?: string;
}

interface ApiResponse {
  title?: string;
  duration?: number;
  thumbnail?: string;
  formats?: ApiFormat[];
  audio_formats?: ApiFormat[];
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fallback 1: YouTube Data API v3 (requires API key but very reliable)
 */
async function fetchFromYouTubeAPI(videoId: string): Promise<VideoMetadata> {
  console.log("[video-info] Trying YouTube Data API");
  
  // Note: You'll need to set YOUTUBE_API_KEY in environment variables
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error("YouTube API key not configured");
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`YouTube API returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error("Video not found");
  }

  const video = data.items[0];
  
  // Parse ISO 8601 duration (PT1H2M10S -> seconds)
  const duration = parseISO8601Duration(video.contentDetails.duration);
  
  // Generate standard quality formats (YouTube doesn't expose actual formats via this API)
  const formats: VideoFormat[] = [
    { format_id: "22", quality: "720p", ext: "mp4", filesize: 0, has_audio: true, has_video: true, resolution: "720p" },
    { format_id: "18", quality: "360p", ext: "mp4", filesize: 0, has_audio: true, has_video: true, resolution: "360p" },
  ];

  const audio_formats: VideoFormat[] = [
    { format_id: "140", quality: "128kbps", ext: "m4a", filesize: 0, has_audio: true, has_video: false, resolution: "audio" },
  ];

  return {
    title: video.snippet.title,
    duration,
    thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
    formats,
    audio_formats,
  };
}

/**
 * Fallback 2: Use ytdl-info service
 */
async function fetchFromYtdlInfo(videoId: string): Promise<VideoMetadata> {
  console.log("[video-info] Trying ytdl-info service");
  
  const response = await fetch(
    `https://ytdl-info.herokuapp.com/api/info?url=https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    }
  );

  if (!response.ok) {
    throw new Error(`Service returned ${response.status}`);
  }

  const data: ApiResponse = await response.json();

  return transformApiResponse(data);
}

/**
 * Fallback 3: Direct scraping approach (basic info only)
 */
async function fetchFromScraping(videoId: string): Promise<VideoMetadata> {
  console.log("[video-info] Trying direct scraping");
  
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch page");
  }

  const html = await response.text();
  
  // Extract title
  const titleMatch = html.match(/<title>(.+?)<\/title>/);
  const title = titleMatch?.[1]?.replace(" - YouTube", "") || "Unknown Title";
  
  // Extract thumbnail
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  
  // Try to extract duration from meta tags
  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const duration = durationMatch?.[1] ? parseInt(durationMatch[1]) : 0;

  // Return basic formats
  return {
    title,
    duration,
    thumbnail,
    formats: [
      { format_id: "22", quality: "720p", ext: "mp4", filesize: 0, has_audio: true, has_video: true, resolution: "720p" },
      { format_id: "18", quality: "360p", ext: "mp4", filesize: 0, has_audio: true, has_video: true, resolution: "360p" },
    ],
    audio_formats: [
      { format_id: "140", quality: "128kbps", ext: "m4a", filesize: 0, has_audio: true, has_video: false, resolution: "audio" },
    ],
  };
}

/**
 * Transform API response to our format
 */
function transformApiResponse(data: ApiResponse): VideoMetadata {
  const formats: VideoFormat[] = (data.formats || [])
    .filter((f: ApiFormat) => f.vcodec !== "none")
    .map((f: ApiFormat) => ({
      format_id: String(f.format_id || f.itag || ""),
      quality: f.qualityLabel || f.quality || `${f.height || "unknown"}p`,
      ext: f.ext || "mp4",
      filesize: f.filesize || 0,
      has_audio: f.acodec !== "none",
      has_video: f.vcodec !== "none",
      resolution: f.height ? `${f.height}p` : undefined,
    }))
    .slice(0, 10);

  const audio_formats: VideoFormat[] = (data.audio_formats || [])
    .map((f: ApiFormat) => ({
      format_id: String(f.format_id || f.itag || ""),
      quality: f.abr ? `${f.abr}kbps` : "audio",
      ext: f.ext || "m4a",
      filesize: f.filesize || 0,
      has_audio: true,
      has_video: false,
      resolution: "audio",
    }))
    .slice(0, 5);

  return {
    title: data.title || "Unknown Title",
    duration: data.duration || 0,
    thumbnail: data.thumbnail || "",
    formats,
    audio_formats,
  };
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Main function with fallback strategy
 */
export async function fetchVideoInfo(url: string, tryYtDlp: boolean = true): Promise<VideoMetadata> {
  // Extract video ID
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw new Error("Could not extract video ID from URL");
  }

  console.log(`[video-info] Fetching info for video: ${videoId}`);

  const isVercel = process.env.VERCEL === "1";

  // On local development, try yt-dlp first
  if (!isVercel && tryYtDlp) {
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
      
      console.log("[video-info] Successfully fetched via yt-dlp");
      return transformApiResponse(json);
    } catch (error) {
      console.error("[video-info] yt-dlp failed:", error);
    }
  }

  // Try fallbacks in order
  const fallbacks = [
    () => fetchFromYouTubeAPI(videoId),
    () => fetchFromYtdlInfo(videoId),
    () => fetchFromScraping(videoId),
  ];

  let lastError: Error | null = null;

  for (const fallback of fallbacks) {
    try {
      const result = await fallback();
      console.log("[video-info] Successfully fetched video info");
      return result;
    } catch (error) {
      console.error(`[video-info] Fallback failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // All fallbacks failed
  throw lastError || new Error("Could not fetch video info from any source");
}