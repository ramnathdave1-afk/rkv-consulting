# Case Studies

Generates sales-grade case studies from real Supabase data. Built around Imran's pattern: deterministic Python writes the structure + hard numbers; an LLM only fills in narrative sections.

## Why this exists

Generating a case study from seed data ("Meridian Demo") produces a fabricated asset that hurts trust the moment a prospect sniffs it. This script is **frozen until real production data exists** — specifically, until dad's 7-unit property has been on RKV for 60+ days of real activity.

When that day comes, generation is one command.

## Run

```bash
cd /Users/daveramnath/rkv-consulting
python3 case-studies/generate_case_study.py \
    --property-id <uuid> \
    --window-days 90
```

Output: `case-studies/[C]-case-study-<property-slug>.md`

Also dumps raw JSON if `--json-out path.json` is passed.

## What the script does (deterministic, free)

- Pulls property + units + leases + conversations + work orders + showings + owner reports for the given window
- Computes: occupancy %, AI handling %, median work-order resolution time, showing conversion, conversations by channel
- Renders a markdown skeleton with hard numbers in tables, narrative sections marked `[NARRATIVE: ...]`

## What an LLM does (second pass, costs tokens)

The generated markdown has 5 narrative sections (`[NARRATIVE: ...]`) and 2 review sections (`[REVIEW: ...]`). After the script runs, hand the file to Hermes / Claude / whatever with a prompt like:

> "Fill in the [NARRATIVE: ...] and [REVIEW: ...] blocks in this case study using the data tables already in the file. Do not invent claims that aren't supported by the numbers. Get owner-quote and 'before' content from interview notes only — leave a placeholder if those don't exist."

Two-step keeps token spend on the writing, not on data extraction that doesn't need an LLM.

## Status

- [x] Script + template built (2026-04-27)
- [ ] Dad's 7-unit property onboarded to RKV
- [ ] 60+ days of real activity accumulated
- [ ] First real case study generated

## Honest take

The scaffolding is the easy part. The case study being publishable requires real data, which requires onboarding dad's units, which requires Dave to do the boring work outside this repo. No automation moves that forward.
