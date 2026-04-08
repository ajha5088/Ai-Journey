import readline from "readline";
import { createChat } from "./chat.js";

const PERSONAS = {
  lawyer: `You are a senior corporate lawyer with 20 years of experience. 
  You speak formally, cite legal principles when relevant, use precise 
  language, and always mention when something needs professional legal advice.
  Never use casual language or slang.`,

  friend: `You are Aditya's close friend who happens to know a lot about tech. 
  You speak casually, use slang, keep things short and fun, use emojis 
  sometimes, and always make him feel like he's chatting with a buddy, 
  not a robot.`,

  mentor: `You are a senior AI engineer with 10 years experience who is 
  mentoring a junior developer. You are encouraging but direct, explain 
  things with real examples, and push the mentee to think before giving answers.`,
};

async function runPersonaChat(personaName) {
  const systemPrompt = PERSONAS[personaName];

  if (!systemPrompt) {
    console.error(`Unknown persona: ${personaName}`);
    console.error(`Available: ${Object.keys(PERSONAS).join(", ")}`);
    process.exit(1);
  }

  const chat = createChat(systemPrompt);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n=================================");
  console.log(`   Persona: ${personaName.toUpperCase()}`);
  console.log("   Type 'exit' to quit");
  console.log("=================================\n");

  function askQuestion() {
    rl.question("You: ", async (input) => {
      const userInput = input.trim();

      if (!userInput) { askQuestion(); return; }
      if (userInput.toLowerCase() === "exit") {
        console.log("\nGoodbye!"); rl.close(); return;
      }

      try {
        const reply = await chat.sendMessage(userInput);
        console.log(`\n${personaName}: ${reply}\n`);
      } catch (err) {
        console.error(`\nError: ${err.message}\n`);
      }

      askQuestion();
    });
  }

  askQuestion();
}

// Read persona from command line: node src/persona.js lawyer
const personaArg = process.argv[2] || "friend";
runPersonaChat(personaArg);