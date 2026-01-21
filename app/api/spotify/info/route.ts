
import { NextRequest, NextResponse } from "next/server";
import { getYtDlpWrap } from "@/lib/server/ytDlp";

export async function POST(req: NextRequest) {
  const { spotify_url } = await req.json().catch(() => ({ spotify_url: "" }));

  if (!spotify_url) {
    return NextResponse.json({ success: false, error: "Spotify URL required" }, { status: 400 });
  }

  try {
    const ytDlp = await getYtDlpWrap();
    const args: string[] = [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      "--skip-download",
      spotify_url,
    ];
    const stdout = await ytDlp.execPromise(args, { shell: false });
    interface SpotifyData {
      title?: string;
      artist?: string;
      uploader?: string;
      album?: string;
      thumbnail?: string;
      thumbnails?: Array<{ url: string }>;
    }
    const json: SpotifyData = JSON.parse(stdout);
    return NextResponse.json({
      success: true,
      title: json.title || "Unknown Title",
      artist: json.artist || json.uploader || "Unknown Artist",
      album: json.album || "Unknown Album",
      cover_image: json.thumbnail || json.thumbnails?.[0]?.url || "",
    });
  } catch (err) {
    console.error("Error getting Spotify info:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMessage || "Failed to fetch Spotify info" },
      { status: 400 },
    );
  }
}