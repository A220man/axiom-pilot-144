# Changelog

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-01

### Added
- Plugin manifest JSON schema (`schemas/plugin.schema.json`)
- Plugin validation script (`scripts/validate-plugin.mjs`)
- Comprehensive validator CLI (`scripts/validate-plugins.mjs`)
- Plugin validation tests (`tests/test-plugin-validation.mjs`)
- Skill frontmatter JSON schema (`schemas/skill.schema.json`)
- Skill validation script (`scripts/validate-skill.mjs`)
- Skill validation tests (`tests/test-skill-validation.mjs`)
- Sample plugin with sample skill
- CI workflow for plugin validation (`.github/workflows/validate-plugins.yml`)
- Package.json with pinned dependencies and package-lock.json
- MCP server configuration schema (`schemas/mcp.schema.json`)
- MCP validation script (`scripts/validate-mcp.mjs`)
- MCP validation tests (`tests/test-mcp-validation.mjs`)
- Sample MCP configuration
- Agent frontmatter schema (`schemas/agent.schema.json`)
- Agent validation in comprehensive validator
- Agent validation tests
- Hooks configuration schema (`schemas/hooks.schema.json`)
- Hooks validation in comprehensive validator
- Hooks validation tests
- Command configuration schema (`schemas/command.schema.json`)
- Command validation in comprehensive validator
- Command validation tests
- Rule configuration schema (`schemas/rule.schema.json`)
- Rule validation script (`scripts/validate-rule.mjs`)
- Rule validation in comprehensive validator
- Rule validation tests
- Sample rule configuration
- Script package schema (`schemas/script-package.schema.json`)
- Script package validation script with test/typecheck execution (`scripts/validate-script-package.mjs`)
- Script package validation tests (`tests/test-script-package-validation.mjs`)
- Sample script package in sample plugin
- **Marketplace configuration schema** (`schemas/marketplace.schema.json`)
- Marketplace validation in comprehensive validator (`scripts/validate-plugins.mjs`)
- Marketplace validation tests (`tests/test-validator-cli.mjs`)
- Sample marketplace configuration
- **Skill validation optimization** - `validateSkill` returns frontmatter to eliminate redundant file reads in main validation loop
- **Comprehensive component validation** - Main validation loop now validates all plugin components (agents, hooks, commands, rules) with schema-based validation and detailed error reporting
- **Hook script file existence validation** - `validateHooks` now checks if script files referenced in hooks.json exist on disk, reports errors with specific file paths

### Changed
- Comprehensive validator accepts target directory argument
- Comprehensive validator includes `--test` and `--typecheck` flags
- CI workflow broadened paths to cover all relevant file types
- CI workflow uses `npm ci` for reproducible installs
- Validator CLI validates all plugin components (skills, agents, commands, hooks, mcpServers, rules, script packages)
- Skill schema requires name to match folder and enforces lowercase/hyphen pattern
- Agent schema requires name to match folder and enforces lowercase/hyphen pattern
- Command schema requires name to match folder and enforces lowercase/hyphen pattern
- Rule schema requires name to match folder and enforces lowercase/hyphen pattern
- **Main validation loop uses returned frontmatter from validateSkill for script package validation**
- **Main validation loop now validates all component types with proper error reporting**

### Fixed
- Validator now properly checks path existence for all component fields
- Validator validates variable placeholders in mcp.json against declared variables
- Skill frontmatter validation uses JSON schema instead of basic checks
- Agent frontmatter validation uses JSON schema instead of basic checks
- Command validation uses JSON schema instead of basic checks
- Rule validation uses JSON schema instead of basic checks
- Script package validation runs test and typecheck commands when flags provided
- Hook script validation now catches missing script files at validation time

### Security
- Pinned dependencies in package-lock.json for reproducible builds
- GitHub Actions workflow uses `npm ci` instead of `npm install`
