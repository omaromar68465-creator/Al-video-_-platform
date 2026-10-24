const config = require("./config.json");

function createScenePlan({
  title = "",
  description = "",
  videoType = "تلقائي",
  duration = 1,
  voice = "بدون صوت",
  textOption = "بدون نص"
}) {
  const totalSeconds = Math.max(60, Number(duration) * 60);

  const sceneCount = Math.min(
    config.maxScenes,
    Math.max(1, Math.ceil(totalSeconds / config.sceneSeconds))
  );

  const scenes = [];

  for (let i = 0; i < sceneCount; i++) {
    scenes.push({
      sceneNumber: i + 1,
      duration: config.sceneSeconds,
      purpose: "",
      visualPrompt: "",
      continuity: {
        style: videoType,
        recurringElements: [],
        previousScene: i === 0 ? null : i
      },
      motion: {
        type: "slow_zoom",
        intensity: "low"
      },
      narration: "",
      text: "",
      imagePath: "",
      clipPath: "",
      audioPath: ""
    });
  }

  return {
    title,
    description,
    videoType,
    duration,
    voice,
    textOption,
    totalSeconds,
    sceneCount,
    scenes,
    createdAt: new Date().toISOString()
  };
}

module.exports = { createScenePlan };
