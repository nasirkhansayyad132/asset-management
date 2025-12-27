import { Router } from "express";
import { config } from "../config";

const router = Router();

const callLlm = async (prompt: string) => {
  const response = await fetch(`${config.aiApiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.aiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.aiModel,
      messages: [
        { role: "system", content: "You are a structured data extraction assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM error: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
};

const extractFromText = (text: string) => {
  const serialMatch = text.match(/serial\s*(?:number|no\.?|#)?\s*[:\-]?\s*([A-Za-z0-9-]+)/i);
  const modelMatch = text.match(/model\s*[:\-]?\s*([A-Za-z0-9-]+)/i);
  const vendorMatch = text.match(/vendor\s*[:\-]?\s*([A-Za-z0-9 &.-]+)/i);
  const costMatch = text.match(/(?:total|amount|cost)\s*[:\-]?\s*\$?([0-9,.]+)/i);
  const warrantyMatch = text.match(/warranty\s*[:\-]?\s*([A-Za-z0-9 .-]+)/i);

  return {
    category: "Unspecified",
    model: modelMatch?.[1] || "Unknown",
    serial: serialMatch?.[1] || "Unknown",
    vendor: vendorMatch?.[1] || "Unknown",
    cost: costMatch ? Number(costMatch[1].replace(/,/g, "")) : 0,
    warranty: warrantyMatch?.[1] || "Unknown"
  };
};

router.post("/extract-asset", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  if (!config.aiApiKey) {
    return res.json({ source: "mock", data: extractFromText(text) });
  }

  const prompt = `Extract asset fields from the following procurement or invoice text.\n\nText:\n${text}\n\nReturn strict JSON with keys: category, model, serial, vendor, cost, warranty.`;

  try {
    const content = await callLlm(prompt);
    const parsed = JSON.parse(content);
    return res.json({ source: "llm", data: parsed });
  } catch (error) {
    return res.status(502).json({ error: "LLM extraction failed" });
  }
});

router.post("/risk-summary", async (req, res) => {
  const { stats } = req.body as {
    stats?: {
      totalAssets?: number;
      missingAssets?: number;
      duplicateSerials?: number;
      frequentRepairs?: number;
    };
  };

  if (!stats) {
    return res.status(400).json({ error: "stats is required" });
  }

  const safeStats = {
    totalAssets: stats.totalAssets ?? 0,
    missingAssets: stats.missingAssets ?? 0,
    duplicateSerials: stats.duplicateSerials ?? 0,
    frequentRepairs: stats.frequentRepairs ?? 0
  };

  if (!config.aiApiKey) {
    const anomalies = [] as string[];
    if (safeStats.missingAssets > 0) {
      anomalies.push("missing assets detected");
    }
    if (safeStats.duplicateSerials > 0) {
      anomalies.push("duplicate serials present");
    }
    if (safeStats.frequentRepairs > 0) {
      anomalies.push("frequent repairs flagged");
    }

    const summary = `Director summary: ${safeStats.totalAssets} assets tracked. ` +
      `${safeStats.missingAssets} missing, ${safeStats.duplicateSerials} with duplicate serials, ` +
      `${safeStats.frequentRepairs} flagged for frequent repairs.`;

    return res.json({ source: "mock", summary, anomalies });
  }

  const prompt = `Create a concise director summary (2-3 sentences) using these stats: ${JSON.stringify(
    safeStats
  )}. Highlight anomalies. Return JSON with keys: summary, anomalies (array of strings).`;

  try {
    const content = await callLlm(prompt);
    const parsed = JSON.parse(content);
    return res.json({ source: "llm", ...parsed });
  } catch (error) {
    return res.status(502).json({ error: "LLM summary failed" });
  }
});

export default router;
