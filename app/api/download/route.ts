import { NextResponse, type NextRequest } from "next/server";
const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { url, formatId } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "799e040346msh216335256517effp1085dcjsn4968c36b32dc";
    
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : url;

    const response = await fetch(`https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com",
      },
    });

    const data = await response.json();
    
    if (data.message === "You are not subscribed to this API.") {
      throw new Error("RapidAPI Error: You have not subscribed to 'youtube-media-downloader'. Please go to RapidAPI and subscribe to the basic plan.");
    }

    let videoUrl = "";
    if (data.videos && data.videos.items && data.videos.items.length > 0) {
      videoUrl = data.videos.items[0].url;
    } else if (data.audios && data.audios.items && data.audios.items.length > 0) {
      videoUrl = data.audios.items[0].url;
    }

    if (!videoUrl) {
      throw new Error("Could not automatically find the download URL in the RapidAPI response.");
    }

    const title = data.title || "video";
    const filename = `${sanitize(title)}.mp4`;

    // Return the URL directly to the client
    // By passing it to the client, the user's browser (residential IP) will download the file,
    // which completely bypasses YouTube's block on Vercel's datacenter IPs!
    return NextResponse.json({ downloadUrl: videoUrl, filename });
  } catch (error: any) {
    console.error("[RapidAPI download error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to download video via RapidAPI", details: error.toString() },
      { status: 500 }
    );
  }
}
