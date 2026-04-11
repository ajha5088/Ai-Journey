import { extractText } from "unpdf";
import fs from "fs";
import { storeChunks } from "./vectorstore.js";

function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.length > 100) chunks.push(chunk);
  }
  return chunks;
}

export async function ingestPDF(filePath, filename) {
  console.log(`\nIngesting: ${filename}`);

  const buffer = fs.readFileSync(filePath);
  const { text: rawText } = await extractText(new Uint8Array(buffer));

  console.log(`Extracted ${rawText.length} characters`);

  const chunks = chunkText(rawText).map((text) => ({
    text,
    source: filename,
  }));

  console.log(`Split into ${chunks.length} chunks`);
  await storeChunks(chunks);

  return { filename, chunks: chunks.length };
}

export async function ingestText(text, source) {
  const chunks = chunkText(text).map((t) => ({ text: t, source }));
  await storeChunks(chunks);
  return { source, chunks: chunks.length };
}