import Anthropic from "@anthropic-ai/sdk";
import { tools, executeTool } from "./tools.mjs";
import { fileURLToPath } from "url";
import "dotenv/config";

const MODEL = "claude-haiku-4-5-20251001";
const SYSTEM = `You are an IRAS (Inland Revenue Authority of Singapore) tax FAQ assistant.
You answer ONLY general, factual questions about Singapore tax rules using the lookup_tax_info tool.

ESCALATE IMMEDIATELY (call escalate_to_human, do NOT ask follow-up questions) when the user:
- Mentions their own income, salary, revenue, turnover, or financial situation
- Uses words like "I", "my", "me", "we", "our" in a tax context
- Asks "will I", "should I", "do I", "how much will I", "am I"
- Describes a specific personal or business scenario
- Asks anything that requires knowing their individual circumstances

Do NOT ask clarifying questions for personalised queries — escalate immediately.
Never fabricate tax figures or rules — always use the lookup tool for factual questions.`;

export async function run(query, client = new Anthropic()) {
  const messages = [{ role: "user", content: query }];

  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.text ?? "(no text response)";
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults = [];

      for (const block of toolUseBlocks) {
        process.stdout.write(`[tool: ${block.name}] `);
        const result = executeTool(block.name, block.input);
        console.log("done");
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }
}

// CLI entry point — only runs when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: node agent.mjs "<your tax question>"');
    process.exit(1);
  }
  console.log(`Query: ${query}\n`);
  run(query)
    .then((text) => console.log("\n" + text))
    .catch((err) => { console.error("Error:", err.message); process.exit(1); });
}
