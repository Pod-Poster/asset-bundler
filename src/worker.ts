import { downloadImage, transformImage, generateManifest, type ImageOutput, type Manifest } from "./image.js";
import { createR2Client, uploadToR2, getR2ConfigFromEnv, type UploadFile } from "./r2.js";
import { generateImage, getImagenConfigFromEnv } from "./imagen.js";

// IMAGE_PROCESS job interface
interface ImageProcessJob {
  job_id: string;
  design_version_id: string;
  source_download_url: string;
  upload_prefix: string;
  callback_complete_url: string;
}

// AI_GENERATE job interface
interface AIGenerateJob {
  job_id: string;
  type: 'AI_GENERATE';
  generation_request_id: string;
  generation_variant_id: string;
  variant_id: string;
  variant_label: string;
  prompt: string;
  aspect_ratio: string;
  model: string;
  upload_key: string;
  auto_accept: boolean;
  finalize_data?: {
    design_name: string;
    design_description: string;
    design_tags: string[];
    channel_account_ids: string[];
    product_types?: string[];
  };
  callback_complete_url: string;
}

interface CallbackPayload {
  success: boolean;
  result?: {
    bundle_prefix?: string;
    manifest?: Manifest;
    image_key?: string;
    bytes?: number;
  };
  error?: string;
}

function isImageProcessJobArray(data: unknown): data is ImageProcessJob[] {
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

function isAIGenerateJobArray(data: unknown): data is AIGenerateJob[] {
  return Array.isArray(data) && data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "job_id" in item &&
      "type" in item &&
      (item as AIGenerateJob).type === 'AI_GENERATE' &&
      "prompt" in item &&
      "upload_key" in item &&
      "callback_complete_url" in item
  );
}

function isImageProcessJobResponse(x: unknown): x is { data: ImageProcessJob[] } {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return isImageProcessJobArray(obj.data);
}

function isAIGenerateJobResponse(x: unknown): x is { data: AIGenerateJob[] } {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return isAIGenerateJobArray(obj.data);
}

function assertSignedDownloadUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid source_download_url: ${url}`);
  }

  if (!parsed.pathname.endsWith("/assets/download")) {
    throw new Error(`Unsigned source_download_url (unexpected path): ${url}`);
  }

  const key = parsed.searchParams.get("key");
  const exp = parsed.searchParams.get("exp");
  const sig = parsed.searchParams.get("sig");

  if (!key || !exp || !sig) {
    throw new Error(`Unsigned source_download_url (missing sig/exp/key): ${url}`);
  }
}

async function fetchImageProcessJobs(baseUrl: string, workerToken: string): Promise<ImageProcessJob[]> {
  const url = `${baseUrl}/jobs/next?type=IMAGE_PROCESS&limit=2`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-WORKER-TOKEN": workerToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const text = await response.text();
      if (text) {
        details = ` - ${text.slice(0, 200)}`;
      }
    } catch {
      // ignore body parsing failures
    }
    throw new Error(`Failed to fetch IMAGE_PROCESS jobs: ${response.status} ${response.statusText}${details}`);
  }

  const data: unknown = await response.json();

  if (isImageProcessJobResponse(data)) {
    return data.data;
  }

  // Empty array is valid
  const dataObj = data as Record<string, unknown>;
  if (dataObj && typeof dataObj === 'object' && Array.isArray(dataObj.data) && (dataObj.data as unknown[]).length === 0) {
    return [];
  }

  throw new Error("Invalid IMAGE_PROCESS job response: expected { data: Job[] }");
}

async function fetchAIGenerateJobs(baseUrl: string, workerToken: string): Promise<AIGenerateJob[]> {
  const url = `${baseUrl}/jobs/next?type=AI_GENERATE&limit=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-WORKER-TOKEN": workerToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const text = await response.text();
      if (text) {
        details = ` - ${text.slice(0, 200)}`;
      }
    } catch {
      // ignore body parsing failures
    }
    throw new Error(`Failed to fetch AI_GENERATE jobs: ${response.status} ${response.statusText}${details}`);
  }

  const data: unknown = await response.json();

  if (isAIGenerateJobResponse(data)) {
    return data.data;
  }

  // Empty array is valid
  const dataObj = data as Record<string, unknown>;
  if (dataObj && typeof dataObj === 'object' && Array.isArray(dataObj.data) && (dataObj.data as unknown[]).length === 0) {
    return [];
  }

  throw new Error("Invalid AI_GENERATE job response: expected { data: Job[] }");
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

