import { downloadImage, transformImage, generateManifest, type ImageOutput, type Manifest } from "./image.js";
import { createR2Client, uploadToR2, getR2ConfigFromEnv, type UploadFile } from "./r2.js";

interface Job {
  job_id: string;
  design_version_id: string;
  source_download_url: string;
  upload_prefix: string;
  callback_complete_url: string;
}

interface CallbackPayload {
  success: boolean;
  result?: {
    bundle_prefix: string;
    manifest: Manifest;
  };
  error?: string;
}

function isJobArray(data: unknown): data is Job[] {
  return Array.isArray(data) && data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "job_id" in item &&
      "design_version_id" in item &&
      "source_download_url" in item &&
      "upload_prefix" in item &&
      "callback_complete_url" in item
  );
}

function isWrappedJobResponse(x: unknown): x is { jobs?: Job[]; data?: Job[] } {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return isJobArray(obj.jobs) || isJobArray(obj.data);
}

async function fetchJobs(baseUrl: string, workerToken: string): Promise<Job[]> {
  const url = `${baseUrl}/jobs/next?type=IMAGE_PROCESS&limit=2`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-WORKER-TOKEN": workerToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  // Support both top-level array and wrapped { jobs: [] } response shapes
  if (isJobArray(data)) {
    return data;
  }

  if (isWrappedJobResponse(data)) {
    return (data.jobs ?? data.data) as Job[];
  }

  throw new Error("Invalid job response: expected an array of jobs or { jobs: Job[] }");
}

async function sendCallback(
  callbackUrl: string,
  workerToken: string,
  payload: CallbackPayload
): Promise<void> {
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "X-WORKER-TOKEN": workerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
  }
}

async function processJob(job: Job, workerToken: string): Promise<void> {
  console.log(`Processing job: ${job.job_id}`);

  // Download source image
  console.log("Downloading source image...");
  const sourceBuffer = await downloadImage(job.source_download_url);

  // Transform image
  console.log("Transforming image...");
  const { outputs } = await transformImage(sourceBuffer);

  // Generate manifest
  const manifest = generateManifest(outputs);

  // Prepare files for upload
  const uploadFiles: UploadFile[] = outputs.map((output: ImageOutput) => ({
    key: output.name,
    buffer: output.buffer,
    contentType: "image/png",
  }));

  // Add manifest to upload files
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
  uploadFiles.push({
    key: "manifest.json",
    buffer: manifestBuffer,
    contentType: "application/json",
  });

  // Upload to R2
  console.log("Uploading to R2...");
  const r2Config = getR2ConfigFromEnv();
  const r2Client = createR2Client(r2Config);
  await uploadToR2(r2Client, r2Config.bucket, job.upload_prefix, uploadFiles);

  // Send callback
  console.log("Sending completion callback...");
  await sendCallback(job.callback_complete_url, workerToken, {
    success: true,
    result: {
      bundle_prefix: job.upload_prefix,
      manifest: manifest,
    },
  });

  console.log(`Job ${job.job_id} completed successfully`);
}

async function main(): Promise<void> {
  const coreBaseUrl = process.env.CORE_BASE_URL;
  const workerToken = process.env.WORKER_TOKEN;

  if (!coreBaseUrl) {
    throw new Error("CORE_BASE_URL environment variable is required");
  }

  if (!workerToken) {
    throw new Error("WORKER_TOKEN environment variable is required");
  }

  console.log("Fetching jobs...");
  const jobs = await fetchJobs(coreBaseUrl, workerToken);

  if (jobs.length === 0) {
    console.log("No jobs to process");
    return;
  }

  console.log(`Found ${jobs.length} job(s) to process`);

  for (const job of jobs) {
    try {
      await processJob(job, workerToken);

      // ✅ tell core success
      await sendCallback(job.callback_complete_url, workerToken, {
        success: true,
        result: {
          bundle_prefix: job.upload_prefix,
        },
      });

    } catch (error) {
      console.error(`Failed to process job ${job.job_id}:`, error);

      // ❌ tell core failure
      await sendCallback(job.callback_complete_url, workerToken, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log("Worker run completed");
}

main().catch((error) => {
  console.error("Worker failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
