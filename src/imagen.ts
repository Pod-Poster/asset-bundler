// Google Imagen API integration for AI image generation

export interface ImagenConfig {
  apiKey: string;
  model: string;
}

export interface GenerateImageResult {
  imageData: Buffer;
  mimeType: string;
}

interface ImagenResponse {
  generatedImages?: Array<{
    image?: {
      imageBytes?: string;
    };
  }>;
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Generate an image using Google's Imagen API (Google AI Studio)
 */
export async function generateImage(
  config: ImagenConfig,
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<GenerateImageResult> {
  // Google AI Studio endpoint for Imagen
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateImages?key=${config.apiKey}`;

  const requestBody = {
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: aspectRatio,
      outputMimeType: 'image/png',
    },
  };

  console.log(`Calling Imagen API with model: ${config.model}`);
  console.log(`Prompt length: ${prompt.length} characters`);
  console.log(`Aspect ratio: ${aspectRatio}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorBody = await response.text();
      errorDetails = errorBody.slice(0, 500);
    } catch {
      // ignore
    }
    throw new Error(`Imagen API error: ${response.status} ${response.statusText} - ${errorDetails}`);
  }

  const data = (await response.json()) as ImagenResponse;

  if (data.error) {
    throw new Error(`Imagen API error: ${data.error.message} (${data.error.status})`);
  }

  // Handle Google AI Studio response format
  if (data.generatedImages && data.generatedImages.length > 0) {
    const generated = data.generatedImages[0];
    if (generated.image?.imageBytes) {
      const imageBuffer = Buffer.from(generated.image.imageBytes, 'base64');
      console.log(`Generated image: ${imageBuffer.length} bytes`);
      return {
        imageData: imageBuffer,
        mimeType: 'image/png',
      };
    }
  }

  // Fallback: Handle Vertex AI response format (predictions)
  if (data.predictions && data.predictions.length > 0) {
    const prediction = data.predictions[0];
    if (prediction.bytesBase64Encoded) {
      const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const mimeType = prediction.mimeType || 'image/png';
      console.log(`Generated image: ${imageBuffer.length} bytes, ${mimeType}`);
      return {
        imageData: imageBuffer,
        mimeType,
      };
    }
  }

  throw new Error('Imagen API returned no image data');
}

/**
 * Get Imagen config from environment variables
 */
export function getImagenConfigFromEnv(): ImagenConfig {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const model = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required for AI_GENERATE jobs');
  }

  return { apiKey, model };
}
