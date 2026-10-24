const fs = require("fs");
const path = require("path");

const jobsDir = path.join(__dirname, "..", "data", "jobs");

function ensureJobsDir() {
  fs.mkdirSync(jobsDir, { recursive: true });
}

function createJob(data) {
  ensureJobsDir();

  const id =
    Date.now().toString() +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const job = {
    id,
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data
  };

  fs.writeFileSync(
    path.join(jobsDir, `${id}.json`),
    JSON.stringify(job, null, 2)
  );

  return job;
}

function updateJob(id, updates) {
  ensureJobsDir();

  const file = path.join(jobsDir, `${id}.json`);

  if (!fs.existsSync(file)) {
    throw new Error("Job not found");
  }

  const job = JSON.parse(fs.readFileSync(file, "utf8"));

  Object.assign(job, updates);
  job.updatedAt = new Date().toISOString();

  fs.writeFileSync(
    file,
    JSON.stringify(job, null, 2)
  );

  return job;
}

function getJob(id) {
  const file = path.join(jobsDir, `${id}.json`);

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = {
  createJob,
  updateJob,
  getJob
};
