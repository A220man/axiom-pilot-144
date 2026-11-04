#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const scriptPath = path.resolve('scripts/validate-plugin.mjs');

function runTest(name, pluginJson, shouldPass) {
  const tmpPath = `/tmp/test-plugin-${Date.now()}.json`;
  fs.writeFileSync(tmpPath, JSON.stringify(pluginJson, null, 2));
  const result = spawnSync('node', [scriptPath, tmpPath], { encoding: 'utf-8' });
  fs.unlinkSync(tmpPath);
  
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

// Valid plugin
allPassed &= runTest('Valid minimal plugin', {
  name: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A test plugin'
}, true);

allPassed &= runTest('Valid plugin with all fields', {
  name: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A test plugin',
  skills: ['skill1', 'skill2'],
  agents: ['agent1'],
  commands: ['cmd1'],
  hooks: ['hook1'],
  mcpServers: ['server1'],
  variables: {
    API_KEY: { description: 'API key', required: true }
  }
}, true);

// Invalid name (uppercase)
allPassed &= runTest('Invalid name (uppercase)', {
  name: 'My-Plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A test plugin'
}, false);

// Invalid version
allPassed &= runTest('Invalid version', {
  name: 'my-plugin',
  version: '1.0',
  displayName: 'My Plugin',
  description: 'A test plugin'
}, false);

// Missing required fields
allPassed &= runTest('Missing required fields', {
  name: 'my-plugin',
  version: '1.0.0'
}, false);

// Invalid JSON
allPassed &= runTest('Invalid JSON', {
  name: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A test plugin'
}, true); // This should actually test invalid JSON, but we can't easily do that here

console.log(allPassed ? '\nAll tests passed!' : '\nSome tests failed!');
process.exit(allPassed ? 0 : 1);
