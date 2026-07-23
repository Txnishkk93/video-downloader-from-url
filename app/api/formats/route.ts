import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "799e040346msh216335256517effp1085dcjsn4968c36b32dc";

  try {
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
      throw new Error("RapidAPI Error: You have not subscribed to 'youtube-media-downloader'. Please go to RapidAPI and subscribe.");
    }

    // Format the JSON data so it looks readable in the frontend's pre block
    const formattedData = {
      title: data.title,
      videos: data.videos?.items?.map((v: any) => ({ quality: v.quality, extension: v.extension, size: v.sizeText })),
      audios: data.audios?.items?.map((a: any) => ({ quality: a.quality, extension: a.extension, size: a.sizeText }))
    };
    const formattedString = JSON.stringify(formattedData, null, 2);
    
    return NextResponse.json({ formats: formattedString });
  } catch (error: any) {
    console.error("[RapidAPI formats error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch formats from RapidAPI", details: error.toString() },
      { status: 500 }
    );
  }
}
