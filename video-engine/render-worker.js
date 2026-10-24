const { getJob, updateJob } = require("./queue");
const { renderVideo } = require("./render-video");

async function processJob(jobId) {
  const job = getJob(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  updateJob(jobId, {
    status: "processing",
    progress: 0
  });

  try {
    const result = await renderVideo(job.input, {
      onProgress: (current, total) => {
        const progress = Math.round((current / total) * 90);

        updateJob(jobId, {
          status: "processing",
          progress
        });
      }
    });

    updateJob(jobId, {
      status: "completed",
      progress: 100,
      videoPath: result.outputFile,
      planPath: result.planFile,
      completedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      progress: 0,
      error: error.message
    });

    throw error;
  }
}

module.exports = {
  processJob
};
