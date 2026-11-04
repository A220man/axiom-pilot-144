#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPath = path.resolve('schemas/plugin.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

function validatePlugin(pluginPath) {
  const content = fs.readFileSync(pluginPath, 'utf-8');
  let plugin;
  try {
    plugin = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ message: `Invalid JSON: ${e.message}` }] };
  }
  const valid = validate(plugin);
  return { valid, errors: validate.errors };
}

const pluginPath = process.argv[2];
if (!pluginPath) {
  console.error('Usage: validate-plugin.mjs <plugin.json path>');
  process.exit(1);
}

const result = validatePlugin(pluginPath);
if (result.valid) {
  console.log(`✓ ${pluginPath} is valid`);
  process.exit(0);
} else {
  console.error(`✗ ${pluginPath} is invalid:`);
  for (const err of result.errors) {
    console.error(`  ${err.instancePath || '/'}: ${err.message}`);
  }
  process.exit(1);
}
