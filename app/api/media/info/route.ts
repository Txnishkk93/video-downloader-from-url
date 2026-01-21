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

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({ url: "" }));

  if (!url) {
    return NextResponse.json({ success: false, error: "URL required" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
  }

  try {
    console.log("[media-info] Fetching info for URL:", url);
    const info = await fetchVideoInfo(url);

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
    console.error("[media-info] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error && err.message.includes("Could not")
            ? "Please provide a YouTube URL"
            : "Failed to fetch video info. Try again.",
      },
      { status: 500 }
    );
  }
}


