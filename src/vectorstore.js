import { ChromaClient } from "chromadb";
import ai, { EMBEDDING_MODEL } from "./client.js";

const chroma = new ChromaClient({ path: "http://localhost:8000" });
const COLLECTION_NAME = "knowledge-base";

async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  return response.embeddings[0].values;
}

class GeminiEmbeddingFunction {
  async generate(texts) {
    return await Promise.all(texts.map(getEmbedding));
  }
}

const embeddingFunction = new GeminiEmbeddingFunction();

export async function getCollection() {
  return await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: embeddingFunction,
  });
}

export async function storeChunks(chunks) {
  const collection = await getCollection();

  const embeddings = [];
  const documents = [];
  const metadatas = [];
  const ids = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i].text);
    embeddings.push(embedding);
    documents.push(chunks[i].text);
    metadatas.push({ source: chunks[i].source });
    ids.push(`${chunks[i].source}-${i}-${Date.now()}`);
    process.stdout.write(".");
  }

  await collection.add({ embeddings, documents, metadatas, ids });
  console.log(`\nStored ${chunks.length} chunks in ChromaDB`);
}

export async function queryStore(question, topK = 3) {
  const collection = await getCollection();
  const queryEmbedding = await getEmbedding(question);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  return results.documents[0].map((text, i) => ({
    text,
    source: results.metadatas[0][i].source,
    score: results.distances[0][i],
  }));
}