const { createScenePlan } = require("./scene-planner");

function buildVideoPlan(input) {
  const plan = createScenePlan(input);

  plan.scenes.forEach((scene) => {
    scene.purpose =
      `المشهد ${scene.sceneNumber} من فيديو عن: ${input.description}`;

    scene.visualPrompt =
      `مشهد ${scene.sceneNumber} متناسق بصرياً مع فيديو ${input.videoType} عن ${input.description}`;

    scene.continuity.recurringElements = [
      "نفس الأسلوب البصري",
      "نفس الألوان العامة",
      "استمرارية العناصر بين المشاهد"
    ];

    scene.motion.type =
      ["slow_zoom", "pan_left", "pan_right", "slow_zoom_out"]
      [(scene.sceneNumber - 1) % 4];
  });

  return plan;
}

module.exports = { buildVideoPlan };
