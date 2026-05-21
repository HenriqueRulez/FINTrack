import Anthropic from "@anthropic-ai/sdk";

// Server-only — importing this in a 'use client' file will cause a build error
// because ANTHROPIC_API_KEY is not prefixed with NEXT_PUBLIC_
if (typeof window !== "undefined") {
  throw new Error("@/lib/anthropic/client must only be used server-side");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
