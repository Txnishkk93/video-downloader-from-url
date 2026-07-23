import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "799e040346msh216335256517effp1085dcjsn4968c36b32dc";

  try {
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
      throw new Error("RapidAPI Error: You have not subscribed to the 'youtube-video-download-api1' on RapidAPI yet. Please click 'Subscribe' on the API pricing page.");
    }

    // Format the JSON data so it looks readable in the frontend's pre block
    const formattedString = JSON.stringify(data, null, 2);
    
    return NextResponse.json({ formats: formattedString });
  } catch (error: any) {
    console.error("[RapidAPI formats error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch formats from RapidAPI", details: error.toString() },
      { status: 500 }
    );
  }
}
