# Fixtures — sample data

Everything in this folder is made-up sample data for Judge Mirror's mock mode (`LLM_MOCK=1`). It is not a real submission and not a real review.

- `sample-submission.txt`: a made-up project description ("PantryPal") that includes a prompt-injection line.
- `sample-transcript.txt`: a made-up video transcript for the same project.
- `mock-review.json`: the raw output a model would return for the "Build With AI: Basics" preset. It is built to show every card state, so it is **not** a judgement of the sample text:
  - Design: two real quotes (one from the transcript).
  - Potential Impact: one real quote that overlaps Design's, and one made-up quote that verification drops.
  - Innovation/Idea: only made-up quotes, so it shows "Couldn't verify, re-run".
  - Presentation: no evidence, so it shows the dashed circle and the caret.
  - Flags: one real injection flag and one made-up flag that verification drops.
- `mock-parse-criteria.json`: a small criteria list for the Custom path.
