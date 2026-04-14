import readline from "readline";
import ai, { MODEL } from "./client.js";
import { queryStore } from "./vectorstore.js";

// ─── Tool definitions ─────────────────────────────────────────────────────────

const tools = [
  {
    name: "search_knowledge_base",
    description:
      "Search the local knowledge base for information about AI engineering, JavaScript, RAG, embeddings, and related topics. Use this when the user asks about technical concepts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up in the knowledge base",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate",
    description:
      "Perform mathematical calculations. Use this for any math the user asks about.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "A valid JavaScript math expression like '2 + 2' or '15 * 24'",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "get_current_time",
    description:
      "Get the current date and time. Use when user asks about time or date.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_weather",
    description:
      "Get current weather for any city. Use when user asks about weather.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name e.g. Mumbai, Delhi, London",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for current information, news, or anything not in the knowledge base.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "run_code",
    description:
      "Execute JavaScript code and return the result. Use when user asks to run, compute, or test code.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "Valid JavaScript code to execute. Use console.log() to output results.",
        },
      },
      required: ["code"],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

async function executeTool(toolName, toolArgs) {
  console.log(`\n  🔧 Calling tool: ${toolName}`);
  console.log(`     Args: ${JSON.stringify(toolArgs)}`);

  switch (toolName) {
    case "search_knowledge_base": {
      const results = await queryStore(toolArgs.query, 3);
      if (!results.length) return "No relevant information found.";
      return results
        .map((r, i) => `[${i + 1}] ${r.text} (source: ${r.source})`)
        .join("\n\n");
    }

    case "calculate": {
      try {
        const result = eval(toolArgs.expression);
        return `${toolArgs.expression} = ${result}`;
      } catch {
        return `Could not calculate: ${toolArgs.expression}`;
      }
    }

    case "get_current_time": {
      return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    }

    case "get_weather": {
      try {
        const city = encodeURIComponent(toolArgs.city);
        const response = await fetch(`https://wttr.in/${city}?format=j1`);
        const data = await response.json();
        const current = data.current_condition[0];
        const area = data.nearest_area[0];
        return `Weather in ${toolArgs.city}:
- Temperature: ${current.temp_C}°C (feels like ${current.FeelsLikeC}°C)
- Condition: ${current.weatherDesc[0].value}
- Humidity: ${current.humidity}%
- Wind: ${current.windspeedKmph} km/h
- Location: ${area.areaName[0].value}, ${area.country[0].value}`;
      } catch {
        return `Could not fetch weather for ${toolArgs.city}`;
      }
    }

    case "web_search": {
      try {
        const query = encodeURIComponent(toolArgs.query);
        const response = await fetch(
          `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`
        );
        const data = await response.json();
        const results = [];
        if (data.AbstractText) {
          results.push(`Summary: ${data.AbstractText}`);
        }
        if (data.RelatedTopics?.length > 0) {
          const topics = data.RelatedTopics.filter((t) => t.Text)
            .slice(0, 3)
            .map((t) => `- ${t.Text}`);
          results.push(`Related:\n${topics.join("\n")}`);
        }
        return results.length > 0
          ? results.join("\n\n")
          : `No instant results found for: ${toolArgs.query}.`;
      } catch {
        return `Search failed for: ${toolArgs.query}`;
      }
    }

    case "run_code": {
      try {
        const logs = [];
        const mockConsole = {
          log: (...args) => logs.push(args.map(String).join(" ")),
          error: (...args) => logs.push("ERROR: " + args.map(String).join(" ")),
        };
        const fn = new Function("console", toolArgs.code);
        fn(mockConsole);
        return logs.length > 0
          ? `Code output:\n${logs.join("\n")}`
          : "Code ran successfully with no output.";
      } catch (err) {
        return `Code error: ${err.message}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ─── Layer 1: Fast keyword router ────────────────────────────────────────────

function fastRouter(input) {
  const q = input.toLowerCase().trim();

  if (/^(what'?s? )?(the )?time(\?)?$/.test(q) ||
      q === "time" ||
      q.startsWith("current time")) {
    return { tool: "get_current_time", args: {} };
  }

  if (/^[\d\s\+\-\*\/\(\)\.%\^]+$/.test(q)) {
    return { tool: "calculate", args: { expression: q } };
  }

  const weatherMatch = q.match(/weather\s+(?:in\s+)?([a-z\s]+)[\?\s]*$/);
  if (weatherMatch) {
    return { tool: "get_weather", args: { city: weatherMatch[1].trim() } };
  }

  return null;
}

// ─── Layer 2: RAG confidence check ───────────────────────────────────────────

async function ragConfidenceCheck(input) {
  try {
    const results = await queryStore(input, 1);
    if (results.length > 0 && results[0].score < 0.35) {
      return {
        answer: results[0].text,
        source: results[0].source,
        confidence: results[0].score,
      };
    }
  } catch {
    // ChromaDB not available — skip this layer
  }
  return null;
}

// ─── Layer 3: Safety check ────────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /ignore previous instructions/i,
  /you are now/i,
  /jailbreak/i,
  /forget your instructions/i,
];

function safetyCheck(input) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return "I can't process that request.";
    }
  }
  return null;
}

// ─── Layer 4: Cache ───────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  const entry = cache.get(key.toLowerCase().trim());
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key.toLowerCase().trim(), {
    value,
    timestamp: Date.now(),
  });
}

// ─── LLM Agent loop ───────────────────────────────────────────────────────────

async function runAgent(userMessage) {
  console.log("\n  🤔 Agent thinking...");

  const contents = [
    {
      role: "user",
      parts: [{
        text: `You are a helpful agent. You have access to tools.
ALWAYS use get_current_time when asked about time.
ALWAYS use search_knowledge_base for technical questions.
ALWAYS use calculate for math.
ALWAYS use get_weather for weather questions.
ALWAYS use web_search for current events or news.
ALWAYS use run_code when asked to execute or test code.

Question: ${userMessage}`,
      }],
    },
  ];

  while (true) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        tools: [{ functionDeclarations: tools }],
        toolConfig: {
          functionCallingConfig: { mode: "AUTO" },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No response from model");

    const parts = candidate.content?.parts ?? [];
    const toolCalls = parts.filter((p) => p.functionCall);

    if (toolCalls.length === 0) {
      const textPart = parts.find((p) => p.text);
      return textPart?.text ?? "No response generated.";
    }

    const toolResults = [];
    for (const part of toolCalls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args);
      toolResults.push({ name, result });
    }

    contents.push({
      role: "model",
      parts: toolCalls.map((p) => ({ functionCall: p.functionCall })),
    });

    contents.push({
      role: "user",
      parts: toolResults.map((r) => ({
        functionResponse: {
          name: r.name,
          response: { result: r.result },
        },
      })),
    });

    console.log(`  ✓ Tools executed, continuing...`);
  }
}

// ─── Master orchestrator ──────────────────────────────────────────────────────

async function processQuery(input) {
  const start = Date.now();

  const cached = cacheGet(input);
  if (cached) {
    return { answer: cached, layer: "cache", ms: Date.now() - start };
  }

  const blocked = safetyCheck(input);
  if (blocked) {
    return { answer: blocked, layer: "safety", ms: Date.now() - start };
  }

  const fastMatch = fastRouter(input);
  if (fastMatch) {
    const result = await executeTool(fastMatch.tool, fastMatch.args);
    cacheSet(input, result);
    return { answer: result, layer: "fast-router", ms: Date.now() - start };
  }

  const ragResult = await ragConfidenceCheck(input);
  if (ragResult) {
    const answer = `${ragResult.answer}\n\n*(source: ${ragResult.source})*`;
    cacheSet(input, answer);
    return { answer, layer: "rag-direct", ms: Date.now() - start };
  }

  const answer = await runAgent(input);
  cacheSet(input, answer);
  return { answer, layer: "llm-agent", ms: Date.now() - start };
}

// ─── Interactive CLI ──────────────────────────────────────────────────────────

async function main() {
  console.log("=================================");
  console.log("   AI Agent — Production Router");
  console.log("=================================");
  console.log("Tools available:");
  console.log("  - search_knowledge_base");
  console.log("  - calculate");
  console.log("  - get_current_time");
  console.log("  - get_weather");
  console.log("  - web_search");
  console.log("  - run_code");
  console.log("\nRouting layers:");
  console.log("  1. cache       → instant repeat answers");
  console.log("  2. safety      → blocks harmful input");
  console.log("  3. fast-router → keyword shortcuts (no LLM)");
  console.log("  4. rag-direct  → high confidence RAG (no LLM)");
  console.log("  5. llm-agent   → full agent with tools");
  console.log("\nTry asking:");
  console.log('  "time"');
  console.log('  "weather in Jamshedpur"');
  console.log('  "1234 * 5678"');
  console.log('  "What is RAG?"');
  console.log('  "Write code to find primes up to 50"');
  console.log("\nType 'exit' to quit\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask() {
    rl.question("You: ", async (input) => {
      const question = input.trim();
      if (!question) { ask(); return; }
      if (question.toLowerCase() === "exit") {
        console.log("\nGoodbye!"); rl.close(); return;
      }

      try {
        const { answer, layer, ms } = await processQuery(question);
        console.log(`\nAgent: ${answer}`);
        console.log(`\n  [resolved by: ${layer} in ${ms}ms]\n`);
      } catch (err) {
        console.error(`\nError: ${err.message}\n`);
      }

      ask();
    });
  }

  ask();
}

main();