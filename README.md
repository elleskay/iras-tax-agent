# IRAS Tax FAQ Agent

[![CI](https://github.com/elleskay/iras-tax-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/elleskay/iras-tax-agent/actions/workflows/ci.yml)

A minimal Claude `tool_use` agent for answering Singapore IRAS tax questions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           agent.mjs                                 │
│                                                                     │
│  argv[2] ──► routeQuery() ──► factual-lookup → OpenAI gpt-4o-mini  │
│                          │                       (direct, no tools) │
│                          └──► pii/advice/default                    │
│                                    │                                │
│                          Claude Haiku ◄──► tool_use loop            │
│                                    │                                │
│                         ┌──────────┼──────────┐                     │
│                         ▼          ▼          ▼                     │
│                   lookup_tax  calculate_tax  escalate_to_human      │
│                   _info()     _estimate()    ()                     │
│                   (facts)     (math)         │                      │
│                                              ▼                      │
│                                       hitl-queue.json               │
│                                              │                      │
│                                         hitl.mjs                    │
│                                    (human advisor view)              │
└─────────────────────────────────────────────────────────────────────┘
```

## Model Routing

`routeQuery()` in [router.mjs](router.mjs) inspects the query before any API call and dispatches to the appropriate provider:

| Rule | Pattern | Provider | Model | Execution path |
|------|---------|----------|-------|----------------|
| PII detected | NRIC (`S/T` + 7 digits) or UEN | Anthropic | claude-haiku-4-5-20251001 | tool_use loop → HITL |
| Personalised advice | `should I`, `will I`, `my income`, `how much will I pay` | Anthropic | claude-haiku-4-5-20251001 | tool_use loop → HITL |
| Factual lookup | `what is`, `what are`, `deadline`, `rate`, `threshold` | OpenAI | gpt-4o-mini | direct chat completion |
| Default | everything else | Anthropic | claude-haiku-4-5-20251001 | tool_use loop → HITL |

The router logs its decision before any API call:
```
[router] factual-lookup → openai/gpt-4o-mini
[router] personalised-advice → anthropic/claude-haiku-4-5-20251001
```

## Setup

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and OPENAI_API_KEY

npm install
```

## Usage

```bash
# Ask a general tax question
npm start "What is the GST registration threshold in Singapore?"

# Ask about income tax
npm start "When is the income tax e-filing deadline?"

# Estimate chargeable income
npm start "My annual income is SGD 120,000 and I have SGD 20,000 in deductions. What is my chargeable income?"

# Ask personalised advice (triggers escalation)
npm start "I run a sole proprietorship and also have rental income — how should I structure my deductions?"

# View pending human escalations (run separately)
node hitl.mjs
```

## Example Output

### Normal query

```
Query: What is the GST registration threshold?

[tool: lookup_tax_info] done

GST registration is required when your taxable turnover exceeds SGD 1,000,000
over the past 12 months, or when you can reasonably expect it to exceed this
amount in the next 12 months. You must apply for GST registration within
30 days of becoming liable.
```

### Escalation

```
Query: I have offshore income and rental properties — what's my tax exposure?

[tool: escalate_to_human] done

Your question involves multiple income sources and potential cross-border tax
considerations, which require personalised advice beyond what this FAQ assistant
can reliably provide. Your query has been escalated to a human tax advisor
(case #1736123456789). They will follow up with personalised advice. Please do
not act on any figures discussed here as final tax advice.
```

### Viewing the HITL queue

```
$ node hitl.mjs

=== HITL Queue — 1 pending escalation(s) ===

Case #1736123456789
  Time    : 2025-01-06T08:30:56.789Z
  Reason  : Query involves offshore income and multiple property types requiring personalised advice
  Query   : I have offshore income and rental properties — what's my tax exposure?
  Status  : pending
```

## Files

| File | Purpose |
|------|---------|
| `agent.mjs` | Main agent loop — accepts query, runs tool_use until end_turn |
| `router.mjs` | Model router — dispatches queries to Anthropic or OpenAI based on content |
| `tools.mjs` | Tool definitions (Claude API format) + handler implementations |
| `hitl.mjs` | Human-in-the-loop viewer — run separately to see pending escalations |
| `hitl-queue.json` | Auto-created on first escalation (gitignored) |

## Notes

- `calculate_tax_estimate` returns **chargeable income only**, not final tax payable
- The agent will escalate complex or personalised queries to `hitl-queue.json`
- All monetary values are in SGD
