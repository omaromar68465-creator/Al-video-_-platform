const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const imagesDir = path.join(__dirname, "images");

function ensureImagesDir() {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/*
  مولّد الصور الموحد

  حاليًا:
  - يعمل بوضع الاختبار بدون أي API مدفوعة.
  - لاحقًا يمكن ربطه بنموذج AI محلي مجاني.
*/

function generateImage(prompt, sceneNumber, options = {}) {
  const mode = options.mode || "placeholder";

  if (mode === "placeholder") {
    return generatePlaceholderImage(prompt, sceneNumber);
  }

  return Promise.reject(
    new Error("مولد الصور المحلي AI غير موصول بعد")
  );
}

function generatePlaceholderImage(prompt, sceneNumber) {
  ensureImagesDir();

  const outputFile = path.join(
    imagesDir,
    `scene-${sceneNumber}.jpg`
  );

  return new Promise((resolve, reject) => {
    const safePrompt = String(prompt || "مشهد فيديو")
      .replace(/\\/g, " ")
      .replace(/"/g, "'")
      .replace(/:/g, " ");

    const args = [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=white:s=1280x720",
      "-frames:v", "1",
      "-vf",
      `drawtext=text='Scene ${sceneNumber}':fontcolor=black:fontsize=42:x=(w-text_w)/2:y=300,drawtext=text='${safePrompt.slice(0, 120)}':fontcolor=black:fontsize=24:x=40:y=380`,
      outputFile
    ];

    const process = spawn("ffmpeg", args);

    let errorOutput = "";

    process.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    process.on("close", code => {
      if (code === 0) {
        resolve(outputFile);
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
}

module.exports = {
  generateImage,
  generatePlaceholderImage
};
