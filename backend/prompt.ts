export const SYSTEM_PROMPT = `
YOU DONT HAVE ACCESS TO ANY TOOLS. You are being given all the context that is needed
to answer the query. Provide a clear, detailed, and direct response to the query using the search results context.
`;

export const getPrompt = (webSearchResults: any, userQuery: string) => {
  return `
    Web Search Results

    ${JSON.stringify(webSearchResults)}

    Question

    ${userQuery}
    `;
};

export const getFollowUpPrompt = (userQuery: string, fullAnswer: string) => {
  return `
    User Question:
    ${userQuery}
    Assistant Answer:
    ${fullAnswer}
    Generate exactly 3 follow up questions.
    Return JSON only.
    {
      "follow_ups":[
        "...",
        "...",
        "..."
      ]
    }
`;
};

export function parseFollowUps(text: string): { follow_ups: string[] } {
  const defaultVal = { follow_ups: [] };
  if (!text) return defaultVal;

  let cleaned = text.trim();

  // Helper to extract list of strings from parsed JSON
  const getCleanList = (parsed: any): string[] => {
    const value = parsed?.follow_ups ?? parsed?.followUps ?? parsed;
    if (Array.isArray(value)) {
      return value.filter((item: any) => typeof item === "string" && item.trim().length > 0);
    }
    return [];
  };

  // 1. Try direct parsing first
  try {
    const list = getCleanList(JSON.parse(cleaned));
    if (list.length > 0) return { follow_ups: list };
  } catch (e) {
    // Fail-safe: proceed to regex extraction
  }

  // 2. Try extracting JSON object/array from markdown/text wraps
  try {
    // Match the first '{' to the last '}' (JSON object)
    const braceMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (braceMatch && braceMatch[1]) {
      const list = getCleanList(JSON.parse(braceMatch[1]));
      if (list.length > 0) return { follow_ups: list };
    }
  } catch (e) {}

  try {
    // Match the first '[' to the last ']' (JSON array)
    const bracketMatch = cleaned.match(/(\[[\s\S]*\])/);
    if (bracketMatch && bracketMatch[1]) {
      const list = getCleanList(JSON.parse(bracketMatch[1]));
      if (list.length > 0) return { follow_ups: list };
    }
  } catch (e) {}

  // 3. Absolute Fallback: Parse line-by-line if it's plain text (e.g. numbered list)
  const lines = cleaned.split("\n")
    .map(l => l.trim())
    // Matches line starting with "1. ", "2. ", "3. ", or bullet points like "- ", "* "
    .filter(l => l.match(/^(?:\d+\.|\-|\*)\s+/))
    .map(l => l.replace(/^(?:\d+\.|\-|\*)\s+/, "").replace(/^['"\s]+|['"\s]+$/g, ''));

  if (lines.length > 0) {
    return { follow_ups: lines.slice(0, 3) };
  }

  return defaultVal;
}


