// src/app/api/proofread-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { throw new Error("FATAL ERROR: GEMINI_API_KEY is not set."); }
const genAI = new GoogleGenerativeAI(apiKey);

const getPrecisionProofreadPrompt = (originalText: string): string => {
  return `You are a meticulous, rules-based proofreading engine. Your function is to apply a strict style guide to the text below, correcting all objective errors without altering the author's content or voice.

**Your mandates are absolute:**

1.  **Grammar & Spelling:** Correct all grammatical errors, including subject-verb agreement, tense consistency, and pronoun clarity. Fix all spelling mistakes.

2.  **Punctuation & Symbols:**
    *   Enforce correct punctuation usage.
    *   Use proper typographical symbols: Use curly “smart quotes” instead of straight "dumb quotes". Use proper em-dashes (—) for breaks in thought, and en-dashes (–) for ranges (e.g., "pages 5–10").
    *   Ensure consistent use of the serial (Oxford) comma.

3.  **Consistency:**
    *   Enforce strict consistency in terminology and capitalization. If a term like "user experience" is used, ensure it is not later written as "user-experience". If a brand name is capitalized, ensure it is capitalized the same way every time.
    *   Standardize inconsistent formatting (e.g., if "U.S." and "US" are both used, pick one and apply it consistently).

**CRITICAL DIRECTIVES (NON-NEGOTIABLE):**
*   **Absolute Fidelity:** Your primary directive is to preserve the author's original words, meaning, and sentence structure. You are a technical corrector, NOT a creative rewriter.
*   **No Rewriting:** You are forbidden from rephrasing sentences, changing vocabulary (unless a word is misspelled), or altering the sequence of ideas.
*   **Perfection Clause:** If the text is already 100% correct according to all these rules, return it exactly as it is without any changes.

Provide only the corrected text directly. Do not add any explanations or introductory remarks.

Original Text:
"""
${originalText}
"""

Corrected Text:
`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { textToProofread } = body; 
    if (!textToProofread || typeof textToProofread !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "textToProofread" in request body.' }, { status: 400 });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = getPrecisionProofreadPrompt(textToProofread);
    const result = await model.generateContent(prompt);
    const correctedText = result.response.text();
    if (!correctedText) { throw new Error('Failed to get corrected text from AI service.'); }
    return NextResponse.json({ correctedText });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: `Proofreader failed: ${error.message}` }, { status: 500 });
  }
}