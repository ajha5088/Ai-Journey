import ai, { MODEL } from "./client.js";

// ─── The test article ────────────────────────────────────────────────────────
const TEST_ARTICLE = `
OpenAI released GPT-5 on March 20th 2025, claiming it is 3x more capable 
than GPT-4 on reasoning tasks. The model supports 1 million token context 
windows, can process images and audio natively, and costs $0.01 per 1000 
tokens. Early testers from Google, Microsoft and several startups reported 
significantly better performance on coding, math, and legal document analysis. 
However, critics raised concerns about energy consumption — GPT-5 reportedly 
uses 5x more compute than GPT-4 per query. OpenAI CEO Sam Altman called it 
"the biggest leap in AI capability since ChatGPT launched."
`;

// ─── Prompt strategies ───────────────────────────────────────────────────────
const PROMPTS = [
  {
    name: "Basic",
    prompt: `Summarise the following article:\n\n${TEST_ARTICLE}`,
  },
  {
    name: "Structured",
    prompt: `Summarise the following article in exactly 3 sentences.
First sentence: main event.
Second sentence: key details.  
Third sentence: impact or criticism.

Article:
${TEST_ARTICLE}`,
  },
  {
    name: "Audience-aware",
    prompt: `Explain the following article to a 15-year-old in under 50 words.
Use simple language, no jargon, no technical terms.

Article:
${TEST_ARTICLE}`,
  },
  {
    name: "Chain-of-thought",
    prompt: `Read the following article carefully.
First, identify: who, what, when, where, why.
Then write a 2 sentence summary using those facts only.
Think step by step before writing the summary.

Article:
${TEST_ARTICLE}`,
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────
async function testPrompt(name, prompt) {
  const start = Date.now();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const duration = Date.now() - start;

  return {
    name,
    output: response.text.trim(),
    duration_ms: duration,
    prompt_length: prompt.length,
  };
}

async function runAllPrompts() {
  console.log("Running prompt comparison...\n");
  console.log("=".repeat(60));

  // Run all prompts in parallel
  const results = await Promise.all(
    PROMPTS.map((p) => testPrompt(p.name, p.prompt))
  );

  // Display results
  for (const result of results) {
    console.log(`\n📌 STRATEGY: ${result.name}`);
    console.log(`⏱  Time: ${result.duration_ms}ms`);
    console.log(`📝 Prompt length: ${result.prompt_length} chars`);
    console.log(`\n${result.output}`);
    console.log("\n" + "─".repeat(60));
  }

  // Summary table
  console.log("\n=== COMPARISON SUMMARY ===\n");
  console.log("Strategy         | Time    | Prompt Length");
  console.log("─".repeat(45));
  for (const r of results) {
    console.log(
      `${r.name.padEnd(16)} | ${String(r.duration_ms).padEnd(7)}ms | ${r.prompt_length} chars`
    );
  }
}

runAllPrompts();