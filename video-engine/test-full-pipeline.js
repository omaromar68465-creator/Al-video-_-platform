const fs = require("fs");
const path = require("path");
const { buildVideoPlan } = require("./ai-planner");
const { generateImage } = require("./image-generator");
const { createMotionClip } = require("./image-to-video");

async function main() {
  const input = {
    title: "رحلة قطرة ماء",
    description: "قصة تعليمية تشرح دورة الماء من البحر إلى السحب ثم نزول المطر وعودة الماء إلى الأرض",
    duration: 1,
    videoType: "تعليمي",
    voice: "بدون صوت",
    extraText: ""
  };

  console.log("1) إنشاء مخطط القصة...");
  const plan = buildVideoPlan(input);

  console.log(`تم إنشاء ${plan.scenes.length} مشاهد`);

  const results = [];

  for (const scene of plan.scenes) {
    console.log(`2) إنشاء صورة المشهد ${scene.sceneNumber}...`);

    const imagePath = await generateImage(
      scene.visualPrompt,
      scene.sceneNumber
    );

    console.log(`   الصورة: ${imagePath}`);

    const clipPath = path.join(
      __dirname,
      "clips",
      `pipeline-scene-${scene.sceneNumber}.mp4`
    );

    console.log(`3) تحريك المشهد ${scene.sceneNumber}...`);

    await createMotionClip(
      imagePath,
      clipPath,
      scene.duration
    );

    console.log(`   المقطع: ${clipPath}`);

    results.push({
      sceneNumber: scene.sceneNumber,
      imagePath,
      clipPath
    });
  }

  const output = {
    title: input.title,
    description: input.description,
    scenes: results,
    createdAt: new Date().toISOString()
  };

  const outputFile = path.join(
    __dirname,
    "output",
    "full-pipeline-test.json"
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(output, null, 2)
  );

  console.log("");
  console.log("================================");
  console.log("نجح الاختبار الكامل");
  console.log("================================");
  console.log(outputFile);
}

main().catch(error => {
  console.error("");
  console.error("فشل الاختبار:");
  console.error(error.message);
  process.exit(1);
});
