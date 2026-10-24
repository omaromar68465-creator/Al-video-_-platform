const { spawn } = require("child_process");
const fs = require("fs");

function createMotionClip(inputImage, outputVideo, duration = 8, sceneNumber = 1, overlayText = "") {
  return new Promise((resolve, reject) => {
    const motionTypes = [
      "zoom_in_strong",
      "zoom_out_strong",
      "pan_right_strong",
      "pan_left_strong",
      "pan_down_strong",
      "pan_up_strong",
      "diagonal_right_down",
      "diagonal_left_up",
      "diagonal_left_down",
      "diagonal_right_up"
    ];

    const motion = motionTypes[(Number(sceneNumber) - 1) % motionTypes.length];
    const frames = Math.max(Number(duration) * 24 - 1, 1);

    let zoompan;

    switch (motion) {
      case "zoom_in_strong":
        zoompan =
          `zoompan=z='min(1.0+0.006*on,1.30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24`;
        break;

      case "zoom_out_strong":
        zoompan =
          `zoompan=z='1.16-0.16*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24`;
        break;

      case "pan_right_strong":
        zoompan =
          `zoompan=z='1.14':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24`;
        break;

      case "pan_left_strong":
        zoompan =
          `zoompan=z='1.14':x='(iw-iw/zoom)*(1-on/${frames})':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24`;
        break;

      case "pan_down_strong":
        zoompan =
          `zoompan=z='1.14':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/${frames}':d=1:s=1280x720:fps=24`;
        break;

      case "pan_up_strong":
        zoompan =
          `zoompan=z='1.14':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/${frames})':d=1:s=1280x720:fps=24`;
        break;

      case "diagonal_right_down":
        zoompan =
          `zoompan=z='1.15':x='(iw-iw/zoom)*on/${frames}':y='(ih-ih/zoom)*on/${frames}':d=1:s=1280x720:fps=24`;
        break;

      case "diagonal_left_up":
        zoompan =
          `zoompan=z='1.15':x='(iw-iw/zoom)*(1-on/${frames})':y='(ih-ih/zoom)*(1-on/${frames})':d=1:s=1280x720:fps=24`;
        break;

      case "diagonal_left_down":
        zoompan =
          `zoompan=z='1.15':x='(iw-iw/zoom)*(1-on/${frames})':y='(ih-ih/zoom)*on/${frames}':d=1:s=1280x720:fps=24`;
        break;

      case "diagonal_right_up":
        zoompan =
          `zoompan=z='1.15':x='(iw-iw/zoom)*on/${frames}':y='(ih-ih/zoom)*(1-on/${frames})':d=1:s=1280x720:fps=24`;
        break;

      default:
        zoompan =
          `zoompan=z='min(1.0+0.30*on/(${frames}*0.1),1.30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24`;
        break;
    }

    const textFile = outputVideo + ".txt";
    const hasOverlayText = String(overlayText || "").trim().length > 0;
    if (hasOverlayText) fs.writeFileSync(textFile, String(overlayText).trim(), "utf8");

    const textFilter = hasOverlayText ? ",drawtext=fontfile=/system/fonts/NotoNaskhArabic-Regular.ttf:textfile='" + textFile + "':text_shaping=1:fontcolor=white:fontsize=42:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-text_h-45" : "";

    const args = [
      "-y",
      "-loop",
      "1",
      "-i",
      inputImage,
      "-t",
      String(duration),
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease," +
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2," +
        zoompan + textFilter,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputVideo
    ];

    const process = spawn("ffmpeg", args);
    let errorOutput = "";

    process.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    process.on("close", code => {
      if (hasOverlayText) {
        try { fs.unlinkSync(textFile); } catch {}
      }
      if (code === 0) {
        resolve(outputVideo);
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
}
module.exports = { createMotionClip };
