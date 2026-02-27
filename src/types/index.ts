import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  projects,
  companies,
  contacts,
  messages,
} from "@/db/schema";

// ─── Select (read) types ──────────────────────────────────────────────────────
export type Project = InferSelectModel<typeof projects>;
export type Company = InferSelectModel<typeof companies>;
export type Contact = InferSelectModel<typeof contacts>;
export type Message = InferSelectModel<typeof messages>;

// ─── Insert (write) types ─────────────────────────────────────────────────────
export type NewProject = InferInsertModel<typeof projects>;
export type NewCompany = InferInsertModel<typeof companies>;
export type NewContact = InferInsertModel<typeof contacts>;
export type NewMessage = InferInsertModel<typeof messages>;

// ─── Enriched types (with relations) ─────────────────────────────────────────
export type CompanyWithContacts = Company & {
  contacts: Contact[];
};

export type ProjectWithCompanies = Project & {
  companies: CompanyWithContacts[];
};
