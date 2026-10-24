const { spawn } = require("child_process");

function createMotionClip(inputImage, outputVideo, duration = 8) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-loop", "1",
      "-i", inputImage,
      "-t", String(duration),
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease," +
      "pad=1280:720:(ow-iw)/2:(oh-ih)/2," +
      "zoompan=z='min(zoom+0.0008,1.08)':d=1:s=1280x720:fps=24",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      outputVideo
    ];

    const process = spawn("ffmpeg", args);

    let errorOutput = "";

    process.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    process.on("close", code => {
      if (code === 0) {
        resolve(outputVideo);
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
}

module.exports = { createMotionClip };
