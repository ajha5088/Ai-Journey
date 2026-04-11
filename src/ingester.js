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

  try {
    const buffer = fs.readFileSync(filePath);

    const result = await extractText(new Uint8Array(buffer));

    let rawText = "";

    if (typeof result?.text === "string") {
      rawText = result.text;
    } else if (Array.isArray(result?.text)) {
      rawText = result.text.join(" ");
    } else {
      rawText = "";
    }

    console.log(`Extracted ${rawText.length} characters`);

    if (!rawText || rawText.length < 50) {
      console.warn(
        "⚠️ PDF has little or no extractable text (possibly scanned)",
      );
      return { filename, chunks: 0, warning: "No readable text found" };
    }

    const chunks = chunkText(rawText).map((text) => ({
      text,
      source: filename,
    }));

    console.log(`Split into ${chunks.length} chunks`);

    if (chunks.length > 0) {
      await storeChunks(chunks);
    }

    return { filename, chunks: chunks.length };
  } catch (err) {
    console.error("PDF ingestion failed:", err);
    throw err;
  }
}

export async function ingestText(text, source) {
  const chunks = chunkText(text).map((t) => ({ text: t, source }));
  await storeChunks(chunks);
  return { source, chunks: chunks.length };
}
