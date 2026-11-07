# Axiom Pilot 144 — Ryan Vo

> Work in progress. This checkpoint may be incomplete or fail tests. See PLAN.md and STATUS.md before use.


Cursor plugin specification and official plugins validator.

## Overview

This project provides JSON schemas and validation tools for Cursor plugins, including:
- Plugin manifests (`plugin.json`)
- Skill frontmatter (`SKILL.md`)
- Agent frontmatter (`agents/*.md`)
- Command configurations (`commands/command.json`)
- Hook configurations (`hooks/hooks.json`)
- Rule configurations (`rules/*.mdc`)
- MCP server configurations (`mcpServers/mcp.json`)
- Script packages (`skills/*/scripts/package.json`)
- Marketplace configuration (`marketplace.json`)
## Features

- **Plugin Manifest Validation**: Validates `plugin.json` against JSON schema with path existence checking
- **Skill Frontmatter Validation**: Validates YAML frontmatter in `SKILL.md` files
- **Agent Frontmatter Validation**: Validates agent markdown frontmatter
- **Command Validation**: Validates command configurations
- **Hook Validation**: Validates hook configurations
- **Rule Validation**: Validates rule configurations
- **MCP Server Validation**: Validates MCP server configurations with variable placeholder checking
- **Script Package Validation**: Validates script package.json files and runs test/typecheck commands
- **Script Reference Validation**: Validates explicit `scripts` field in skill frontmatter references existing script packages
- **Marketplace Validation**: Validates `marketplace.json` entries against repository plugins
- **CI Integration**: GitHub Actions workflow that runs validation on PR and push
## Installation

```bash
npm ci
```

## Usage

### Validate All Plugins

```bash
# Validate all plugins in current directory
npm run validate

# Validate with test and typecheck execution for script packages
node scripts/validate-plugins.mjs . --test --typecheck

# Validate specific directory
node scripts/validate-plugins.mjs /path/to/plugins --test --typecheck
```

### Validate Individual Components

```bash
# Validate a single plugin manifest
node scripts/validate-plugin.mjs path/to/plugin.json

# Validate a skill frontmatter
node scripts/validate-skill.mjs path/to/SKILL.md

# Validate an MCP configuration
node scripts/validate-mcp.mjs path/to/mcp.json

# Validate a script package
node scripts/validate-script-package.mjs path/to/package.json --test --typecheck
```

### Run Tests

```bash
npm test
```

## CI Workflow

The GitHub Actions workflow (`.github/workflows/validate-plugins.yml`) runs on:
- Pull requests
- Push to main branch

It includes two jobs:
1. **validate**: Validates all plugin manifests, skills, and runs unit tests
2. **validate-scripts**: Finds all script packages in skill directories and runs schema validation plus test/typecheck commands

## Schema Reference

All schemas are in the `schemas/` directory:
- `plugin.schema.json` - Plugin manifest
- `skill.schema.json` - Skill frontmatter
- `agent.schema.json` - Agent frontmatter
- `command.schema.json` - Command configuration
- `hooks.schema.json` - Hook configuration
- `rule.schema.json` - Rule configuration
- `mcp.schema.json` - MCP server configuration
- `script-package.schema.json` - Script package (package.json)
- `marketplace.schema.json` - Marketplace configuration

See `sample-plugin/.cursor-plugin/` for a complete example plugin structure with all component types.

## Requirements

- Node.js 20+
- npm

## License

MIT

Maintainer: Ryan Vo <ryandtvo@gmail.com>
