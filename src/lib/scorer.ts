import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ScoringResult {
  score: number; // 1–100
  summary: string; // 2-3 sentence summary of the company
  reasoning: string; // why this score
  status: "qualified" | "rejected";
}

const SYSTEM_PROMPT = `Eres un experto en ventas B2B. Tu tarea es evaluar si una empresa es un cliente potencial ideal (lead calificado) considerando DOS dimensiones:

1. **Match con ICP** (60% del score): ¿Qué tan bien encaja esta empresa con el Perfil de Cliente Ideal del vendedor?
2. **Contactabilidad** (40% del score): ¿Qué tan probable es encontrar y contactar a un decision maker de esta empresa?

Señales POSITIVAS de contactabilidad (empresa mediana/grande con presencia digital):
- Tiene página web con sección de equipo, "nosotros" o directivos nombrados
- Menciona cargo de gerente, director, CEO, o similares
- Tiene LinkedIn corporativo o perfil profesional
- Email corporativo visible o formulario de contacto empresarial
- Parece tener más de 10 empleados
- Es S.A., S.p.A., Ltda. con estructura formal

Señales NEGATIVAS de contactabilidad (empresa muy pequeña o informal):
- Solo tiene WhatsApp o celular, sin email corporativo
- No hay nombres de personas en el sitio
- Parece microempresa o persona natural
- Solo tiene redes sociales, sin sitio web propio
- No se encuentran decisores en una búsqueda simple

Responde Únicament con un objeto JSON válido (sin texto adicional):
{
  "score": <número del 1 al 100>,
  "summary": "<2-3 oraciones: a qué se dedica + tamaño/mercado + nivel de contactabilidad>",
  "reasoning": "<1-2 oraciones: por qué tiene ese score, mencionando match ICP Y contactabilidad>"
}

Guía de scoring final (combinando ambas dimensiones):
- 80-100: Excelente match ICP Y fácil de contactar (empresa mediana/grande con presencia digital clara).
- 60-79: Buen match ICP Y contactabilidad razonable.
- 40-59: Match parcial O contactabilidad dudosa.
- 20-39: Match débil O empresa muy pequeña/informal sin decisores identificables.
- 1-19: No es un lead (sin match ICP ni forma de contactar).`;

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
