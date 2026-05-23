import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "images", "about-isometric.png");
    const buffer = fs.readFileSync(filePath);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return NextResponse.json({ width, height, aspectRatio: width / height });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
