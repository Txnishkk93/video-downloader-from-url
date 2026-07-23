import { exec, type ExecException } from "child_process";
import { NextResponse, type NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

function findLocalBinary(names: string[]): string | null {
  const cwd = process.cwd();
  for (const name of names) {
    const local = path.join(cwd, "node_modules", ".bin", name);
    if (fs.existsSync(local)) return local;
  }
  return null;
}

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  const candidates = ["yt-dlp", "yt-dlp.exe", "youtube-dl", "youtube-dl.exe"];
  const localBinary = findLocalBinary(candidates);
  const binaryToUse = localBinary || "yt-dlp";

  return new Promise((resolve) => {
    exec(
      `"${binaryToUse}" -F "${url}"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (err: ExecException | null, stdout: string, stderr: string) => {
        if (err) {
          console.error("[yt-dlp formats error]", {
            code: err.code,
            message: err.message,
            stderr,
            using: binaryToUse,
          });

          if (err.code === 127 || err.message?.includes("not found") || err.message?.includes("ENOENT")) {
            const details = localBinary ? `Failed running ${localBinary}` : "yt-dlp command not found";
            return resolve(
              NextResponse.json(
                {
                  error: "yt-dlp is not available on this server. For Vercel, include a node binary or use an external service.",
                  details,
                },
                { status: 503 }
              )
            );
          }

          return resolve(
            NextResponse.json(
              { error: stderr || err.message || "Failed to fetch formats", code: err.code },
              { status: 500 }
            )
          );
        }

        if (!stdout) {
          return resolve(NextResponse.json({ error: "No formats returned. The URL might be invalid." }, { status: 400 }));
        }

        resolve(NextResponse.json({ formats: stdout }));
      }
    );
  });
}