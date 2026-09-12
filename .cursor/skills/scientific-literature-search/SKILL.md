---
name: scientific-literature-search
description: Search open scientific literature for Ubermench evidence work. Use when the user asks for papers, PubMed, Europe PMC, arXiv, or citations.
---

# Scientific literature search

Use open sources only.

1. Prefer `research.europepmc` first. If paper-search MCP is installed, emit `mcp.stdio:paper-search` toolCalls (never invent approval tokens).
2. Never enable Sci-Hub (`download_scihub` stays blocked).
3. Keep personal biology fields out of the research payload.
4. Mark hits as bibliographic candidates until a human grades evidence.
