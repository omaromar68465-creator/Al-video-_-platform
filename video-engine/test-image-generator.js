const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function createTestImage(sceneNumber, text, outputPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    const safeText = String(text || `المشهد ${sceneNumber}`)
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:");

    const args = [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=white:s=1280x720",
      "-vf",
      `drawtext=text='${safeText}':fontcolor=black:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-frames:v", "1",
      outputPath
    ];

    const process = spawn("ffmpeg", args);
    let errorOutput = "";

    process.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    process.on("close", code => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
}

async function main() {
  const scenes = JSON.parse(
    fs.readFileSync("video-engine/scenes/test-plan.json", "utf8")
  );

  for (const scene of scenes.scenes) {
    const output = `video-engine/images/scene-${scene.sceneNumber}.jpg`;

    await createTestImage(
      scene.sceneNumber,
      `المشهد ${scene.sceneNumber}`,
      output
    );

    console.log(`تم إنشاء الصورة: ${output}`);
  }

  console.log("اكتمل إنشاء صور جميع المشاهد");
}

main().catch(error => {
  console.error("حدث خطأ:");
  console.error(error.message);
  process.exit(1);
});
