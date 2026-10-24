const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const imagesDir = path.join(__dirname, "images");

function generatePlaceholderImage(prompt, sceneNumber) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(imagesDir, { recursive: true });

    const output = path.join(
      imagesDir,
      `scene-${sceneNumber}.jpg`
    );

    const text = String(prompt || `المشهد ${sceneNumber}`)
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:");

    const args = [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=white:s=1280x720",
      "-vf",
      `drawtext=text='${text}':fontcolor=black:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-frames:v", "1",
      output
    ];

    const process = spawn("ffmpeg", args);
    let errorOutput = "";

    process.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    process.on("close", code => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
}

module.exports = {
  generatePlaceholderImage
};
