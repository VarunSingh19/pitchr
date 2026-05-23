const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== "node_modules" && f !== ".next" && f !== ".git" && f !== "uploads") {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const rootDir = path.join(__dirname, "..");
console.log("Scanning files for confirm() and alert()...");

walkDir(rootDir, (filePath) => {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    const text = fs.readFileSync(filePath, "utf8");
    
    // Check for confirm(...)
    const confirmMatches = text.match(/confirm\s*\(["'`]/g);
    if (confirmMatches) {
      console.log(`[CONFIRM] Found in: ${filePath}`);
    }

    // Check for alert(...)
    const alertMatches = text.match(/alert\s*\(["'`]/g);
    if (alertMatches) {
      console.log(`[ALERT] Found in: ${filePath}`);
    }
  }
});
console.log("Scan complete.");
process.exit(0);
