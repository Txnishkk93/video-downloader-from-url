import { NextResponse, type NextRequest } from "next/server";
import youtubedl from "youtube-dl-exec";

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { url, formatId } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    // Try to fetch video title, default to 'video'
    let title = "video";
    try {
      const info = await youtubedl(url, { dumpSingleJson: true, noWarnings: true, callHome: false, noCheckCertificates: true });
      title = (info as any).title || "video";
    } catch (e) {
      console.warn("Failed to fetch title, using default", e);
    }
    const filename = `${sanitize(title)}.mp4`;
    
    const format = formatId ? formatId : "best";

    // Set up headers for the stream
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set("Content-Type", "video/mp4");

    // Start video download stream
    const subprocess = youtubedl.exec(url, {
      output: '-',
      format: format,
      noWarnings: true,
      callHome: false,
      noCheckCertificates: true,
    });
    
    if (!subprocess.stdout) {
      throw new Error("Failed to start youtube-dl subprocess stdout");
    }

    // Convert Node.js stream to Web ReadableStream
    const responseStream = new ReadableStream({
      start(controller) {
        subprocess.stdout?.on('data', (chunk) => controller.enqueue(chunk));
        subprocess.stdout?.on('end', () => controller.close());
        subprocess.stdout?.on('error', (err) => controller.error(err));
        subprocess.on('error', (err) => controller.error(err));
      },
      cancel() {
        subprocess.kill();
      }
    });

    return new Response(responseStream, { headers });
  } catch (error: any) {
    console.error("[youtube-dl-exec download error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to download video", details: error.toString() },
      { status: 500 }
    );
  }
}