async function processImageProcessJob(job: ImageProcessJob, workerToken: string): Promise<void> {
  console.log(`Processing IMAGE_PROCESS job: ${job.job_id}`);

  // Download source image
  console.log("Downloading source image...");
  assertSignedDownloadUrl(job.source_download_url);
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

  console.log(`IMAGE_PROCESS job ${job.job_id} completed successfully`);
}

async function processAIGenerateJob(job: AIGenerateJob, workerToken: string): Promise<void> {
  console.log(`Processing AI_GENERATE job: ${job.job_id}`);
  console.log(`  Variant: ${job.variant_label} (${job.variant_id})`);
  console.log(`  Model: ${job.model}`);
  console.log(`  Aspect ratio: ${job.aspect_ratio}`);

  // Get Imagen config
  const imagenConfig = getImagenConfigFromEnv();
  // Use model from job if specified, otherwise use env default
  if (job.model) {
    imagenConfig.model = job.model;
  }

  // Generate image using Imagen API
  console.log("Calling Google Imagen API...");
  const result = await generateImage(imagenConfig, job.prompt, job.aspect_ratio);

  // Upload to R2
  console.log(`Uploading generated image to R2: ${job.upload_key}`);
  const r2Config = getR2ConfigFromEnv();
  const r2Client = createR2Client(r2Config);

  const uploadFiles: UploadFile[] = [{
    key: job.upload_key,
    buffer: result.imageData,
    contentType: result.mimeType,
  }];

  // upload_key is the full path, so we use empty prefix
  await uploadToR2(r2Client, r2Config.bucket, '', uploadFiles);

  // Send callback
  console.log("Sending completion callback...");
  await sendCallback(job.callback_complete_url, workerToken, {
    success: true,
    result: {
      image_key: job.upload_key,
      bytes: result.imageData.length,
    },
  });

  console.log(`AI_GENERATE job ${job.job_id} completed successfully`);
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

  let totalJobs = 0;

  // Process IMAGE_PROCESS jobs
  console.log("Fetching IMAGE_PROCESS jobs...");
  try {
    const imageJobs = await fetchImageProcessJobs(coreBaseUrl, workerToken);

    if (imageJobs.length > 0) {
      console.log(`Found ${imageJobs.length} IMAGE_PROCESS job(s) to process`);
      totalJobs += imageJobs.length;

      for (const job of imageJobs) {
        try {
          await processImageProcessJob(job, workerToken);
        } catch (error) {
          console.error(`Failed to process IMAGE_PROCESS job ${job.job_id}:`, error);

          try {
            await sendCallback(job.callback_complete_url, workerToken, {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          } catch (callbackError) {
            console.error(`Failed to send failure callback for job ${job.job_id}:`, callbackError);
          }
        }
      }
    } else {
      console.log("No IMAGE_PROCESS jobs to process");
    }
  } catch (error) {
    console.error("Failed to fetch IMAGE_PROCESS jobs:", error);
  }

  // Process AI_GENERATE jobs (only if GOOGLE_AI_API_KEY is set)
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log("\nFetching AI_GENERATE jobs...");
    try {
      const aiJobs = await fetchAIGenerateJobs(coreBaseUrl, workerToken);

      if (aiJobs.length > 0) {
        console.log(`Found ${aiJobs.length} AI_GENERATE job(s) to process`);
        totalJobs += aiJobs.length;

        for (const job of aiJobs) {
          try {
            await processAIGenerateJob(job, workerToken);
          } catch (error) {
            console.error(`Failed to process AI_GENERATE job ${job.job_id}:`, error);

            try {
              await sendCallback(job.callback_complete_url, workerToken, {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            } catch (callbackError) {
              console.error(`Failed to send failure callback for job ${job.job_id}:`, callbackError);
            }
          }
        }
      } else {
        console.log("No AI_GENERATE jobs to process");
      }
    } catch (error) {
      console.error("Failed to fetch AI_GENERATE jobs:", error);
    }
  } else {
    console.log("\nSkipping AI_GENERATE jobs (GOOGLE_AI_API_KEY not set)");
  }

  if (totalJobs === 0) {
    console.log("\nNo jobs to process");
  }

  console.log("\nWorker run completed");
}

main().catch((error) => {
  console.error("Worker failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
