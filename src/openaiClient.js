import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY. Add it to your .env file.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
