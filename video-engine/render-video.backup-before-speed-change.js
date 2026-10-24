const fs = require("fs");
const path = require("path");
const { buildVideoPlan } = require("./ai-planner");
const { generateImage } = require("./image-generator");
const { createMotionClip } = require("./image-to-video");
const { spawn } = require("child_process");

const voicesDir = path.join(__dirname, "..", "voices");
const arabicVoiceModels = {
  "راوي عربي 1": "ar_JO-kareem-medium",
  "راوي عربي 2": "arabic-emirati-female-model",
  "راوي عربي 3": "piper-onnx-zayd0-arabic-diacritized",
  "راوي عربي 4": "arabic_single_last"
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stderr = "";

    child.stderr.on("data", data => {
      stderr += data.toString();
    });

    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function createNarrationAudio(text, outputWav, voice) {
  const cleanText = String(text || "").trim();
  const narrationText = cleanText.replace(/[\u064B-\u064D]/g, "");
  const arabicVoiceModel = arabicVoiceModels[String(voice || "").trim()] || arabicVoiceModels["راوي عربي 1"];

  if (!cleanText) {
    return false;
  }

  const rawFile = outputWav.replace(/\.wav$/i, ".raw");

  await runCommand(
    "piper",
    [
      "-m",
      arabicVoiceModel,
      "-f",
      rawFile,
      "--",
      narrationText
    ],
    {
      env: {
        ...process.env,
        PIPER_VOICE_PATH: voicesDir
      }
    }
  );

  const tempWav = outputWav.replace(/\.wav$/i, ".tmp.wav");

  await runCommand("ffmpeg", [
    "-y",
    "-f", "f32le",
    "-ar", "22050",
    "-ac", "1",
    "-i", rawFile,
    "-af", "atempo=0.8",
    "-c:a", "pcm_s16le",
    tempWav
  ]);

  fs.renameSync(tempWav, outputWav);
  fs.unlinkSync(rawFile);

  return true;
}

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

  console.log("DEBUG narrator input.voice =", JSON.stringify(input.voice));
  console.log("DEBUG narrator textOption =", JSON.stringify(input.textOption));
  console.log("DEBUG narrator sceneTexts =", JSON.stringify(input.sceneTexts));
  console.log("1) إنشاء مخطط الفيديو...");
  const plan = buildVideoPlan(input);

  console.log(`تم إنشاء ${plan.scenes.length} مشاهد`);

  const clips = [];
  const usedImageIds = [];

  for (const scene of plan.scenes) {
    console.log(`2) إنشاء صورة المشهد ${scene.sceneNumber}...`);

    const imagePath = await generateImage(
      scene.visualPrompt,
      scene.sceneNumber,
      { usedImageIds }
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
      scene.duration,
      scene.sceneNumber,
      scene.text || ""
    );

    let finalClipPath = clipPath;

    if (
      input.voice &&
      String(input.voice).trim() !== "بدون صوت" &&
      String(scene.text || "").trim()
    ) {
      console.log(`4) إنشاء صوت الراوي للمشهد ${scene.sceneNumber}...`);

      const narrationWav = path.join(
        clipsDir,
        `narration-${Date.now()}-${scene.sceneNumber}.wav`
      );

      await createNarrationAudio(scene.text, narrationWav, input.voice);

      const audioClipPath = path.join(
        clipsDir,
        `render-audio-${Date.now()}-${scene.sceneNumber}.mp4`
      );

      await runFFmpeg([
        "-y",
        "-i", clipPath,
        "-i", narrationWav,
        "-filter_complex",
        `[1:a]apad,atrim=duration=${scene.duration}[a]`,
        "-map", "0:v:0",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-t", String(scene.duration),
        audioClipPath
      ]);

      finalClipPath = audioClipPath;

      try {
        fs.unlinkSync(narrationWav);
      } catch {}

      console.log(`   تم إضافة صوت الراوي للمشهد ${scene.sceneNumber}`);
    }

    scene.clipPath = finalClipPath;
    clips.push(finalClipPath);

    console.log(`   المقطع: ${finalClipPath}`);

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
