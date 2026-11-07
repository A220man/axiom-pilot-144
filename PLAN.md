# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

hooks-schema-validation

## Roadmap

### plugin-manifest-schema — Plugin manifest JSON schema and validation

Status: done

Acceptance:
- plugin.schema.json exists and validates plugin.json
- Validates name, version, displayName, description, skills, agents, commands, hooks, mcpServers, variables
- Name pattern enforced: lowercase letters, numbers, hyphens, dots only
- Version follows semantic versioning
- Path existence checking for all component fields
- Variable requirement validation

Implementation: `schemas/plugin.schema.json`, `scripts/validate-plugin.mjs`, `scripts/validate-plugins.mjs`, `tests/test-plugin-validation.mjs`

Tests: `tests/test-plugin-validation.mjs`

### skill-schema — Skill frontmatter schema and validation

Status: done

Acceptance:
- skill.schema.json exists for SKILL.md frontmatter validation
- Validates name (lowercase, hyphens, matches folder), description, paths, disable-model-invocation, icon, color, metadata
- Validator uses schema for skill frontmatter validation
- Name must match parent folder name
- Color must be valid hex format

Implementation: `schemas/skill.schema.json`, `scripts/validate-skill.mjs`, `scripts/validate-plugins.mjs (updated)`, `tests/test-skill-validation.mjs`, `sample-plugin/.cursor-plugin/sample-skill/SKILL.md`

Tests: `tests/test-skill-validation.mjs`

### ci-workflow — CI workflow for plugin validation

Status: done

Acceptance:
- GitHub Actions workflow validates on PR and push to main
- package.json with pinned dependencies and package-lock.json
- Validates all plugin components including skills, agents, hooks, mcpServers, commands, rules, script packages
- Runs script package tests and typecheck in separate job

Implementation: `.github/workflows/validate-plugins.yml`, `package.json`, `package-lock.json`

Tests: `N/A (CI workflow)`

### mcp-schema — MCP server configuration schema and validation

Status: done

Acceptance:
- mcp.schema.json exists for mcp.json validation
- Validates name, command, args, env, variables
- Variable placeholder validation against plugin variables and mcp.json declared variables
- Variable name pattern enforced (uppercase with underscores)
- Required fields: name, command
- Path existence checking for mcp.json in mcpServers directories

Implementation: `schemas/mcp.schema.json`, `scripts/validate-mcp.mjs`, `scripts/validate-plugins.mjs (updated)`, `tests/test-mcp-validation.mjs`, `sample-plugin/.cursor-plugin/sample-server/mcp.json`

Tests: `tests/test-mcp-validation.mjs`

### agent-schema — Agent frontmatter schema and validation

Status: done

Acceptance:
- agent.schema.json exists for agent frontmatter validation
- Validates name (lowercase, hyphens, matches folder), description, icon, color, metadata
- Validator uses schema for agent frontmatter validation (replaces basic checks)
- Name must match parent folder name
- Color must be valid hex format

Implementation: `schemas/agent.schema.json`, `scripts/validate-plugins.mjs (updated)`, `tests/test-validator-cli.mjs (updated)`

Tests: `tests/test-validator-cli.mjs`

### plugin-validator-cli — Plugin validator CLI tool

Status: done

Acceptance:
- CLI command validates all plugin.json in repository
- Checks path existence for skills, agents, commands, hooks, mcpServers, logo
- Reports errors with file locations
- Validates SKILL.md frontmatter for all skills
- Validates agent frontmatter for all agents
- Validates hooks.json for all hooks

Implementation: `scripts/validate-plugins.mjs`, `schemas/skill.schema.json`, `schemas/agent.schema.json`, `schemas/hooks.schema.json`, `tests/test-validator-cli.mjs`

Tests: `tests/test-validator-cli.mjs`

### command-schema — Command configuration schema and validation

Status: done

Acceptance:
- command.schema.json exists for command.json validation
- Validates name (lowercase, hyphens, matches folder), description, script, arguments, icon, color, metadata
- Validator uses schema for command validation
- Name must match parent folder name
- Color must be valid hex format
- Arguments validation: name pattern, type enum, required flag, default value

Implementation: `schemas/command.schema.json`, `scripts/validate-plugins.mjs (updated)`, `tests/test-validator-cli.mjs (updated)`

Tests: `tests/test-validator-cli.mjs`

### rule-schema — Rule configuration schema and validation

Status: done

Acceptance:
- rule.schema.json exists for rule.mdc validation
- Validates name (lowercase, hyphens, matches folder), description, conditions, actions, priority, metadata
- Validator uses schema for rule validation
- Name must match parent folder name
- Conditions: type enum (file_pattern, language, always), pattern required
- Actions: type enum (add_context, run_command, suggest), content/command/message as appropriate
- Priority: integer 0-100

