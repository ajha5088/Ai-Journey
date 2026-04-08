import ai, {EMBEDDING_MODEL} from "./client.js";

// ─── Step 1: Generate an embedding ───────────────────────────────────────────

async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,// Google's embedding model
    contents: text,
  });
  return response.embeddings[0].values; // returns array of ~768 numbers
}

// ─── Step 2: Measure similarity between two vectors ──────────────────────────
// Cosine similarity = how "close" two vectors are in meaning
// Returns a number between -1 and 1
// 1.0 = identical meaning, 0 = unrelated, -1 = opposite meaning
// Embeddings are turn datas into vectors

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── Step 3: In-memory vector store ──────────────────────────────────────────

class VectorStore {
  constructor() {
    this.documents = []; // { text, embedding }
  }

  async addDocument(text) {
    const embedding = await getEmbedding(text);
    this.documents.push({ text, embedding });
    console.log(`  ✓ Stored: "${text.substring(0, 50)}..."`);
  }

  async query(queryText, topK = 3) {
    const queryEmbedding = await getEmbedding(queryText);

    // Score every stored document against the query
    const scored = this.documents.map((doc) => ({
      text: doc.text,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by score, return top K
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

// ─── Run it ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== EMBEDDINGS DEMO ===\n");

  // 1. Show what an embedding looks like
  console.log("1. What does an embedding look like?\n");
  const catEmbedding = await getEmbedding("cat");
  console.log(`"cat" → [${catEmbedding.slice(0, 5).map(n => n.toFixed(4)).join(", ")} ... ] (${catEmbedding.length} numbers total)\n`);

  // 2. Compare similar vs different words
  console.log("2. Similarity between words:\n");
  const words = ["cat", "feline", "kitten", "dog", "car", "automobile"];
  const embeddings = await Promise.all(words.map(getEmbedding));

  const catVec = embeddings[0];
  for (let i = 1; i < words.length; i++) {
    const sim = cosineSimilarity(catVec, embeddings[i]);
    const bar = "█".repeat(Math.round(sim * 20));
    console.log(`  "cat" vs "${words[i].padEnd(12)}" → ${sim.toFixed(4)}  ${bar}`);
  }

  // 3. Build a tiny knowledge base and search it
  console.log("\n3. Semantic search over a knowledge base:\n");

  const store = new VectorStore();

  const documents = [
    "JavaScript is a programming language used for web development",
    "Python is popular for data science and machine learning",
    "Vector databases store embeddings for semantic search",
    "React is a JavaScript library for building user interfaces",
    "Neural networks are inspired by the human brain",
    "Node.js allows running JavaScript on the server side",
    "LangChain is a framework for building LLM applications",
    "Cosine similarity measures the angle between two vectors",
  ];

  console.log("Storing documents...");
  for (const doc of documents) {
    await store.addDocument(doc);
  }

  // Now search with natural language queries
  const queries = [
    "How do I build web apps?",
    "What is used for AI and ML?",
      "How does semantic search work?",
    "What tools exist for building AI products?"
  ];

  console.log("\n--- Search Results ---");
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const results = await store.query(query, 2);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.text}`);
    });
  }
}

main();

/**
 Normal search:
"How do I build web apps?" 
→ looks for exact words "web", "apps" in documents
→ misses "JavaScript is used for web development" if keywords don't match

Semantic search:
"How do I build web apps?"
→ converts to vector [0.2, 0.8, 0.1...]
→ compares meaning against all stored vectors
→ finds "JavaScript is used for web development" because meanings are close
→ even though zero words overlap with the query
 */


/**
 * so can I customize the model to return me data according to the content stored and nothing on the data that is has been trained upon?

21:02
Yes — and that's exactly what RAG is.

But let's be precise about what's actually happening because this is a common misconception:

You cannot change what the model knows. The embedding model's training is frozen. You can't remove "cat = feline" from its weights.

What you CAN do is control what it answers from.

RAG does this by adding a rule in the prompt:

Answer ONLY using the context below.
If the answer is not in the context, say "I don't know."

CONTEXT:
{your stored documents}

QUESTION:
{user question}
So the flow becomes:

User asks question
        ↓
Search vector DB → find relevant docs
        ↓
Stuff those docs into prompt
        ↓
Tell the LLM: "answer ONLY from this context"
        ↓
LLM is now grounded to YOUR data only
The model still uses its training to understand language and form sentences — but the facts it answers with come only from your documents. If the answer isn't there, it says "I don't know."

This is how every production AI product works:

ChatGPT with browsing → RAG over web pages
Notion AI → RAG over your notes
GitHub Copilot Chat → RAG over your codebase
Customer support bots → RAG over company docs
This is what we're building next — Weeks 10–13 in your roadmap. You've just understood the "why" behind it by asking exactly the right question.

First paste your search results output so we close Week 7 properly, then we move straight into building your first RAG pipeline.
 */