import ai, { MODEL } from "./client.js";

export function createChat(systemPrompt = null) {
  const history = [];

  // If a system prompt is provided, inject it as first context
  if (systemPrompt) {
    history.push({
      role: "user",
      parts: [{ text: `[SYSTEM]: ${systemPrompt}` }],
    });
    history.push({
      role: "model",
      parts: [{ text: "Understood. I will follow these instructions." }],
    });
  }

  async function sendMessage(userMessage) {
    history.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: history,
    });

    const reply = response.text;

    history.push({
      role: "model",
      parts: [{ text: reply }],
    });

    return reply;
  }

  function getHistory() {
    return history;
  }

  function clearHistory() {
    history.length = 0;
  }

  return { sendMessage, getHistory, clearHistory };
}