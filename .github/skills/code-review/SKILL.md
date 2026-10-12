---
name: code-review
description: Review pull requests for correctness, security, regressions, contract preservation, maintainability, and evidence of working behavior. Use for Copilot code review and any request to review a code change.
---

# Code review

Review the behavior changed by the pull request. Read the repository's `AGENTS.md`, relevant documentation, tests, and nearby code before deciding whether a finding is real. Treat the pull request description and test names as claims to verify. Keep the review within the change's likely impact; do not turn a focused review into a speculative redesign.

## Establish the contract

1. State what the change is meant to do and what behavior must remain available. Trace the changed path from its entry point through storage, external calls, and the user-visible result.
2. For each changed validator, allowlist, blocklist, feature flag, quota, fallback, default, or sanitizer, identify representative `must_allow` and `must_deny` cases from the product contract. A test fixture or temporary restriction is evidence for one case, not permission to narrow the product.
3. Check ordinary valid input, the least convenient valid input, malformed input, absence, partial failure, retries, concurrent requests, and recovery where they can reach the changed path. Mark a case unproven when it cannot be exercised.

## Find the blast radius

- Look beyond changed lines for callers, consumers, persisted data, old code paths, and deployment assumptions. Read relevant history when it explains an unusual guard or interface.
- If a new source, route, or caller shares a cap, quota, budget, or slot pool, compare the *classes of results present* before and after. Stable totals can hide a starved class.
- Check trust boundaries: authorization, untrusted input and output, secret handling, network destinations and redirects, resource bounds, duplicate side effects, and transaction or job ownership. Report a security claim only with a reachable path and its conditions.
- Distinguish missing data, synthetic fixtures, old observations, and independent verification. Do not turn an unavailable check into a passing result.

## Check design and simplicity

- Prefer a deep module: a small interface that hides meaningful behavior. Flag a pass-through layer, one-caller wrapper, speculative adapter, duplicate state, or new dependency when it increases work for callers and maintainers without earning its cost.
- In backend changes, make a concrete delete list: what can be removed, inlined, or replaced by existing repository code or a platform feature. Preserve guards that enforce a real contract.
- If the code is correct but hard to review, recommend a bounded, behavior-preserving refactor with the check that would prove behavior stayed stable. Do not request broad rewrites for cosmetic gain.

## Prove the concern

- Prefer a focused command or test that runs the real handler, module interface, browser interaction, or rendered output. A build, source grep, or passing test suite alone does not prove a branch is reachable.
- For a suspected regression, show an input and the observed or mechanically demonstrated wrong result. If practical, change the relevant condition in a temporary copy and confirm the test fails, then discard the copy.
- For a changed web, CLI, or terminal surface, inspect the rendered state. Check clipping, alignment, contrast, keyboard access, responsive layout, empty and error states, and whether the display matches the underlying evidence. Record the viewport or terminal width when it matters.
- If tools or fixtures cannot reach the case, say exactly what remains unproven. Do not present a guess as a defect.

## Report actionable findings

Lead with the most consequential findings. For each one, give the file and narrow line range, the input or state that triggers it, the actual result, the expected result, and the smallest credible fix. Use severity according to impact and likelihood; distinguish a blocking correctness or security bug from a maintainability suggestion. Do not repeat the same root cause in several comments.

If no actionable issue remains, say so and name any material verification gap. Write directly and specifically. Avoid generic praise, speculative warnings, invented certainty, and comments that merely restate the code.
