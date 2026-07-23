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

    let cookiesPath;
    if (process.env.YOUTUBE_COOKIES) {
      cookiesPath = path.join(os.tmpdir(), "youtube-cookies.txt");
      require("fs").writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
    }

    // Try to fetch video title, default to 'video'
    let title = "video";
    try {
      const infoOptions: any = { dumpSingleJson: true, noWarnings: true, noCheckCertificates: true };
      if (cookiesPath) infoOptions.cookies = cookiesPath;
      const info = await ytdl(url, infoOptions);
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
    const streamOptions: any = {
      output: '-',
      format: format,
      noWarnings: true,
      noCheckCertificates: true,
    };
    if (cookiesPath) streamOptions.cookies = cookiesPath;

    const subprocess = ytdl.exec(url, streamOptions);
    
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
