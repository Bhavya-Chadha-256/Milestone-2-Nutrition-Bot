// lib/schema.ts
import { z } from "zod";

export const CitationSchema = z.object({
  document_name: z.string().min(1),
  publisher: z.string().min(1),
  year: z.number().int().min(1900).max(2030),
  url: z.string().url(),
  section: z.string().min(1),
});

export type Citation = z.infer<typeof CitationSchema>;

export const ClaimSchema = z.object({
  claim_text: z.string().min(1),
  source: CitationSchema,
});

export type Claim = z.infer<typeof ClaimSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string().min(1),
  claims: z.array(ClaimSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
