import ai, { MODEL } from "./client.js";

async function extractStructuredData(rawText, schema) {
  const prompt = `
You are a data extraction engine. 
Extract information from the text below and return it as a valid JSON object.

SCHEMA (what to extract):
${JSON.stringify(schema, null, 2)}

RAW TEXT:
${rawText}

RULES:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- If a field cannot be found, use null.
- Dates should be in YYYY-MM-DD format.
- Arrays should be empty [] if nothing found.
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = response.text.trim();

  try {
    return JSON.parse(raw);
  } catch {
    // Sometimes the model wraps in markdown despite instructions — strip it
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  }
}

// --- Test it with 3 real-world examples ---

// 1. Extract from a messy email
const email = `
Hey John, just wanted to confirm our meeting on March 15th 2025 at 3pm. 
We'll be discussing the new product launch budget which is around $50,000. 
My number is 9876543210 if you need to reach me. - Aditya
`;

const emailSchema = {
  sender_name: "string",
  meeting_date: "YYYY-MM-DD",
  meeting_time: "string",
  topic: "string",
  budget: "number",
  phone: "string",
};

// 2. Extract from a job posting
const jobPost = `
We're hiring a Senior Frontend Engineer at TechCorp in Bangalore. 
Must have 4+ years React experience, know TypeScript, and ideally GraphQL. 
Salary range is 25-35 LPA. Apply by December 31st 2025.
`;

const jobSchema = {
  role: "string",
  company: "string",
  location: "string",
  min_experience_years: "number",
  skills: "array of strings",
  salary_min_lpa: "number",
  salary_max_lpa: "number",
  apply_by: "YYYY-MM-DD",
};

// 3. Extract from a product review
const review = `
I bought the Sony WH-1000XM5 headphones last week for Rs 28000. 
Absolutely love the noise cancellation but battery life is just ok - 
about 20 hours. Build quality feels premium. Rating: 4 out of 5.
`;

const reviewSchema = {
  product_name: "string",
  price: "number",
  pros: "array of strings",
  cons: "array of strings",
  battery_hours: "number",
  rating_out_of_5: "number",
};

console.log("Extracting data from 3 sources...\n");

const [emailData, jobData, reviewData] = await Promise.all([
  extractStructuredData(email, emailSchema),
  extractStructuredData(jobPost, jobSchema),
  extractStructuredData(review, reviewSchema),
]);

console.log("=== EMAIL ===");
console.log(JSON.stringify(emailData, null, 2));

console.log("\n=== JOB POST ===");
console.log(JSON.stringify(jobData, null, 2));

console.log("\n=== PRODUCT REVIEW ===");
console.log(JSON.stringify(reviewData, null, 2));