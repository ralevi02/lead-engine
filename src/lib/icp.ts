import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface IcpResult {
  icpDescription: string;
  searchKeywords: string[];
}

const SYSTEM_PROMPT = `Eres un experto en ventas B2B y análisis de mercado en Latinoamérica.
Tu tarea es analizar el contenido del sitio web de una empresa y generar su Perfil de Cliente Ideal (ICP) para una campaña de prospección B2B.

Responde ÚNICAMENTE con un objeto JSON válido con este formato exacto (sin texto adicional):
{
  "icpDescription": "Descripción detallada del ICP en español (3-4 párrafos): quiénes son sus clientes ideales, qué industrias sirven, qué problemas resuelven y qué valor entregan, tamaño de empresa objetivo (preferiblemente medianas y grandes empresas con decisores identificables), y qué cargo tiene el tomador de decisión.",
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
}

Las searchKeywords deben ser EXACTAMENTE 8 TÉRMINOS DE BÚSQUEDA EN ESPAÑOL, optimizados para encontrar empresas B2B objetivo en Google Maps/Places.
- Mezcla términos de industria Y de formato empresarial (ej: "empresa manufactura", "planta industrial", "distribuidora industrial", "constructora mediana")
- Prioriza empresas MEDIANAS Y GRANDES (con empleados, estructura formal, decisores contactables)
- Incluye variaciones del rubro: nombre técnico, nombre coloquial, y tipo de actividad
- Evita términos que devuelvan microempresas o personas naturales`;

export async function generateICP(websiteContent: string): Promise<IcpResult> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analiza este contenido del sitio web y genera el ICP:\n\n${websiteContent}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: Partial<IcpResult> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: return the raw text as description
    parsed = { icpDescription: raw, searchKeywords: [] };
  }

  return {
    icpDescription: parsed.icpDescription ?? "",
    searchKeywords: Array.isArray(parsed.searchKeywords)
      ? parsed.searchKeywords
      : [],
  };
}
