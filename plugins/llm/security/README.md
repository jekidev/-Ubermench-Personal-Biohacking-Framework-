# LLM Human Approval Gate

The LLM is fail-closed for all actions that retrieve external information, access RAG, change state, execute code/processes, transmit data, or persist data.

## Approval is required before

- web/network search
- scraping/fetching external content
- reading from RAG/vector stores
- creating anything
- modifying anything
- deleting anything
- sending data/messages/API requests
- saving/persisting anything
- executing commands/processes

The approval request must show the intended action, target, reason, and a safe payload preview where applicable. A missing, expired, denied, or ambiguous decision blocks execution.

This is an authorization boundary, not merely a UI confirmation. Tool implementations must call the gate before performing the side effect.
