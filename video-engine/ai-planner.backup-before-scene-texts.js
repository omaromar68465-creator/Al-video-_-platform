const { createScenePlan } = require("./scene-planner");

function buildVideoPlan(input) {
  const duration = Math.max(1, Math.min(10, Number(input.duration) || 1));
  const totalSeconds = duration * 60;
  const sceneSeconds = 8;
  const sceneCount = Math.ceil(totalSeconds / sceneSeconds);

  const description = String(input.description || "").trim();
  const videoType = String(input.videoType || "تعليمي").trim();
  const textOption = String(input.textOption || "بدون نص").trim();
  const extraText = String(input.extraText || "").trim();
  const title = String(input.title || "فيديو جديد").trim();

  const titleText =
    title && title !== "فيديو جديد"
      ? title
      : description.split(/[.؟!\n]/)[0].trim().slice(0, 100);

  function getSceneText(sceneIndex, stage, visualPrompt) {
    if (textOption === "بدون نص") {
      return "";
    }

    if (textOption === "عنوان فقط") {
      return titleText;
    }

    if (textOption === "نص مخصص") {
      return extraText;
    }

    if (textOption === "نص كامل") {
      if (isWaterCycle) {
        const stageTexts = [
          "تبدأ دورة الماء من البحار والمحيطات، حيث توجد كميات كبيرة من الماء.",
          "تسخّن الشمس سطح الماء، فيتحول جزء منه إلى بخار ماء ويصعد إلى الأعلى.",
          "يصعد بخار الماء إلى طبقات الجو العليا، ثم يتجمع ليكوّن السحب.",
          "عندما يبرد بخار الماء، يتكاثف على شكل قطرات صغيرة داخل السحب.",
          "عندما تكبر قطرات الماء وتزداد كثافتها، تهطل على الأرض على شكل أمطار.",
          "تتجمع مياه الأمطار على سطح الأرض وتتدفق عبر الجداول والأنهار.",
          "تعود المياه عبر الأنهار والجريان السطحي إلى البحار والمحيطات.",
          "تستمر دورة الماء بشكل متكرر بين البحر والسماء والأرض."
        ];

        return stageTexts[sceneIndex % stageTexts.length];
      }

      return `في هذا المشهد نتعرف على مرحلة جديدة من موضوع ${description}.`;
    }

    return "";
  }

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

    const sceneText = getSceneText(i, stage, visualPrompt);

    scenes.push({
      sceneNumber: i + 1,
      duration: sceneDuration,
      purpose: isWaterCycle
        ? `المرحلة ${i + 1} من دورة الماء`
        : `المشهد ${i + 1} من فيديو عن: ${description}`,
      visualPrompt,
      text: sceneText
    });
  }

  return {
    title,
    description,
    videoType,
    duration,
    textOption,
    extraText,
    scenes
  };
}

module.exports = { buildVideoPlan };
