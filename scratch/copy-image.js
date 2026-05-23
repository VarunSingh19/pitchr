const fs = require("fs")
const path = require("path")

const source = "C:\\Users\\varun\\.gemini\\antigravity\\brain\\cffc5ed0-358f-497a-a680-8f50d25dd4ac\\about_isometric_1779550488182.png"
const destDir = "c:\\Users\\varun\\Desktop\\cea\\public\\images"
const dest = path.join(destDir, "about-isometric.png")

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
    console.log("Created directory:", destDir)
  }
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest)
    console.log("Successfully copied image to:", dest)
  } else {
    console.error("Source image not found:", source)
  }
} catch (err) {
  console.error("Error copying file:", err)
}
