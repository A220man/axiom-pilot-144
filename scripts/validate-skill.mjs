#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPath = path.resolve(rootDir, 'schemas/skill.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { frontmatter: null, body: content };
  }
  
  const yamlContent = match[1];
  const body = content.slice(match[0].length).trimStart();
  
  let frontmatter;
  try {
    frontmatter = yaml.load(yamlContent);
  } catch (e) {
    return { 
      frontmatter: null, 
      body, 
      error: `Invalid YAML in frontmatter: ${e.message}` 
    };
  }
  
  return { frontmatter, body };
}

function validateSkill(skillPath, skillDirName) {
  const content = fs.readFileSync(skillPath, 'utf-8');
  const { frontmatter, error } = parseFrontmatter(content);
  
  if (error) {
    return { 
      valid: false, 
      errors: [{ instancePath: '', message: error }] 
    };
  }
  
  if (!frontmatter) {
    return { 
      valid: false, 
      errors: [{ instancePath: '', message: 'Missing frontmatter (--- ... ---)' }] 
    };
  }
  
  // Validate name matches folder name
  if (frontmatter.name && frontmatter.name !== skillDirName) {
    return {
      valid: false,
      errors: [{
        instancePath: '/name',
        message: `name "${frontmatter.name}" does not match folder name "${skillDirName}"`
      }]
    };
  }
  
  const valid = validate(frontmatter);
  return { valid, errors: validate.errors, frontmatter };
}

const skillPath = process.argv[2];
if (!skillPath) {
  console.error('Usage: validate-skill.mjs <SKILL.md path>');
  process.exit(1);
}

const skillDirName = path.basename(path.dirname(skillPath));
const result = validateSkill(skillPath, skillDirName);

if (result.valid) {
  console.log(`✓ ${skillPath} is valid`);
  process.exit(0);
} else {
  console.error(`✗ ${skillPath} is invalid:`);
  for (const err of result.errors) {
    console.error(`  ${err.instancePath || '/'}: ${err.message}`);
  }
  process.exit(1);
}
