import { NextResponse, type NextRequest } from "next/server";
import youtubedl from "youtube-dl-exec";
import path from "path";
import os from "os";

const isWin = os.platform() === "win32";
const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp_linux";
const binaryPath = path.join(process.cwd(), "bin", binaryName);
const ytdl = youtubedl.create(binaryPath);

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    let cookiesPath;
    if (process.env.YOUTUBE_COOKIES) {
      cookiesPath = path.join(os.tmpdir(), "youtube-cookies.txt");
      require("fs").writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
    }

    const options: any = {
      listFormats: true,
      noWarnings: true,
      noCheckCertificates: true,
      extractorArgs: 'youtube:player_client=android,ios,mweb,web',
    };
    if (cookiesPath) options.cookies = cookiesPath;

    const subprocess = ytdl.exec(url, options);
    
    const { stdout } = await subprocess;
    return NextResponse.json({ formats: stdout });
  } catch (error: any) {
    console.error("[youtube-dl-exec formats error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch formats", details: error.toString() },
      { status: 500 }
    );
  }
}
