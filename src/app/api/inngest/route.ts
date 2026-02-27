import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateLeadsFunction } from "@/inngest/functions/generate-leads";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateLeadsFunction],
});
