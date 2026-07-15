import fs from "node:fs/promises";
import axios from "axios";
import * as cheerio from "cheerio";
import { chunkText } from "./text.js";
import { embedText, saveIndex } from "./rag.js";

const APPROVED_URLS_PATH = "data/approvedUrls.json";
const MANUAL_KNOWLEDGE_PATH = "data/manualKnowledge.json";

function isApprovedDynamicEcoHomeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "dynamicecohome.com";
  } catch {
    return false;
  }
}

function extractPageText(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, img, iframe").remove();

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Dynamic EcoHome";

  const text = $("body").text().replace(/\s+/g, " ").trim();

  return { title, text };
}

async function loadManualKnowledge() {
  try {
    const raw = await fs.readFile(MANUAL_KNOWLEDGE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    console.warn("No data/manualKnowledge.json found. Skipping manual knowledge.");
    return [];
  }
}

async function crawlUrl(url) {
  if (!isApprovedDynamicEcoHomeUrl(url)) {
    throw new Error(`Blocked non-approved URL: ${url}`);
  }

  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 DynamicDanCrawler/1.0 (+https://dynamicecohome.com)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  const { title, text } = extractPageText(response.data);

  console.log(`Extracted ${text.length} characters from ${url}`);

  if (text.length < 100) {
    console.warn(`Skipping ${url}: not enough readable text found. This is common with Bubble.io pages.`);
    return [];
  }

  return chunkText(text).map((chunk, index) => ({
    id: `${url}#chunk-${index + 1}`,
    url,
    title,
    text: chunk,
    sourceType: "website",
    crawledAt: new Date().toISOString()
  }));
}

async function main() {
  const allRecords = [];

  const manualKnowledge = await loadManualKnowledge();

  for (const item of manualKnowledge) {
    const chunks = chunkText(item.text);

    for (let index = 0; index < chunks.length; index++) {
      allRecords.push({
        id: `manual-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
        url: item.url,
        title: item.title,
        text: chunks[index],
        sourceType: "manual",
        crawledAt: new Date().toISOString()
      });
    }
  }

  try {
    const approvedUrls = JSON.parse(await fs.readFile(APPROVED_URLS_PATH, "utf8"));

    for (const url of approvedUrls) {
      console.log(`Crawling ${url}`);

      try {
        const chunks = await crawlUrl(url);
        allRecords.push(...chunks);
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error.message);
      }
    }
  } catch {
    console.warn("No data/approvedUrls.json found. Skipping website crawl.");
  }

  const embeddedRecords = [];

  for (const record of allRecords) {
    const embedding = await embedText(`${record.title}\n${record.text}`);
    embeddedRecords.push({ ...record, embedding });
  }

  await saveIndex(embeddedRecords);
  console.log(`Saved ${embeddedRecords.length} chunks to data/index.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});