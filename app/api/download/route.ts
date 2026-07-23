import { NextResponse, type NextRequest } from "next/server";
import youtubedl from "youtube-dl-exec";
import path from "path";
import os from "os";

const isWin = os.platform() === "win32";
const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp_linux";
const binaryPath = path.join(process.cwd(), "bin", binaryName);
const ytdl = youtubedl.create(binaryPath);

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { url, formatId } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "799e040346msh216335256517effp1085dcjsn4968c36b32dc";
    const encodedUrl = encodeURIComponent(url);

    const response = await fetch(`https://youtube-video-download-api1.p.rapidapi.com/?url=${encodedUrl}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "youtube-video-download-api1.p.rapidapi.com",
      },
    });

    const data = await response.json();
    
    if (data.message === "You are not subscribed to this API.") {
      throw new Error("RapidAPI Error: You have not subscribed to 'youtube-video-download-api1'. Please go to RapidAPI and subscribe to the basic plan.");
    }

    // Try to magically find the video download URL in the unknown JSON structure
    let videoUrl = "";
    if (data.url) videoUrl = data.url;
    else if (data.data?.url) videoUrl = data.data.url;
    else if (data.formats && data.formats.length > 0) videoUrl = data.formats[0].url;
    else if (data.data?.formats && data.data.formats.length > 0) videoUrl = data.data.formats[0].url;
    else if (data.links && data.links.length > 0) videoUrl = data.links[0].url;
    else if (data.data?.links && data.data.links.length > 0) videoUrl = data.data.links[0].url;
    else if (data.items && data.items.length > 0) videoUrl = data.items[0].url;

    if (!videoUrl) {
      throw new Error("Could not automatically find the download URL in the RapidAPI response. Please check the JSON format in the Formats tab.");
    }

    const title = data.title || data.data?.title || "video";
    const filename = `${sanitize(title)}.mp4`;

    // Fetch the actual video stream from the RapidAPI download URL
    const videoStreamResponse = await fetch(videoUrl);
    
    if (!videoStreamResponse.ok || !videoStreamResponse.body) {
      throw new Error("Failed to fetch the actual video stream from the provided RapidAPI link.");
    }

    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set("Content-Type", "video/mp4");

    return new Response(videoStreamResponse.body, { headers });
  } catch (error: any) {
    console.error("[RapidAPI download error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to download video via RapidAPI", details: error.toString() },
      { status: 500 }
    );
  }
}
