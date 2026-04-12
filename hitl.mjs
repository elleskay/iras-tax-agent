import { readFileSync, existsSync } from "fs";

const HITL_QUEUE = "./hitl-queue.json";

if (!existsSync(HITL_QUEUE)) {
  console.log("No escalations yet. hitl-queue.json not found.");
  process.exit(0);
}

const queue = JSON.parse(readFileSync(HITL_QUEUE, "utf8"));
const pending = queue.filter((e) => e.status === "pending");

if (pending.length === 0) {
  console.log("No pending escalations.");
  process.exit(0);
}

console.log(`=== HITL Queue — ${pending.length} pending escalation(s) ===\n`);
for (const entry of pending) {
  console.log(`Case #${entry.id}`);
  console.log(`  Time    : ${entry.timestamp}`);
  console.log(`  Reason  : ${entry.reason}`);
  console.log(`  Query   : ${entry.original_query}`);
  console.log(`  Status  : ${entry.status}`);
  console.log();
}
