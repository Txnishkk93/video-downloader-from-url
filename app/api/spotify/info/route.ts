import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { spotify_url } = await req.json().catch(() => ({ spotify_url: "" }));

  if (!spotify_url) {
    return NextResponse.json({ success: false, error: "Spotify URL required" }, { status: 400 });
  }

  // Placeholder implementation – replace with real Spotify API integration if desired
  return NextResponse.json({
    success: true,
    title: "Sample Song",
    artist: "Sample Artist",
    album: "Sample Album",
    cover: "https://i.scdn.co/image/sample",
  });
}

