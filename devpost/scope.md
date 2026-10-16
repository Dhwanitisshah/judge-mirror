---
doc: scope
status: approved
---

# Judge Mirror

A coach that shows a hackathon entry the way a judge will read it, before the deadline.

## The Unique Kernel
"Show me my submission the way a judge will see it, before the deadline." Two things make it more than a generic feedback bot:
- **Evidence or it didn't happen.** Every score comes with quotes from the user's own text, and the code verifies that each quote exists in the input. Unverifiable quotes are dropped or flagged, never shown as fact. If nothing in the text addresses a criterion, it says so explicitly.
- **Coach, not ghostwriter.** One concrete fix per criterion, phrased as a question or instruction. It never outputs rewritten submission text.

## Who It's For
A first-time hackathon participant, especially in a beginner-friendly Devpost hackathon, who has built something and is about to submit without knowing how their entry reads against the judging criteria.
Today: they submit blind. Devpost's "Will It Ship" live review covers about 5 submissions per hackathon, and everyone else gets no feedback until results come out.

## The Core Loop
1. Paste the judging criteria, or pick the preset "Build With AI: Basics" (Design, Potential Impact, Innovation/Idea, Presentation).
2. Paste the submission description, plus an optional video transcript.
3. Get a scorecard. Per criterion: a 1–5 score, 1–2 verbatim evidence quotes from their own text, and ONE concrete fix.
4. Work through a "Stage One" checklist they tick themselves: public repo, open-source license visible, planning docs present, video under 3 minutes.

Why they come back: edit the text, paste again, and see the scores and fixes move.

## Inspiration & Identity
A strict but fair teacher. The "red pen" design: blunt, specific, never cruel.
Tone and interaction are borrowed from Hemingway Editor (https://hemingwayapp.com), which marks up your own text instead of chatting at you.

## Why This Matters to the Learner
Learning goal (from `1-start`): getting reliable structured output from an LLM, and verifying it in code rather than trusting it. The quote-exists check is the concrete exercise of that. The personal story behind the idea was not given; "not established" is fine.

## What "Working" Looks Like
Paste the criteria and a real submission. Within about 15 seconds, see a complete scorecard where every evidence quote is verified to exist in the input. Unverifiable quotes are dropped or flagged, never shown as fact.
The "oh, that's cool" beat, the "red pen on your own words": paste a real submission and red underlines appear on the actual sentences. A circled "2" sits next to Impact, with a margin note pointing at the exact line that lost the point. This is the core product, not decoration.

## The POC Boundary
In:
- Criteria input by paste, or the one preset (Build With AI: Basics).
- Submission description input by paste, with an optional video transcript pasted as text.
- A scorecard per criterion: 1–5 score, 1–2 verified verbatim quotes, one fix (question or instruction). An explicit "nothing in your text addresses this" when there is no evidence.
- Code-level verification of every quote against the input. A verified quote's position in the input is what lets the red underlines land on the user's actual sentences.
- The red-pen view: the user's own text with verified quotes underlined, a circled score per criterion, and margin notes.
- The self-ticked Stage One checklist (no automatic checking).

## Later
Not stated by the learner. The items under Explicitly Cut are candidates only if the learner revisits them.

## Explicitly Cut
- **Fetching Devpost URLs automatically:** too big for 2–4 hours. Scraping is fragile and adds demo failure points; pasting works for the kernel.
- **User accounts and saving history:** not needed for the kernel, since one review is the full loop.
- **Video analysis (transcript text only):** too big for 2–4 hours.
- **Multiple languages:** not needed, since Devpost submissions are in English.
- **Comparing against past winners:** too big, as it needs a dataset the learner doesn't have.
