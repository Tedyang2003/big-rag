import * as fs from "fs";
import JSZip from "jszip";
import { type LMStudioClient } from "@lmstudio/sdk";

const IMAGE_EXTENSION_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
};

export interface EmbeddedImage {
  /** Path inside the zip archive, e.g. "ppt/media/image1.png" or "word/media/image1.jpeg" */
  archivePath: string;
  /** Lowercased extension without the dot, e.g. "png" */
  extension: string;
  mimeType: string;
  data: Buffer;
  /** Best-effort human-readable anchor for where the image appears, e.g. "Slide 3" */
  location?: string;
}

export async function loadZip(filePath: string): Promise<JSZip> {
  const buffer = await fs.promises.readFile(filePath);
  return JSZip.loadAsync(buffer);
}

/**
 * Pulls every raster image out of a `word/media/` or `ppt/media/` style folder
 * inside an Office Open XML zip. Non-image media (audio/video/vector formats
 * we don't map above) is skipped rather than guessed at.
 */
export async function extractImagesFromZip(
  zip: JSZip,
  mediaPrefix: string,
  locationFor?: (archivePath: string) => string | undefined,
): Promise<EmbeddedImage[]> {
  const mediaPaths = Object.keys(zip.files).filter(
    (path) => path.startsWith(mediaPrefix) && !zip.files[path].dir,
  );

  const images: EmbeddedImage[] = [];
  for (const archivePath of mediaPaths) {
    const extension = archivePath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = IMAGE_EXTENSION_MIME[extension];
    if (!mimeType) {
      continue;
    }

    const data = await zip.files[archivePath].async("nodebuffer");
    images.push({
      archivePath,
      extension,
      mimeType,
      data,
      location: locationFor?.(archivePath),
    });
  }

  return images;
}

export interface ImageDescription {
  archivePath: string;
  description: string;
}

/**
 * Placeholder for future VLM-based captioning of embedded DOCX/PPTX images.
 *
 * Not wired into parseDOCX/parsePPTX yet - callers can extract images with
 * `extractDocxImages`/`extractPptxImages` today, but their content is
 * currently ignored (no captions are merged into the parsed document text).
 * When a vision model is available, this is where each image's `data`/
 * `mimeType` should be sent to it, and the returned descriptions merged back
 * into the surrounding text (e.g. as a "[Image: <description>]" line placed
 * using each EmbeddedImage's `location`).
 */
export async function describeEmbeddedImages(
  images: EmbeddedImage[],
  client?: LMStudioClient,
): Promise<ImageDescription[]> {
  if (images.length === 0 || !client) {
    return [];
  }

  // TODO: implement once a vision-capable model path is available.
  return [];
}