Implementation: `schemas/rule.schema.json`, `scripts/validate-rule.mjs`, `scripts/validate-plugins.mjs (updated)`, `tests/test-validator-cli.mjs (updated)`, `sample-plugin/.cursor-plugin/sample-rule/rule.mdc`

Tests: `tests/test-validator-cli.mjs`

### script-package-schema — Script package schema and validation

Status: done

Acceptance:
- script-package.schema.json exists for script package (package.json) validation
- Validates name, version, scripts (test, typecheck), dependencies
- Validation script detects script packages in skill directories
- Runs bun test and tsc in script packages
- Tests cover valid and invalid script packages

Implementation: `schemas/script-package.schema.json`, `scripts/validate-script-package.mjs`, `scripts/validate-plugins.mjs (updated)`, `tests/test-script-package-validation.mjs`

Tests: `tests/test-script-package-validation.mjs`

### marketplace-schema — Marketplace configuration schema and validation

Status: done

Acceptance:
- marketplace.schema.json exists for marketplace.json validation
- Validates plugins array with name, version, path, displayName, description, author, repository, icon, tags, license
- Validates all repository plugins are listed in marketplace.json
- Validates marketplace entries match plugin manifests (name, version, path)
- Validates marketplace.json schema compliance (name pattern, version semver)
- Tests cover valid and invalid marketplace configurations

Implementation: `schemas/marketplace.schema.json`, `scripts/validate-plugins.mjs (updated with validateMarketplace function)`, `tests/test-validator-cli.mjs (updated with marketplace tests)`, `sample-plugin/.cursor-plugin/marketplace.json`

Tests: `tests/test-validator-cli.mjs`

### skill-script-references — Skill script package references field

Status: done

Acceptance:
- skill.schema.json includes optional scripts field (array of strings)
- validateSkill validates scripts field references existing script packages
- Script package paths validated against plugin directory structure
- Tests cover valid and invalid script references

Implementation: `schemas/skill.schema.json (updated)`, `scripts/validate-plugins.mjs (updated validateSkill and main validation loop)`, `tests/test-validator-cli.mjs (updated with script reference tests)`, `sample-plugin/.cursor-plugin/sample-skill-with-scripts/SKILL.md (updated with scripts field)`

Tests: `tests/test-validator-cli.mjs`

### skill-validation-optimization — Skill validation optimization - return frontmatter from validateSkill

Status: done

Acceptance:
- validateSkill function returns parsed frontmatter object
- Main validation loop uses returned frontmatter instead of re-reading file
- Script package schema validation and test/typecheck execution work correctly
- No redundant file I/O operations

Implementation: `scripts/validate-plugins.mjs (updated validateSkill function and main validation loop)`

Tests: `tests/test-validator-cli.mjs (existing tests cover the functionality)`

### comprehensive-component-validation — Comprehensive component validation in main validation loop

Status: done

Acceptance:
- Main validation loop validates agents (frontmatter schema, name matching folder, required fields)
- Main validation loop validates hooks (hooks.json schema, events array with event/script/condition)
- Main validation loop validates commands (command.json schema, name matching folder, arguments validation)
- Main validation loop validates rules (rule.mdc schema, conditions/actions, priority range)
- Error reporting for all component types with file locations and specific validation errors
- All 6 test suites pass with 80+ test cases covering all component validations

Implementation: `scripts/validate-plugins.mjs (updated main validation loop)`

Tests: `tests/test-validator-cli.mjs (existing tests cover the functionality)`

### hook-script-existence-validation — Hook script file existence validation

Status: done

Acceptance:
- validateHooks function checks if script files referenced in hooks.json exist on disk
- Error reported with specific file path when script file is missing
- Test fixture updated to include required script files (format.js)
- Sample plugin hook scripts added (format.js, lint.js)
- All existing tests continue to pass

Implementation: `scripts/validate-plugins.mjs (updated validateHooks function)`, `tests/test-validator-cli.mjs (updated valid plugin test fixture)`, `sample-plugin/.cursor-plugin/sample-hook/format.js (added)`, `sample-plugin/.cursor-plugin/sample-hook/lint.js (added)`

Tests: `tests/test-validator-cli.mjs`

### hooks-schema-validation — Hooks JSON schema validation

Status: done

Acceptance:
- hooks.schema.json loaded and compiled as validator in validate-plugins.mjs
- validateHooks function uses hooksValidate for schema validation
- Schema validation rejects additional properties (additionalProperties: false)
- Runtime script file existence check preserved alongside schema validation
- Test added for additional properties rejection

Implementation: `schemas/hooks.schema.json`, `scripts/validate-plugins.mjs (added hooksValidate, updated validateHooks)`, `tests/test-validator-cli.mjs (added additional properties test)`

Tests: `tests/test-validator-cli.mjs`

