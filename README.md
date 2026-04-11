# RAG Knowledge Base API

A production-grade Retrieval Augmented Generation (RAG) pipeline built with Node.js, Google Gemini, and ChromaDB.

## What it does
Upload any text or PDF → it gets chunked, embedded, and stored in a vector database. Ask questions in natural language → it retrieves relevant context and answers using only your data.

## Tech Stack
- **Runtime:** Node.js
- **LLM:** Google Gemini (gemini-2.0-flash)
- **Embeddings:** Google Gemini (gemini-embedding-001)
- **Vector DB:** ChromaDB
- **API:** Express.js

## Architecture

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /ingest/text | Ingest raw text |
| POST | /ingest/pdf | Ingest a PDF file |
| POST | /ask | Ask a question |

## Quick Start

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/ai-engineer-journey
cd ai-engineer-journey
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### 3. Start ChromaDB
```bash
python3 -m venv chroma-env
source chroma-env/bin/activate
pip install chromadb
chroma run --path ./chroma-db
```

### 4. Start the API
```bash
npm run server
```

### 5. Test it
```bash
# Ingest some text
curl -X POST http://localhost:3000/ingest/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Your knowledge here", "source": "my-docs"}'

# Ask a question
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question here"}'
```

## Key Concepts Demonstrated
- **Embeddings** — text converted to vectors using Gemini
- **Semantic search** — find relevant content by meaning not keywords
- **RAG pattern** — ground LLM answers in your own data
- **Chunking** — split large documents into searchable pieces
- **Persistent vector storage** — ChromaDB survives restarts