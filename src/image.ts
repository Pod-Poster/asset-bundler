import sharp from "sharp";

export interface ImageOutput {
  name: string;
  width: number;
  height: number;
  buffer: Buffer;
  size: number;
}

export interface TransformResult {
  outputs: ImageOutput[];
}

interface TransformSpec {
  name: string;
  width: number;
  height: number;
}

const TRANSFORM_SPECS: TransformSpec[] = [
  { name: "print/shirt.png", width: 4500, height: 5400 },
  { name: "print/sticker.png", width: 2800, height: 2800 },
  { name: "print/hat.png", width: 2400, height: 2400 },
];

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function transformImage(sourceBuffer: Buffer): Promise<TransformResult> {
  // First, trim transparency from the source image
  const trimmed = await sharp(sourceBuffer)
    .trim()
    .png()
    .toBuffer();

  const outputs: ImageOutput[] = [];

  for (const spec of TRANSFORM_SPECS) {
    const buffer = await sharp(trimmed)
      .resize(spec.width, spec.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    outputs.push({
      name: spec.name,
      width: spec.width,
      height: spec.height,
      buffer,
      size: buffer.length,
    });
  }

  return { outputs };
}

export interface ManifestEntry {
  file: string;
  width: number;
  height: number;
  size: number;
}

export interface Manifest {
  generated_at: string;
  files: ManifestEntry[];
}

export function generateManifest(outputs: ImageOutput[]): Manifest {
  return {
    generated_at: new Date().toISOString(),
    files: outputs.map((output) => ({
      file: output.name,
      width: output.width,
      height: output.height,
      size: output.size,
    })),
  };
}
