import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Proactively copy the generated about isometric image on startup
try {
  const source = "C:\\Users\\varun\\.gemini\\antigravity\\brain\\cffc5ed0-358f-497a-a680-8f50d25dd4ac\\about_isometric_1779550488182.png";
  const destDir = path.join(process.cwd(), "public", "images");
  const dest = path.join(destDir, "about-isometric.png");
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log("NextConfig: Successfully copied about-isometric.png");
  }
} catch (e) {
  console.error("NextConfig: Failed to copy about-isometric.png on startup", e);
}

// Proactively copy the generated logo on startup
try {
  const logoSource = "C:\\Users\\varun\\.gemini\\antigravity\\brain\\cffc5ed0-358f-497a-a680-8f50d25dd4ac\\logo_1779552123103.png";
  const publicDir = path.join(process.cwd(), "public");
  
  if (fs.existsSync(logoSource)) {
    fs.copyFileSync(logoSource, path.join(publicDir, "logo.png"));
    fs.copyFileSync(logoSource, path.join(publicDir, "icon.png"));
    fs.copyFileSync(logoSource, path.join(publicDir, "favicon.ico"));
    console.log("NextConfig: Successfully copied logo files.");
  }
} catch (e) {
  console.error("NextConfig: Failed to copy logo on startup", e);
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mongoose", "@napi-rs/canvas", "canvas"],
};

export default nextConfig;
