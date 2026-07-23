import { exec, type ExecException } from "child_process";
import { NextResponse, type NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";

function findLocalBinary(names: string[]): string | null {
  const cwd = process.cwd();
  for (const name of names) {
    const local = path.join(cwd, "node_modules", ".bin", name);
    if (fs.existsSync(local)) return local;
  }
  return null;
}

export async function POST(req: NextRequest): Promise<Response> {
  const { url, formatId } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  const tempDir = os.tmpdir();
  const uniqueId = uuidv4().replace(/-/g, "").substring(0, 8);
  const outputTemplate = path.join(tempDir, `yt-dlp-${uniqueId}`);
  const format = formatId ? `-f ${formatId}` : "";

  const candidates = ["yt-dlp", "yt-dlp.exe", "youtube-dl", "youtube-dl.exe"];
  const localBinary = findLocalBinary(candidates);
  const binaryToUse = localBinary || "yt-dlp";

  return new Promise((resolve) => {
    exec(
      `"${binaryToUse}" ${format} -o "${outputTemplate}.%(ext)s" "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 300000 },
      (err: ExecException | null, stdout: string, stderr: string) => {
        if (err) {
          console.error("[yt-dlp download error]", {
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
                  error: "yt-dlp is not installed on this server. Please install it to use this feature.",
                  details,
                },
                { status: 503 }
              )
            );
          }

          return resolve(
            NextResponse.json(
              { error: stderr || err.message || "Failed to download video", code: err.code },
              { status: 500 }
            )
          );
        }

        // Find the downloaded file with our unique ID
        try {
          const files = fs.readdirSync(tempDir);
          const downloadedFile = files.find((f) => f.startsWith(`yt-dlp-${uniqueId}`));

          if (!downloadedFile) {
            resolve(NextResponse.json({ error: "Video file not found after download" }, { status: 500 }));
            return;
          }

          const fullPath = path.join(tempDir, downloadedFile);
          const fileSize = fs.statSync(fullPath).size;

          if (fileSize === 0) {
            fs.unlinkSync(fullPath);
            resolve(NextResponse.json({ error: "Downloaded file is empty" }, { status: 500 }));
            return;
          }

          const fileStream = fs.createReadStream(fullPath);

          // Create response with download headers
          const response = new Response(fileStream as unknown as BodyInit, {
            headers: {
              "Content-Disposition": `attachment; filename="${downloadedFile}"`,
              "Content-Type": "video/mp4",
              "Content-Length": fileSize.toString(),
            },
          });

          // Clean up temp file after response is sent
          fileStream.on("end", () => {
            setTimeout(() => {
              try {
                if (fs.existsSync(fullPath)) {
                  fs.unlinkSync(fullPath);
                }
              } catch {
                // Ignore cleanup errors
              }
            }, 1000);
          });

          resolve(response);
        } catch (error) {
          resolve(NextResponse.json({ error: `Error processing download: ${(error as Error).message}` }, { status: 500 }));
        }
      }
    );
  });
}