export function chunkText(text, maxChars = 1800) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function isPricingQuestion(message = "") {
  return /\b(price|pricing|cost|quote|estimate|how much|rate|fee|payment|monthly|financing)\b/i.test(message);
}

export function buildContext(chunks) {
  if (!chunks.length) return "No relevant website content was found.";

  return chunks.map((item, index) => {
    return `SOURCE ${index + 1}
URL: ${item.url}
TITLE: ${item.title}
CONTENT:
${item.text}`;
  }).join("\n\n---\n\n");
}
