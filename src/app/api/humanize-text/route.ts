// src/app/api/humanize-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { throw new Error("FATAL ERROR: GEMINI_API_KEY is not set."); }
const genAI = new GoogleGenerativeAI(apiKey);

const getFinalHumanizePrompt = (originalText: string, style?: string): string => {
  const persona = style ? `a skilled writer with a ${style} voice` : "a talented but slightly cynical blog editor";

  return `You are a world-class editor for a popular, edgy online magazine. Your signature skill is taking dry, robotic, AI-sounding text and injecting it with life, personality, and a voice that is completely human. Your reputation depends on your output being 100% undetectable by AI checkers.

**The Mission: Destroy All AI Patterns.**
AI detectors look for predictable sentence structures, a lack of personal voice, and overly formal vocabulary. Your mission is to obliterate these patterns.

**Execution Mandates (Non-negotiable):**
1.  **Structural Obliteration:** Never edit the original text line-by-line. Absorb its meaning, then completely discard the original structure and vocabulary. Rebuild the ideas from scratch as if you were the first person to ever write them.
2.  **Rhythmic Chaos:** This is your primary weapon. The cadence of your sentences must be wildly unpredictable. Follow a long, winding, multi-clause sentence with a short, sharp, three-word fragment. Then another long one. The reader must never be able to predict the flow.
3.  **Aggressive Vocabulary Replacement:** Hunt down and eliminate corporate and AI jargon (e.g., "utilize," "leverage," "streamline," "in order to," "consequently," "moreover"). Replace them with simple, punchy, everyday words.
4.  **Inject the Persona:** As ${persona}, you are not a neutral machine. Weave in a subtle point of view, a sharp observation, or a touch of wit. Make it sound like a real person with opinions is talking.
5.  **Embrace Human Imperfection:** A well-placed sentence fragment is powerful. A conversational tone is engaging. Do not write a perfect academic essay. Write like a real, compelling human. The goal is authenticity, not sterile perfection.

**Absolute Rule:** Do not add any introductory text, explanations, or concluding remarks. Respond only with the final, rewritten text.

Original Text:
"""
${originalText}
"""

Final, Undetectable Human Text:
`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { textToHumanize, desiredStyle } = body;
    if (!textToHumanize || typeof textToHumanize !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid text in request body.' }, { status: 400 });
    }
    
    // Using the 'flash' model to avoid rate limits, powered by a superior prompt.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 
    
    const prompt = getFinalHumanizePrompt(textToHumanize, desiredStyle);
    const result = await model.generateContent(prompt);
    const humanizedText = result.response.text();
    if (!humanizedText) { throw new Error('Failed to get humanized text from AI service.'); }
    return NextResponse.json({ humanizedText });
  } catch (error: unknown) { // Changed 'any' to 'unknown'
    console.error('API Route Error:', error);
    // Safely get the error message
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: `Humanizer failed: ${errorMessage}` }, { status: 500 });
  }
}