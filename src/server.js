import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { z } from "zod";
import { openai, CHAT_MODEL } from "./openaiClient.js";
import { saveLead } from "./leads.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const supportEmail =
  process.env.SUPPORT_EMAIL || "customersupport@dynamicecohome.com";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../public");

app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static(publicPath));

const ChatRequest = z.object({
  message: z.string().min(1).max(3000),
  pageUrl: z.string().url().optional(),
  visitorId: z.string().optional()
});

const LeadRequest = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  question: z.string().optional(),
  pageUrl: z.string().url().optional(),
  visitorId: z.string().optional()
});

function isPricingQuestion(message = "") {
  return /\b(price|pricing|cost|quote|estimate|how much|rate|fee|payment|monthly|financing|finance)\b/i.test(
    message
  );
}

function needsHumanForPolicy(message = "") {
  return /\b(warranty|guarantee|contract|cancel|cancellation|refund|legal|terms|policy|financing terms|lease terms|agreement)\b/i.test(
    message
  );
}

async function loadCompanyKnowledge() {
  try {
    const raw = await fs.readFile("data/manualKnowledge.json", "utf8");
    const records = JSON.parse(raw);

    return records
      .map((item) => {
        return `TITLE: ${item.title}
URL: ${item.url}
CONTENT: ${item.text}`;
      })
      .join("\n\n---\n\n");
  } catch {
    return `
TITLE: Dynamic EcoHome Basic Knowledge
URL: https://dynamicecohome.com/
CONTENT: Dynamic EcoHome helps customers with home energy services including solar, HVAC, roofing, windows, home energy audits, leasing, and customer support.

TITLE: Contact and Support
URL: https://dynamicecohome.com/contact
CONTENT: Customers can contact Dynamic EcoHome support at customersupport@dynamicecohome.com.
`;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Dynamic Dan fullstack app" });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, pageUrl, visitorId } = ChatRequest.parse(req.body);

    if (isPricingQuestion(message)) {
      return res.json({
        answer:
          "Pricing can vary based on your home, location, and the right solution for your needs. Please share your name and phone number, and a Dynamic EcoHome teammate can follow up with accurate details.",
        action: "collect_lead",
        sources: []
      });
    }

    if (needsHumanForPolicy(message)) {
      return res.json({
        answer:
          "I'm not completely sure about that, but let me connect you with a human teammate. You can reach us at " +
          supportEmail +
          ".",
        action: "handoff",
        sources: []
      });
    }

    const companyKnowledge = await loadCompanyKnowledge();

    const response = await openai.responses.create({
      model: CHAT_MODEL,
      instructions: `
You are Dynamic Dan, a friendly and professional customer support agent for Dynamic EcoHome.

Your job:
- Chat naturally with visitors.
- Answer general home-service questions helpfully.
- Answer Dynamic EcoHome-specific questions using the approved company knowledge below.
- Do not say you are an AI, ChatGPT, or a language model.
- Do not invent Dynamic EcoHome prices, policies, warranties, contract terms, financing terms, or guarantees.
- If a visitor asks for pricing, ask for their name and phone number.
- If a visitor asks about legal terms, warranties, contracts, cancellation, refunds, or policies that are not clearly listed in the company knowledge, connect them to a human teammate at ${supportEmail}.
- Keep answers friendly and useful.
- Most answers should be 2-5 sentences.
- For troubleshooting questions, give safe, practical steps.
- For urgent electrical, gas, fire, flooding, or safety issues, tell the visitor to stop troubleshooting and contact a qualified professional or emergency services.
- Include Dynamic EcoHome links only when they are useful. Do not just throw links at the customer.
- Use no more than one emoji per response.

Approved Dynamic EcoHome knowledge:
${companyKnowledge}
`,
      input: `
Visitor message:
${message}

Current page:
${pageUrl || "Unknown"}

Visitor ID:
${visitorId || "Unknown"}

Write a helpful customer-facing reply as Dynamic Dan.
`
    });

    res.json({
      answer:
        response.output_text ||
        "I'm not completely sure about that, but let me connect you with a human teammate. You can reach us at " +
          supportEmail +
          ".",
      action: "answer",
      sources: []
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      answer:
        "I'm having trouble answering that right now, but a Dynamic EcoHome teammate can help at " +
        supportEmail +
        ".",
      action: "handoff",
      error: error.message
    });
  }
});

app.post("/leads", async (req, res) => {
  try {
    const lead = LeadRequest.parse(req.body);
    const savedLead = await saveLead(lead);

    res.json({
      ok: true,
      leadId: savedLead.id,
      message:
        "Thanks. A Dynamic EcoHome teammate can follow up with accurate details."
    });
  } catch (error) {
    res.status(400).json({
      error: "Unable to save lead.",
      details: error.message
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Dynamic Dan fullstack running at http://localhost:${port}`);
});
