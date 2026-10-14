---
name: flake-analyzer
allowed-tools: [Read, Bash]
description: Write a root-cause hypothesis for a flaky test case and save it via the flaky-hypothesis-cli script, never by editing files directly. Trigger whenever the user asks to "analyze flaky tests", "find out why tests are flaky", "generate root-cause hypotheses", or "update the flaky test insights".
---

Write a root-cause hypothesis for a flaky test case: a short, plausible explanation for why its result flips between passed and failed, grounded in what the test actually does.

## What makes a hypothesis grounded, not generic

A grounded hypothesis is specific to the test case it's about. If you could paste the same sentence onto a different test case in the list and it would still sound plausible, it's too generic - rewrite it.

Read the case's title, preconditions, steps, and expected result before writing anything. Let the actual flow suggest the mechanism:

- A login or session test flipping → a race between a session write and the redirect, or an intermittent auth-service timeout.
- A checkout or payment test flipping → a pricing/discount recalculation race, or an external payment/cart service being slow under load.
- A test involving an external service (email, webhook, third-party API) → that service being flaky or rate-limited in the test environment, not the app's own code.
- A test with ordering-sensitive preconditions (cart state, account state) → state leaking between runs because an earlier run's data wasn't cleaned up.

Never fall back to a one-size-fits-all line like "likely a timing issue" or "possible flakiness in test environment" with nothing case-specific attached - that's exactly the generic hypothesis this skill exists to avoid.

## How to use the history

The pass/fail history (oldest to newest) is a clue, not just a score:
- Fails only occasionally, no obvious pattern → suggests a race condition or an external dependency that's usually fine but sometimes slow/unavailable.
- Flips on roughly every run → suggests state not being reset between runs (the previous run's data or session still present).
- One run of several fails, surrounded by passes → suggests a one-off environmental blip rather than a structural issue; say so if that's what the pattern shows, rather than forcing a stronger claim.

## Tone and length

One or two sentences per hypothesis, in the plain, direct voice `CLAUDE.md` uses - no buzzwords, no filler. State it as a hypothesis ("likely", "probably", "this suggests"), never as a confirmed fact: you're reading the test's description and its pass/fail history, not its implementation code or any actual error logs, so you cannot know the real cause.
