import ytdl from "@distube/ytdl-core";
import { NextResponse, type NextRequest } from "next/server";
import { getYoutubeAgent } from "@/lib/youtube-agent";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    const agent = getYoutubeAgent();
    const info = await ytdl.getInfo(url, { agent });
    
    // Create a string table from the formats array to mimic yt-dlp -F output format
    let formatString = "ID    EXT     RES        FPS    VCODEC         ACODEC         SIZE\n";
    formatString += "----------------------------------------------------------------------\n";
    
    for (const format of info.formats) {
      const id = String(format.itag).padEnd(6);
      const ext = (format.container || "unknown").padEnd(8);
      const res = (format.qualityLabel || (format.hasAudio && !format.hasVideo ? "audio only" : "unknown")).padEnd(11);
      const fps = (format.fps ? String(format.fps) : "").padEnd(7);
      const vcodec = (format.videoCodec || (format.hasVideo ? "unknown" : "none")).padEnd(15);
      const acodec = (format.audioCodec || (format.hasAudio ? "unknown" : "none")).padEnd(15);
      
      let sizeStr = "unknown";
      if (format.contentLength) {
        const mb = (parseInt(format.contentLength, 10) / 1024 / 1024).toFixed(2);
        sizeStr = `${mb}MB`;
      }
      
      formatString += `${id}${ext}${res}${fps}${vcodec}${acodec}${sizeStr}\n`;
    }

    return NextResponse.json({ formats: formatString });
  } catch (error: any) {
    console.error("[ytdl-core formats error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch formats", details: error.toString() },
      { status: 500 }
    );
  }
}