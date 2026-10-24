const fs = require("fs");
const path = require("path");
const { buildVideoPlan } = require("./ai-planner");

const plan = buildVideoPlan({
  title: "اختبار منصة الفيديو",
  description: "فيديو تعليمي عن دورة الماء في الطبيعة",
  videoType: "تعليمي",
  duration: 1,
  voice: "بدون صوت",
  textOption: "عنوان فقط"
});

const file = path.join(__dirname, "scenes", "test-plan.json");

fs.writeFileSync(
  file,
  JSON.stringify(plan, null, 2),
  "utf8"
);

console.log("تم إنشاء مخطط الفيديو بنجاح");
console.log(`عدد المشاهد: ${plan.sceneCount}`);
console.log(`المدة: ${plan.totalSeconds} ثانية`);
console.log(`الملف: ${file}`);
