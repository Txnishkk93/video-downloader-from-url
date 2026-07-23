import ytdl from "@distube/ytdl-core";
import { NextResponse, type NextRequest } from "next/server";
import { getYoutubeAgent } from "@/lib/youtube-agent";

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { url, formatId } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const agent = getYoutubeAgent();
    const info = await ytdl.getInfo(url, { agent });
    const title = info.videoDetails.title || "video";
    const filename = `${sanitize(title)}.mp4`;
    
    // Choose format
    let formatOptions: ytdl.downloadOptions = { quality: "highest", agent };
    if (formatId) {
      // Ensure formatId is handled properly by ytdl
      formatOptions = { quality: formatId, agent };
    } else {
      // By default get the highest quality with both video and audio
      formatOptions = { filter: "audioandvideo", quality: "highest", agent };
    }

    // Set up headers for the stream
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set("Content-Type", "video/mp4");

    // Start video download stream
    const stream = ytdl(url, formatOptions);
    
    // Convert Node.js stream to Web ReadableStream
    const responseStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      }
    });

    return new Response(responseStream, { headers });
  } catch (error: any) {
    console.error("[ytdl-core download error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to download video", details: error.toString() },
      { status: 500 }
    );
  }
}