import fs from "node:fs/promises";
import path from "node:path";
import { openai, EMBEDDING_MODEL } from "./openaiClient.js";

const INDEX_PATH = path.resolve("data/index.json");

export async function embedText(text) {
  const result = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });

  return result.data[0].embedding;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function loadIndex() {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveIndex(records) {
  await fs.writeFile(INDEX_PATH, JSON.stringify(records, null, 2));
}

export async function retrieveRelevantChunks(question, limit = 5) {
  const index = await loadIndex();
  if (!index.length) return [];

  const queryEmbedding = await embedText(question);

  return index
    .map((record) => ({
      ...record,
      score: cosineSimilarity(queryEmbedding, record.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
