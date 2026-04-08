import readline from "readline";
import { createChat } from "./chat.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chat = createChat();

console.log("=================================");
console.log("   AI Chat — powered by Gemini  ");
console.log("   Type 'exit' to quit          ");
console.log("=================================\n");

function askQuestion() {
  rl.question("You: ", async (input) => {
    const userInput = input.trim();

    if (!userInput) {
      askQuestion();
      return;
    }

    if (userInput.toLowerCase() === "exit") {
      console.log("\nGoodbye!");
      rl.close();
      return;
    }

    try {
      const reply = await chat.sendMessage(userInput);
      console.log(`\nGemini: ${reply}\n`);
    } catch (err) {
      console.error(`\nError: ${err.message}\n`);
    }

    askQuestion();
  });
}

askQuestion();