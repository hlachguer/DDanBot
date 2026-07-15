import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const LEADS_PATH = path.resolve("data/leads.json");

export async function saveLead(lead) {
  let leads = [];

  try {
    leads = JSON.parse(await fs.readFile(LEADS_PATH, "utf8"));
  } catch {
    leads = [];
  }

  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...lead
  };

  leads.push(record);
  await fs.writeFile(LEADS_PATH, JSON.stringify(leads, null, 2));

  return record;
}
