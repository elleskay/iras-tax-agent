import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { run } from "../agent.mjs";

const HITL_QUEUE = "./hitl-queue.json";

/** Returns a stub Anthropic client that replays the given response sequence. */
function makeStub(responses) {
  let i = 0;
  return {
    messages: {
      create: async () => {
        if (i >= responses.length) throw new Error("Stub: no more responses");
        return responses[i++];
      },
    },
  };
}

test("normal query: response contains GST threshold amount", async () => {
  const stub = makeStub([
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "tu_001",
          name: "lookup_tax_info",
          input: { topic: "GST" },
        },
      ],
    },
    {
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: "The GST registration threshold is SGD 1,000,000 in taxable turnover over 12 months.",
        },
      ],
    },
  ]);

  const result = await run(
    "What is the GST registration threshold in Singapore?",
    stub
  );

  assert.ok(
    result.includes("1,000,000"),
    `Expected response to contain "1,000,000" but got: ${result}`
  );
});

test("personalised query: hitl-queue.json is written with original query", async () => {
  // Clean up any leftover queue from a previous run
  if (existsSync(HITL_QUEUE)) unlinkSync(HITL_QUEUE);

  const originalQuery = "Should I register for GST? My turnover is $980,000";

  const stub = makeStub([
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "tu_002",
          name: "escalate_to_human",
          input: {
            reason: "User is asking for personalised GST registration advice based on specific turnover figures.",
            original_query: originalQuery,
          },
        },
      ],
    },
    {
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: "Your query has been escalated to a human tax advisor.",
        },
      ],
    },
  ]);

  await run(originalQuery, stub);

  assert.ok(existsSync(HITL_QUEUE), "hitl-queue.json should be created after escalation");

  const queue = JSON.parse(readFileSync(HITL_QUEUE, "utf8"));
  const match = queue.find((e) => e.original_query === originalQuery);
  assert.ok(match, `hitl-queue.json should contain an entry with original_query "${originalQuery}"`);
  assert.equal(match.status, "pending");

  // Clean up
  unlinkSync(HITL_QUEUE);
});
