import { promises as fs } from "fs";
import path from "path";

export interface FeedbackEntry {
  id: string;
  question: string;
  answer: string;
  helpful: boolean;
  timestamp: number;
  sessionId: string;
}

const DATA_DIR = path.join(process.cwd(), ".support-data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const CUSTOM_QA_FILE = path.join(DATA_DIR, "custom-qa.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function logFeedback(entry: FeedbackEntry): Promise<void> {
  const entries = await readJson<FeedbackEntry[]>(FEEDBACK_FILE, []);
  entries.push(entry);
  await writeJson(FEEDBACK_FILE, entries);
}

export async function getFeedback(): Promise<FeedbackEntry[]> {
  return readJson<FeedbackEntry[]>(FEEDBACK_FILE, []);
}

export interface CustomQA {
  id: string;
  question: string;
  answer: string;
  addedAt: number;
}

export async function getCustomQAs(): Promise<CustomQA[]> {
  return readJson<CustomQA[]>(CUSTOM_QA_FILE, []);
}

export async function addCustomQA(qa: Omit<CustomQA, "id" | "addedAt">): Promise<CustomQA> {
  const entries = await readJson<CustomQA[]>(CUSTOM_QA_FILE, []);
  const newQA: CustomQA = {
    ...qa,
    id: `custom-${Date.now()}`,
    addedAt: Date.now(),
  };
  entries.push(newQA);
  await writeJson(CUSTOM_QA_FILE, entries);
  return newQA;
}
