# Generative-AI use disclosure

## Summary

This project uses generative-AI tools as assistants in its implementation and
ongoing maintenance. They may help draft or revise source code, tests,
documentation, configuration, and refactors under maintainer direction.

## Accountability and validation

AI tools are not maintainers or contributors to this repository. Project
maintainers decide what is accepted and remain responsible for changes merged
into the project. AI-assisted changes are subject to the same scoped review
and validation expected of any other contribution; see
[CONTRIBUTING.md](CONTRIBUTING.md) for the human workflow and
[AGENTS.md](AGENTS.md) for agent-specific working rules.

## Scope and limits of this disclosure

- This is a disclosure of development assistance. It does not claim that any
  particular file or line was generated entirely by an AI system.
- The published package does not require or invoke a generative-AI service at
  runtime.
- Prompt logs, private planning, and other local development context are not
  part of the repository or this disclosure.
- This document does not amend the project's [BSD 3-Clause License](LICENSE)
  or grant additional rights.

## For contributors

Use of an AI assistant does not reduce the contributor's responsibility to
understand a change, respect the repository's boundaries, and run the relevant
checks. Contributors and agents must keep secrets and private local context
out of commits, issues, pull requests, and other public project material.
