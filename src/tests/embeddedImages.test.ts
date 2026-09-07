import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "path";
import { extractPptxImages } from "../parsers/pptxParser";
import { extractDocxImages } from "../parsers/docxParser";

const FIXTURE_DIR = path.resolve(__dirname, "../../test-fixtures");

// Test to see if PPTX Parsing can extract embedded images and tag them with their slide
test("extractPptxImages finds embedded images and tags them with their slide", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "sample.pptx");
  const images = await extractPptxImages(pptxPath);

  assert.equal(images.length, 1);
  assert.equal(images[0].extension, "png");
  assert.equal(images[0].mimeType, "image/png");
  assert.equal(images[0].location, "Slide 1");
  assert.ok(images[0].data.length > 0);
});


// Test to see if DOCX Parsing can extract embedded images
test("extractDocxImages finds embedded images", async () => {
  const docxPath = path.join(FIXTURE_DIR, "sample.docx");
  const images = await extractDocxImages(docxPath);

  assert.equal(images.length, 1);
  assert.equal(images[0].extension, "png");
  assert.equal(images[0].mimeType, "image/png");
  assert.ok(images[0].data.length > 0);
});

// Test to see if PPTX Parsing returns an empty array when there are no images
test("extractPptxImages returns an empty array when a PPTX has no images", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "sample-table.pptx");
  const images = await extractPptxImages(pptxPath);

  assert.deepEqual(images, []);
});

// Test to see if DOCX Parsing returns an empty array when there are no images
test("extractDocxImages returns an empty array when a DOCX has no images", async () => {
  const docxPath = path.join(FIXTURE_DIR, "sample-table.docx");
  const images = await extractDocxImages(docxPath);

  assert.deepEqual(images, []);
});


// Test to see if PPTX Parsing tags images by display order, not filename order
test("extractPptxImages tags images by display order, not filename order", async () => {
  const pptxPath = path.join(FIXTURE_DIR, "reordered.pptx");
  const images = await extractPptxImages(pptxPath);

  assert.equal(images.length, 1);
  // The image is attached to slide1.xml, which is displayed second.
  assert.equal(images[0].location, "Slide 2");
});
