import express from "express";
import multer from "multer";
import path from "path";
import ai, { MODEL } from "./client.js";
import { queryStore } from "./vectorstore.js";
import { ingestPDF, ingestText } from "./ingester.js";

const app = express();
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Ask a question ───────────────────────────────────────────────────────────
app.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    // Retrieve relevant chunks
    const chunks = await queryStore(question, 3);

    const context = chunks
      .map((c, i) => `[${i + 1}] (from ${c.source})\n${c.text}`)
      .join("\n\n");

    const prompt = `You are a helpful assistant. Answer using ONLY the context below.
If the answer is not in the context, say "I don't have information about that."
Do not use outside knowledge.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.json({
      answer: response.text.trim(),
      sources: chunks.map((c) => ({
        source: c.source,
        score: c.score,
        preview: c.text.substring(0, 100) + "...",
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ingest a PDF ─────────────────────────────────────────────────────────────
app.post("/ingest/pdf", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const result = await ingestPDF(
      req.file.path,
      req.file.originalname
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ingest raw text ──────────────────────────────────────────────────────────
app.post("/ingest/text", async (req, res) => {
  const { text, source } = req.body;

  if (!text || !source) {
    return res.status(400).json({ error: "text and source are required" });
  }

  try {
    const result = await ingestText(text, source);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nRAG API running on http://localhost:${PORT}`);
  console.log("\nEndpoints:");
  console.log("  GET  /health");
  console.log("  POST /ask        { question }");
  console.log("  POST /ingest/text { text, source }");
  console.log("  POST /ingest/pdf  { file }");
});