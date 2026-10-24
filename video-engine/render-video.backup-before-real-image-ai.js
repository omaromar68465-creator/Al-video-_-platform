const fs = require("fs");
const path = require("path");
const { buildVideoPlan } = require("./ai-planner");
const { generateImage } = require("./image-generator");
const { createMotionClip } = require("./image-to-video");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createConcatList(clips, listFile) {
  const content = clips
    .map(file => `file '${path.resolve(file).replace(/'/g, "'\\''")}'`)
    .join("\n");

  fs.writeFileSync(listFile, content + "\n");
}

function runFFmpeg(args) {
  const { spawn } = require("child_process");

  return new Promise((resolve, reject) => {
    const process = spawn("ffmpeg", args);

    let stderr = "";

    process.stderr.on("data", data => {
      stderr += data.toString();
    });

    process.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr));
      }
    });
  });
}

async function renderVideo(input, options = {}) {
  const outputDir = path.join(__dirname, "output");
  const clipsDir = path.join(__dirname, "clips");

  ensureDir(outputDir);
  ensureDir(clipsDir);

  console.log("1) إنشاء مخطط الفيديو...");
  const plan = buildVideoPlan(input);

  console.log(`تم إنشاء ${plan.scenes.length} مشاهد`);

  const clips = [];

  for (const scene of plan.scenes) {
    console.log(`2) إنشاء صورة المشهد ${scene.sceneNumber}...`);

    const imagePath = await generateImage(
      scene.visualPrompt,
      scene.sceneNumber
    );

    scene.imagePath = imagePath;

    console.log(`   الصورة: ${imagePath}`);

    const clipPath = path.join(
      clipsDir,
      `render-${Date.now()}-${scene.sceneNumber}.mp4`
    );

    console.log(`3) تحريك المشهد ${scene.sceneNumber}...`);

    await createMotionClip(
      imagePath,
      clipPath,
      scene.duration
    );

    scene.clipPath = clipPath;
    clips.push(clipPath);

    console.log(`   المقطع: ${clipPath}`);

    if (options.onProgress) {
      options.onProgress(
        scene.sceneNumber,
        plan.scenes.length
      );
    }
  }

  console.log("4) دمج جميع المشاهد...");

  const listFile = path.join(
    outputDir,
    `concat-${Date.now()}.txt`
  );

  const outputFile = path.join(
    outputDir,
    `video-${Date.now()}.mp4`
  );

  createConcatList(clips, listFile);

  await runFFmpeg([
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listFile,
    "-c", "copy",
    outputFile
  ]);

  const planFile = path.join(
    outputDir,
    `${path.basename(outputFile, ".mp4")}.json`
  );

  fs.writeFileSync(
    planFile,
    JSON.stringify(plan, null, 2)
  );

  console.log("================================");
  console.log("تم إنشاء الفيديو بنجاح");
  console.log("الفيديو:", outputFile);
  console.log("المخطط:", planFile);
  console.log("================================");

  return {
    outputFile,
    planFile,
    plan
  };
}

module.exports = {
  renderVideo
};
