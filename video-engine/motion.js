const motions = [
  "slow_zoom",
  "slow_zoom_out",
  "pan_left",
  "pan_right",
  "pan_up",
  "pan_down"
];

function getMotion(sceneNumber) {
  return motions[(sceneNumber - 1) % motions.length];
}

module.exports = { motions, getMotion };
