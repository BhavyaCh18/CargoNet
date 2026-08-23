const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith(".js")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const apiFiles = getAllFiles(path.join(__dirname, "../api"));
console.log(`Checking syntax for ${apiFiles.length} JavaScript files in api/...\n`);

let hasError = false;

for (const file of apiFiles) {
  const relativePath = path.relative(path.join(__dirname, ".."), file);
  try {
    execSync(`node -c "${file}"`, { stdio: "pipe" });
    console.log(`[OK] ${relativePath}`);
  } catch (err) {
    console.error(`[SYNTAX ERROR] ${relativePath}:\n${err.stderr.toString()}`);
    hasError = true;
  }
}

if (!hasError) {
  console.log("\nALL API FILES PASSED SYNTAX VERIFICATION!");
} else {
  console.error("\nSOME API FILES HAS SYNTAX ERRORS!");
  process.exit(1);
}
