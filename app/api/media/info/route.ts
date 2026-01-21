// app/api/media/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchVideoInfo } from "@/lib/server/videoInfoFetcher";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await req.json().catch(() => ({ url: "" }));
    const { url } = body;

    console.log("[media-info] Request received:", {
      url,
      timestamp: new Date().toISOString(),
      isVercel: process.env.VERCEL === "1",
    });

    // Validation
    if (!url) {
      console.log("[media-info] Missing URL parameter");
      return NextResponse.json(
        { success: false, error: "URL required" },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      console.log("[media-info] Invalid URL format:", url);
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!isYouTubeUrl(url)) {
      console.log("[media-info] Non-YouTube URL provided:", url);
      return NextResponse.json(
        { success: false, error: "Please provide a YouTube URL" },
        { status: 400 }
      );
    }

    // Fetch video info
    console.log("[media-info] Fetching video info for:", url);
    const info = await fetchVideoInfo(url);
    
    const responseTime = Date.now() - startTime;
    console.log("[media-info] Success! Response time:", responseTime, "ms");
    console.log("[media-info] Video title:", info.title);
    console.log("[media-info] Formats found:", info.formats.length);

    return NextResponse.json({
      success: true,
      extractor: "youtube",
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      formats: info.formats,
      audio_formats: info.audio_formats,
    });

  } catch (err) {
    const responseTime = Date.now() - startTime;
    
    console.error("[media-info] Error occurred:", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      responseTime,
    });

    // Determine appropriate error message
    let errorMessage = "Failed to fetch video info. Please try again.";
    let statusCode = 500;

    if (err instanceof Error) {
      if (err.message.includes("Could not extract video ID")) {
        errorMessage = "Invalid YouTube URL format";
        statusCode = 400;
      } else if (err.message.includes("Video not found")) {
        errorMessage = "Video not found or unavailable";
        statusCode = 404;
      } else if (err.message.includes("timeout") || err.message.includes("ETIMEDOUT")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      } else if (err.message.includes("rate limit")) {
        errorMessage = "Rate limited. Please wait a moment and try again.";
        statusCode = 429;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

// Add OPTIONS handler for CORS (if needed)
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}