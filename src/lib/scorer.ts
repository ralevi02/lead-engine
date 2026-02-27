import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ScoringResult {
  score: number; // 1–100
  summary: string; // 2-3 sentence summary of the company
  reasoning: string; // why this score
  status: "qualified" | "rejected";
}

const SYSTEM_PROMPT = `Eres un experto en ventas B2B. Tu tarea es evaluar si una empresa es un cliente potencial ideal (lead calificado) para otra empresa, basándote en el Perfil de Cliente Ideal (ICP) del vendedor y el contenido del sitio web del prospecto.

Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional):
{
  "score": <número del 1 al 100>,
  "summary": "<2-3 oraciones describiendo a qué se dedica esta empresa y cuál es su tamaño/mercado>",
  "reasoning": "<1-2 oraciones explicando por qué tiene ese score en relación al ICP>"
}

Guía de scoring:
- 80-100: Match casi perfecto. Industria, tamaño y necesidades coinciden con el ICP.
- 60-79: Buen match. Cumple varios criterios del ICP pero no todos.
- 40-59: Match parcial. Puede ser un lead si se trabaja bien.
- 20-39: Match débil. Solo coincide en uno o dos aspectos.
- 1-19: No es un lead. No coincide con el ICP.`;

export async function scoreCompany(
  icpDescription: string,
  companyWebsiteContent: string,
  companyName: string
): Promise<ScoringResult> {
  const userMessage = `
ICP del vendedor:
${icpDescription.slice(0, 2000)}

---

Empresa a evaluar: "${companyName}"
Contenido de su sitio web:
${companyWebsiteContent.slice(0, 4000)}
`.trim();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // Fast model for high-volume scoring
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: Partial<ScoringResult> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { score: 50, summary: companyName, reasoning: raw.slice(0, 200) };
  }

  const score = Math.min(100, Math.max(1, Number(parsed.score) || 50));

  return {
    score,
    summary: parsed.summary ?? `Empresa: ${companyName}`,
    reasoning: parsed.reasoning ?? "",
    status: score >= 50 ? "qualified" : "rejected",
  };
}
