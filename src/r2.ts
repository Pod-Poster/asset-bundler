import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export interface UploadFile {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export async function uploadToR2(
  client: S3Client,
  bucket: string,
  prefix: string,
  files: UploadFile[]
): Promise<void> {
  // Normalize prefix: trim trailing slashes to avoid double slashes in keys
  const normalizedPrefix = prefix.replace(/\/+$/, "");

  for (const file of files) {
    const fullKey = normalizedPrefix ? `${normalizedPrefix}/${file.key}` : file.key;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: file.buffer,
      ContentType: file.contentType,
    });

    await client.send(command);
    console.log(`Uploaded: ${fullKey}`);
  }
}

export function getR2ConfigFromEnv(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Missing required R2 environment variables");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}
