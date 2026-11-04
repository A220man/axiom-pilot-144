#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const schemaPath = path.resolve(__dirname, '../schemas/rule.schema.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const rulePath = process.argv[2];
if (!rulePath) {
  console.error('Usage: node validate-rule.mjs <path-to-rule.json>');
  process.exit(1);
}

const absolutePath = path.resolve(rulePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`Rule file not found: ${absolutePath}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf-8');
let config;
try {
  config = JSON.parse(content);
} catch (e) {
  console.error(`Invalid JSON in ${absolutePath}: ${e.message}`);
  process.exit(1);
}

const valid = validate(config);
if (!valid) {
  console.error(`Validation failed for ${absolutePath}:`);
  for (const error of validate.errors || []) {
    console.error(`  ${error.instancePath}: ${error.message}`);
  }
  process.exit(1);
}

console.log(`✓ ${absolutePath} is valid`);
process.exit(0);
