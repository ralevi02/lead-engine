import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenuButton } from "@/components/mobile-menu-button";

export const dynamic = "force-dynamic";

// ─── Helper ───────────────────────────────────────────────────────────────────

function mask(value: string | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

const API_KEYS = [
  {
    group: "Base de datos",
    items: [
      { label: "DATABASE_URL (Neon)", key: "DATABASE_URL", description: "Conexión PostgreSQL serverless" },
    ],
  },
  {
    group: "IA & Scraping",
    items: [
      { label: "GROQ_API_KEY", key: "GROQ_API_KEY", description: "Generación de ICP y scoring (llama-3)" },
      { label: "JINA_API_KEY", key: "JINA_API_KEY", description: "Scraping de sitios web a Markdown" },
    ],
  },
  {
    group: "Descubrimiento",
    items: [
      { label: "GOOGLE_PLACES_API_KEY", key: "GOOGLE_PLACES_API_KEY", description: "Búsqueda de empresas por ubicación" },
    ],
  },
  {
    group: "Enriquecimiento de contactos",
    items: [
      { label: "HUNTER_API_KEY", key: "HUNTER_API_KEY", description: "Búsqueda de emails corporativos (free: 25/mes)" },
      { label: "APOLLO_API_KEY", key: "APOLLO_API_KEY", description: "Enriquecimiento de personas (reserva)" },
    ],
  },
  {
    group: "Background Jobs",
    items: [
      { label: "INNGEST_EVENT_KEY", key: "INNGEST_EVENT_KEY", description: "Clave de publicación de eventos" },
      { label: "INNGEST_SIGNING_KEY", key: "INNGEST_SIGNING_KEY", description: "Verificación de webhooks" },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <MobileMenuButton />
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Configuraciones</h1>
          <p className="text-xs text-zinc-500">Variables de entorno y preferencias del sistema</p>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 sm:p-6 max-w-3xl">
        {/* ── Appearance ── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Apariencia
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Modo de color</p>
                <p className="text-xs text-zinc-500 mt-0.5">Alterna entre modo claro u oscuro</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        {/* ── API Keys ── */}
        {API_KEYS.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {group}
            </h2>
            <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:divide-zinc-800">
              {items.map(({ label, key, description }) => {
                const value = process.env[key];
                const configured = Boolean(value);
                return (
                  <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            configured
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                          }`}
                        >
                          {configured ? "Configurado" : "Falta"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                    </div>
                    <code className="shrink-0 rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {mask(value)}
                    </code>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* ── About ── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Acerca de
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:divide-zinc-800">
            {[
              { label: "Versión", value: "0.1.0 · Beta" },
              { label: "Framework", value: "Next.js 16.1.6 (App Router)" },
              { label: "Base de datos", value: "Neon Postgres + Drizzle ORM" },
              { label: "Modelos IA", value: "Groq · llama-3.3-70b & llama-3.1-8b" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
