import { NextResponse } from "next/server";
import { jobs } from "../media/download/route";

export async function GET() {
  return NextResponse.json({ status: "ok", jobs: Object.keys(jobs).length });
}

