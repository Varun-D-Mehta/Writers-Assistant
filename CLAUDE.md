# Writers Assistant — Claude Code Guidelines

## Pre-flight Checks

Before starting frontend work, verify Node.js and npm are installed. Before starting backend work, verify Python and pip are installed. Before any deployment step, verify all environment variables and credentials are loaded.

## Development Workflow

When implementing a new feature, complete and test it end-to-end before moving to the next feature. Do not leave half-baked implementations. If a feature requires backend + frontend changes, verify the integration works before proceeding.

## Refactoring Rules

After making any rename or refactor, grep the entire codebase for the old name in ALL file types (including JSON, YAML, .env, and config files) before committing. Never use sed for bulk renames without verifying the scope first.

## Git & Security

Never commit .env files, secrets, API keys, or credentials to git. Before every commit, check staged files for sensitive content. Add secrets patterns to .gitignore proactively.
