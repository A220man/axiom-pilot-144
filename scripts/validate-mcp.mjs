#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPath = path.resolve(rootDir, 'schemas/mcp.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

function extractPlaceholders(str) {
  const placeholderRegex = /\$\{([A-Z_][A-Z0-9_]*)\}/g;
  const placeholders = new Set();
  let match;
  while ((match = placeholderRegex.exec(str)) !== null) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function collectPlaceholders(obj, placeholders = new Set()) {
  if (typeof obj === 'string') {
    const found = extractPlaceholders(obj);
    for (const p of found) placeholders.add(p);
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectPlaceholders(item, placeholders);
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) collectPlaceholders(value, placeholders);
  }
  return placeholders;
}

function validateMcp(mcpPath, pluginVariables = {}) {
  const content = fs.readFileSync(mcpPath, 'utf-8');
  let mcp;
  try {
    mcp = JSON.parse(content);
  } catch (e) {
    return { 
      valid: false, 
      errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] 
    };
  }

  // Schema validation
  const valid = validate(mcp);
  const errors = validate.errors ? [...validate.errors] : [];

  // Check placeholder variables
  if (mcp && !errors.length) {
    const placeholders = collectPlaceholders(mcp);
    const declaredVars = new Set([
      ...Object.keys(pluginVariables),
      ...(mcp.variables?.map(v => v.name) || [])
    ]);
    
    for (const placeholder of placeholders) {
      if (!declaredVars.has(placeholder)) {
        errors.push({
          instancePath: '',
          message: `Undefined variable placeholder: ${placeholder} (not declared in plugin variables or mcp.json variables)`
        });
      }
    }
  }

  return { valid: valid && errors.length === 0, errors, mcp };
}

const mcpPath = process.argv[2];
if (!mcpPath) {
  console.error('Usage: validate-mcp.mjs <mcp.json path> [plugin.json path]');
  process.exit(1);
}

let pluginVariables = {};
const pluginPath = process.argv[3];
if (pluginPath && fs.existsSync(pluginPath)) {
  const pluginContent = fs.readFileSync(pluginPath, 'utf-8');
  try {
    const plugin = JSON.parse(pluginContent);
    pluginVariables = plugin.variables || {};
  } catch {
    // Ignore plugin parsing errors
  }
}

const result = validateMcp(mcpPath, pluginVariables);

if (result.valid) {
  console.log(`✓ ${mcpPath} is valid`);
  process.exit(0);
} else {
  console.error(`✗ ${mcpPath} is invalid:`);
  for (const err of result.errors) {
    console.error(`  ${err.instancePath || '/'}: ${err.message}`);
  }
  process.exit(1);
}