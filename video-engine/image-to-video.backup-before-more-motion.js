const { spawn } = require("child_process");

function createMotionClip(inputImage, outputVideo, duration = 8, sceneNumber = 1) {
  return new Promise((resolve, reject) => {
    const motionTypes = [
      "zoom_in",
      "zoom_out",
      "pan_right",
      "pan_left",
      "pan_down",
      "pan_up"
    ];

    const motion = motionTypes[(Number(sceneNumber) - 1) % motionTypes.length];

    let zoompan;

    switch (motion) {
      case "zoom_out":
        zoompan =
          "zoompan=z='max(zoom-0.0008,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24";
        break;

      case "pan_right":
        zoompan =
          "zoompan=z='1.06':x='(iw-iw/zoom)*on/(duration*24-1)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24";
        break;

      case "pan_left":
        zoompan =
          "zoompan=z='1.06':x='(iw-iw/zoom)*(1-on/(duration*24-1))':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24";
        break;

      case "pan_down":
        zoompan =
          "zoompan=z='1.06':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/(duration*24-1)':d=1:s=1280x720:fps=24";
        break;

      case "pan_up":
        zoompan =
          "zoompan=z='1.06':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/(duration*24-1))':d=1:s=1280x720:fps=24";
        break;

      default:
        zoompan =
          "zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24";
        break;
    }

    const args = [
      "-y",
      "-loop", "1",
      "-i", inputImage,
      "-t", String(duration),
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease," +
      "pad=1280:720:(ow-iw)/2:(oh-ih)/2," +
      zoompan,
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
