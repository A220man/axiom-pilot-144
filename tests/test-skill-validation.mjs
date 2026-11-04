#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const scriptPath = path.resolve('scripts/validate-skill.mjs');

function runTest(name, skillContent, folderName, shouldPass) {
  const tmpDir = `/tmp/test-skill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  const skillPath = path.join(tmpDir, folderName, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, skillContent);
  
  const result = spawnSync('node', [scriptPath, skillPath], { encoding: 'utf-8' });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  
  const passed = (result.status === 0) === shouldPass;
  console.log(`${passed ? '✓' : '✗'} ${name}`);
  if (!passed) {
    console.log(`  Expected: ${shouldPass ? 'pass' : 'fail'}, Got: ${result.status === 0 ? 'pass' : 'fail'}`);
    console.log(`  stdout: ${result.stdout}`);
    console.log(`  stderr: ${result.stderr}`);
  }
  return passed;
}

let allPassed = true;

// Valid skill
allPassed &= runTest('Valid minimal skill', `---\nname: test-skill\ndescription: A test skill\n---\n`, 'test-skill', true);

allPassed &= runTest('Valid skill with all fields', `---\nname: test-skill\ndescription: A test skill\npaths:\n  - "*.js"\n  - "*.ts"\ndisable-model-invocation: false\nicon: code\ncolor: "#007acc"\nmetadata:\n  cursor-display-name: "Test Skill"\n---\n`, 'test-skill', true);

// Invalid name (uppercase)
allPassed &= runTest('Invalid name (uppercase)', `---\nname: Test-Skill\ndescription: A test skill\n---\n`, 'test-skill', false);

// Invalid name (doesn't match folder)
allPassed &= runTest('Name mismatch folder', `---\nname: other-skill\ndescription: A test skill\n---\n`, 'test-skill', false);

// Invalid color format
allPassed &= runTest('Invalid color', `---\nname: test-skill\ndescription: A test skill\ncolor: "red"\n---\n`, 'test-skill', false);

// Missing required fields
allPassed &= runTest('Missing name', `---\ndescription: A test skill\n---\n`, 'test-skill', false);

allPassed &= runTest('Missing description', `---\nname: test-skill\n---\n`, 'test-skill', false);

// Missing frontmatter
allPassed &= runTest('Missing frontmatter', `# No frontmatter here\n`, 'test-skill', false);

console.log(allPassed ? '\nAll tests passed!' : '\nSome tests failed!');
process.exit(allPassed ? 0 : 1);
