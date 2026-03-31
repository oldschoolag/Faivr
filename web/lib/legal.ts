import { readFile } from "fs/promises";
import path from "path";

export async function readLegalMarkdown(fileName: string) {
  return readFile(path.join(process.cwd(), "..", "legal", fileName), "utf8");
}
