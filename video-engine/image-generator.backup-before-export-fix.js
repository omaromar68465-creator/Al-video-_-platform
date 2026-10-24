const fs = require("fs");
const path = require("path");
const https = require("https");

const imagesDir = path.join(__dirname, "images");

function ensureImagesDir() {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function downloadFile(url, outputFile) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputFile);

    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(outputFile, () => {});
        return downloadFile(response.headers.location, outputFile)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(outputFile, () => {});
        return reject(new Error(`فشل تحميل الصورة: HTTP ${response.statusCode}`));
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", error => {
      file.close();
      fs.unlink(outputFile, () => {});
      reject(error);
    });
  });
}

function cleanSearchQuery(prompt) {
  const text = String(prompt || "").toLowerCase();

  const groups = [
    { keys: ["بحر", "محيط"], query: "ocean sea water landscape" },
    { keys: ["تبخر", "بخار", "حرارة الشمس"], query: "ocean sunlight steam evaporation" },
    { keys: ["سحب", "غيوم", "سماء"], query: "clouds sky water vapor" },
    { keys: ["تكاثف", "قطرات"], query: "water droplets clouds condensation" },
    { keys: ["مطر", "هطول"], query: "rain clouds rainfall landscape" },
    { keys: ["أنهار", "جداول", "تتدفق"], query: "river flowing water landscape" },
    { keys: ["عودة", "البحر", "المحيط"], query: "river ocean water landscape" },
    { keys: ["دورة الماء"], query: "water cycle ocean clouds rain" }
  ];

  for (const group of groups) {
    if (group.keys.some(key => text.includes(key))) {
      return group.query;
    }
  }

  const words = String(prompt || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(word => word.length >= 3)
    .slice(0, 5);

  return words.join(" ") || "nature landscape";
}

function generateImage(prompt, sceneNumber, options = {}) {
  const mode = options.mode || "pexels";

  if (mode === "pexels") {
    return generatePexelsImage(prompt, sceneNumber);
  }

  if (mode === "placeholder") {
    return generatePlaceholderImage(prompt, sceneNumber);
  }

  return Promise.reject(
    new Error(`وضع مولد الصور غير معروف: ${mode}`)
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

    const { spawn } = require("child_process");

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
  generatePexelsImage,
  generatePlaceholderImage
};
