import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODEL = "gemini-2.5-flash"
export const EMBEDDING_MODEL = "gemini-embedding-001";
export default ai;