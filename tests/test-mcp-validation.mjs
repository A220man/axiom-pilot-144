#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const scriptPath = path.resolve('scripts/validate-mcp.mjs');
const pluginPath = path.resolve('sample-plugin/.cursor-plugin/plugin.json');

function runTest(name, mcpJson, pluginVariables, shouldPass) {
  const tmpPath = `/tmp/test-mcp-${Date.now()}-${Math.random()}.json`;
  fs.writeFileSync(tmpPath, JSON.stringify(mcpJson, null, 2));
  const result = spawnSync('node', [scriptPath, tmpPath, pluginPath], { encoding: 'utf-8' });
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

// Valid minimal MCP
allPassed &= runTest('Valid minimal MCP', {
  name: 'test-server',
  command: 'node',
  args: ['server.js']
}, {}, true);

// Valid MCP with args and env
allPassed &= runTest('Valid MCP with args and env', {
  name: 'test-server',
  command: 'node',
  args: ['server.js', '--port', '3000'],
  env: { NODE_ENV: 'production' }
}, {}, true);

// Valid MCP with variables referencing plugin variables
allPassed &= runTest('Valid MCP with plugin variable reference', {
  name: 'test-server',
  command: 'node',
  args: ['server.js', '--api-key', '${API_KEY}']
}, { API_KEY: { description: 'API key', required: true } }, true);

// Valid MCP with own variables
allPassed &= runTest('Valid MCP with own variables', {
  name: 'test-server',
  command: 'node',
  args: ['server.js', '--token', '${TOKEN}'],
  variables: [
    { name: 'TOKEN', description: 'Auth token', required: true }
  ]
}, {}, true);

// Valid MCP with variable default
allPassed &= runTest('Valid MCP with variable default', {
  name: 'test-server',
  command: 'node',
  args: ['server.js', '--port', '${PORT}'],
  variables: [
    { name: 'PORT', description: 'Server port', default: '3000', required: false }
  ]
}, {}, true);

// Invalid: missing required name
allPassed &= runTest('Invalid: missing required name', {
  command: 'node',
  args: ['server.js']
}, {}, false);

// Invalid: missing required command
allPassed &= runTest('Invalid: missing required command', {
  name: 'test-server'
}, {}, false);

// Invalid: undefined variable placeholder (not in plugin or mcp.json)
allPassed &= runTest('Invalid: undefined variable placeholder', {
  name: 'test-server',
  command: 'node',
  args: ['server.js', '--key', '${UNDEFINED_VAR}']
}, {}, false);

// Invalid: variable name pattern in mcp.json variables
allPassed &= runTest('Invalid: variable name pattern in mcp.json variables', {
  name: 'test-server',
  command: 'node',
  args: ['server.js'],
  variables: [
    { name: 'invalid-name', description: 'Invalid', required: true }
  ]
}, {}, false);

console.log(allPassed ? '\nAll tests passed!' : '\nSome tests failed!');
process.exit(allPassed ? 0 : 1);
