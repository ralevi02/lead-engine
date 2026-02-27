import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// Register Inngest functions here as they are created.
// Example: import { generateLeads } from "@/inngest/functions/generate-leads";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // generateLeads,
  ],
});
