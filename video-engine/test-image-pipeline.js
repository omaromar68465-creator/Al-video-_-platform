const fs = require("fs");
const { generatePlaceholderImage } = require("./image-generator");

async function main() {
  const plan = JSON.parse(
    fs.readFileSync("video-engine/scenes/test-plan.json", "utf8")
  );

  console.log(`عدد المشاهد: ${plan.scenes.length}`);

  for (const scene of plan.scenes) {
    console.log(`إنشاء صورة للمشهد ${scene.sceneNumber}...`);

    const output = await generatePlaceholderImage(
      scene.visualPrompt,
      scene.sceneNumber
    );

    console.log(`تم: ${output}`);
  }

  console.log("اكتمل خط الصور لجميع المشاهد");
}

main().catch(error => {
  console.error("حدث خطأ:");
  console.error(error.message);
  process.exit(1);
});
