// app/api/media/progress/[job_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jobs } from "../../download/route";

export async function GET(
  req: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const { job_id } = params;

    console.log("[progress] Checking job:", job_id);

    const job = jobs.get(job_id);

    if (!job) {
      console.log("[progress] Job not found:", job_id);
      return NextResponse.json(
        {
          success: false,
          status: "error",
          progress: 0,
          error: "Job not found",
        },
        { status: 404 }
      );
    }

    console.log("[progress] Job status:", {
      job_id,
      status: job.status,
      progress: job.progress,
    });

    return NextResponse.json({
      success: true,
      status: job.status,
      progress: job.progress,
      file_url: job.file_url,
      error: job.error,
    });
  } catch (error) {
    console.error("[progress] Error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        progress: 0,
        error: "Failed to get progress",
      },
      { status: 500 }
    );
  }
}