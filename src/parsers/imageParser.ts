import { createWorker } from "tesseract.js";
import { inferStructure } from "./markdown/inferStructure";

/**
 * Parse image files using OCR (Tesseract)
 */
export async function parseImage(filePath: string): Promise<string> {
  try {
    const worker = await createWorker("eng");

    const { data: { text } } = await worker.recognize(filePath);

    await worker.terminate();

    return inferStructure(text);
  } catch (error) {
    console.error(`Error parsing image file ${filePath}:`, error);
    return "";
  }
}

