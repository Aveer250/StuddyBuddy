---
name: AI provider choice
description: Provider setup and cost constraints for the study tutor.
---

Use the owner's OpenAI API key through Replit Secrets. Do not retry managed AI integration setup unless the user explicitly changes this decision.

**Why:** The user declined the upgrade required by managed AI setup and instructed use of their own key through a secure form instead. They also asked to be told before paid changes.

**How to apply:** Keep credentials server-side, request replacements only through secure Secrets tooling, and explain usage charges before enabling paid service changes. Never claim live tutor tests passed when the provider rejects the credential.
