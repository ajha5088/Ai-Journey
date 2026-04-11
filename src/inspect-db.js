import { ChromaClient } from "chromadb";

const chroma = new ChromaClient({ path: "http://localhost:8000" });

async function inspect() {
  // List all collections
  const collections = await chroma.listCollections();
  console.log("\n=== Collections ===");
  console.log(collections);

  // Get your knowledge-base collection
  const collection = await chroma.getCollection({ name: "knowledge-base" });

  // Count documents
  const count = await collection.count();
  console.log(`\n=== Total chunks stored: ${count} ===`);

  // Peek at first 5 items
  const peek = await collection.peek({ limit: 5 });

  console.log("\n=== Sample documents ===");
  peek.documents.forEach((doc, i) => {
    console.log(`\n[${i + 1}] Source: ${peek.metadatas[i].source}`);
    console.log(`    Text: ${doc.substring(0, 100)}...`);
  });
}

inspect();
