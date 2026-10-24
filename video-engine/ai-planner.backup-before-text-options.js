const { createScenePlan } = require("./scene-planner");

function buildVideoPlan(input) {
  const duration = Math.max(1, Math.min(10, Number(input.duration) || 1));
  const totalSeconds = duration * 60;
  const sceneSeconds = 8;
  const sceneCount = Math.ceil(totalSeconds / sceneSeconds);

  const description = String(input.description || "").trim();
  const videoType = String(input.videoType || "تعليمي").trim();

  const waterCycleStages = [
    {
      keywords: ["البحر", "المحيط", "الماء"],
      visualPrompt: "بحر واسع تحت الشمس، ماء البحر واضح، بداية دورة الماء، مشهد تعليمي واقعي"
    },
    {
      keywords: ["التبخر", "بخار", "الشمس"],
      visualPrompt: "ماء البحر يتبخر بفعل حرارة الشمس، بخار ماء يصعد من سطح البحر، مشهد تعليمي واقعي"
    },
    {
      keywords: ["السحب", "الغيوم"],
      visualPrompt: "بخار الماء يصعد إلى السماء ويتجمع لتكوين سحب بيضاء، مشهد تعليمي واقعي"
    },
    {
      keywords: ["التكاثف", "سحابة"],
      visualPrompt: "قطرات ماء صغيرة تتجمع داخل السحب وتزداد كثافة السحابة، شرح بصري لدورة الماء"
    },
    {
      keywords: ["المطر", "الهطول"],
      visualPrompt: "سحب داكنة تمطر فوق الأرض، قطرات المطر تهبط بوضوح، مشهد تعليمي واقعي"
    },
    {
      keywords: ["الأرض", "الأنهار", "التجمع"],
      visualPrompt: "مياه المطر تتجمع على الأرض وتتدفق نحو الجداول والأنهار، مشهد تعليمي واقعي"
    },
    {
      keywords: ["العودة", "البحر", "المحيط"],
      visualPrompt: "نهر يحمل المياه عائداً إلى البحر، منظر يوضح استمرار دورة الماء، مشهد تعليمي واقعي"
    },
    {
      keywords: ["الدورة", "الماء"],
      visualPrompt: "مشهد شامل يوضح دورة الماء من البحر إلى السحب ثم المطر والعودة إلى البحر، رسم تعليمي بصري"
    }
  ];

  const isWaterCycle =
    /دورة الماء|الماء.*البحر.*السحب|البحر.*السحب.*المطر/i.test(description);

  const scenes = [];

  for (let i = 0; i < sceneCount; i++) {
    const stage = waterCycleStages[i % waterCycleStages.length];

    const remaining = totalSeconds - i * sceneSeconds;
    const sceneDuration = Math.min(sceneSeconds, remaining);

    let visualPrompt;

    if (isWaterCycle) {
      visualPrompt = stage.visualPrompt;
    } else {
      visualPrompt =
        `المشهد ${i + 1} من فيديو ${videoType}: ${description}. ` +
        `أنشئ صورة مرتبطة مباشرة بالمرحلة الحالية من القصة مع الحفاظ على استمرارية العناصر البصرية.`;
    }

    scenes.push({
      sceneNumber: i + 1,
      duration: sceneDuration,
      purpose: isWaterCycle
        ? `المرحلة ${i + 1} من دورة الماء`
        : `المشهد ${i + 1} من فيديو عن: ${description}`,
      visualPrompt
    });
  }

  return {
    title: input.title || "فيديو جديد",
    description,
    videoType,
    duration,
    scenes
  };
}

module.exports = { buildVideoPlan };
