/**
 * PDF/Text file
     ↓
Split into chunks
     ↓
Embed each chunk → store in VectorStore
     ↓
User asks question
     ↓
Embed question → find top 3 matching chunks
     ↓
Stuff chunks into prompt → "answer ONLY from this"
     ↓
Gemini answers grounded to your document
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import ai, { MODEL, EMBEDDING_MODEL } from "./client.js";

// ─── Embedding ────────────────────────────────────────────────────────────────

async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  return response.embeddings[0].values;
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── Document loader & chunker ────────────────────────────────────────────────
// Splits documents into paragraphs (chunks)
// Each chunk gets embedded and stored separately

function loadKnowledgeBase(dirPath) {
  const chunks = [];
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".txt"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
    const paragraphs = content
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    for (const paragraph of paragraphs) {
      chunks.push({
        text: paragraph,
        source: file,
      });
    }
  }

  return chunks;
}

// ─── Vector store ─────────────────────────────────────────────────────────────

class VectorStore {
  constructor() {
    this.documents = [];
  }

  async addChunks(chunks) {
    console.log(`Embedding ${chunks.length} chunks...`);
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.text);
      this.documents.push({ ...chunk, embedding });
      process.stdout.write(".");
    }
    console.log(" done!\n");
  }

  async query(queryText, topK = 3) {
    const queryEmbedding = await getEmbedding(queryText);
    const scored = this.documents.map((doc) => ({
      text: doc.text,
      source: doc.source,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

// ─── RAG: answer using only retrieved context ─────────────────────────────────

async function ragAnswer(question, store) {
  // Step 1: Retrieve relevant chunks
  const relevantChunks = await store.query(question, 3);

  // Step 2: Build context string
  const context = relevantChunks
    .map((c, i) => `[${i + 1}] (from ${c.source})\n${c.text}`)
    .join("\n\n");

  // Step 3: Prompt with strict grounding instruction
  const prompt = `You are a helpful assistant. Answer the question using ONLY the context provided below.
If the answer is not in the context, say "I don't have information about that in my knowledge base."
Do not use any outside knowledge.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;

  // Step 4: Send to LLM
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return {
    answer: response.text.trim(),
    sources: relevantChunks.map((c) => `${c.source} [score: ${c.score.toFixed(3)}]`),
  };
}

// ─── Interactive CLI ──────────────────────────────────────────────────────────

async function main() {
  console.log("=================================");
  console.log("   RAG Knowledge Base Chat");
  console.log("=================================\n");

  // Load and embed knowledge base
  const chunks = loadKnowledgeBase("./knowledge-base");
  const store = new VectorStore();
  await store.addChunks(chunks);

  console.log(`Knowledge base ready. ${chunks.length} chunks loaded.\n`);
  console.log('Ask anything about AI engineering or JavaScript.');
  console.log("Type 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask() {
    rl.question("You: ", async (input) => {
      const question = input.trim();

      if (!question) { ask(); return; }
      if (question.toLowerCase() === "exit") {
        console.log("\nGoodbye!"); rl.close(); return;
      }

      try {
        const { answer, sources } = await ragAnswer(question, store);
        console.log(`\nAnswer: ${answer}`);
        console.log(`\nSources: ${sources.join(", ")}\n`);
      } catch (err) {
        console.error(`Error: ${err.message}\n`);
      }

      ask();
    });
  }

  ask();
}

main();

/**
Knowledge base → Chunks → Embeddings → Vector store
        +
User question → Embed → Find closest chunks → LLM prompt
        +
"Answer ONLY from context" → Grounded answer


Notion AI, ChatGPT with files, customer support bots, internal knowledge tools — this is the engine underneath all of them. You just built it from scratch in plain JavaScript.

 */