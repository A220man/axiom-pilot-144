#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const scriptPath = path.resolve('scripts/validate-plugins.mjs');

function runTest(name, pluginJson, extraFiles, shouldPass, envVars = {}) {
  const tmpDir = `/tmp/test-validator-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  
  // Create .cursor-plugin directory
  const pluginDir = path.join(tmpDir, '.cursor-plugin');
  fs.mkdirSync(pluginDir, { recursive: true });
  
  // Write plugin.json
  fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2));
  
  // Write extra files
  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fullPath = path.join(pluginDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  
  const env = { ...process.env, ...envVars };
  const result = spawnSync('node', [scriptPath], { 
    encoding: 'utf-8', 
    cwd: tmpDir,
    env 
  });
  
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

// Valid plugin with skill, agent, hook, mcp
allPassed &= runTest('Valid plugin with all components', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
  agents: ['test-agent'],
  hooks: ['test-hook'],
  mcpServers: ['test-server'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'test-agent/test-agent.md': `---\nname: test-agent\ndescription: A test agent\n---\n`,
  'test-hook/hooks.json': JSON.stringify({
    events: [
      { event: 'on-save', script: 'format.js' }
    ]
  }, null, 2),
  'test-hook/format.js': 'console.log("formatting...");\n',
  'test-server/mcp.json': JSON.stringify({
    name: 'test-server',
    command: 'node',
    args: ['server.js', '--api-key', '${API_KEY}']
  }, null, 2)
}, true, { API_KEY: 'test-key' });
// Valid plugin with logo
allPassed &= runTest('Valid plugin with logo', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
  agents: ['test-agent'],
  hooks: ['test-hook'],
  mcpServers: ['test-server'],
  logo: 'logo.png',
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'test-agent/test-agent.md': `---\nname: test-agent\ndescription: A test agent\n---\n`,
  'test-hook/hooks.json': JSON.stringify({
    events: [
      { event: 'on-save', script: 'format.js' }
    ]
  }, null, 2),
  'test-hook/format.js': 'console.log("formatting...");\n',
  'test-server/mcp.json': JSON.stringify({
    name: 'test-server',
    command: 'node',
    args: ['server.js', '--api-key', '${API_KEY}']
  }, null, 2),
  'logo.png': 'fake logo content'
}, true, { API_KEY: 'test-key' });

// Invalid logo path (file doesn't exist)
allPassed &= runTest('Invalid logo path', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
  logo: 'nonexistent.png',
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid skill name (doesn't match folder)
allPassed &= runTest('Invalid skill name mismatch', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-skill/SKILL.md': `---\nname: other-skill\ndescription: A test skill\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid skill missing frontmatter
allPassed &= runTest('Invalid skill missing frontmatter', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-skill/SKILL.md': `# No frontmatter here\n`
}, false, { API_KEY: 'test-key' });

// Invalid agent missing name
allPassed &= runTest('Invalid agent missing name', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\ndescription: A test agent\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid agent name pattern (uppercase)
allPassed &= runTest('Invalid agent name pattern (uppercase)', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\nname: TestAgent\ndescription: A test agent\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid agent name mismatch with folder
allPassed &= runTest('Invalid agent name mismatch with folder', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\nname: other-agent\ndescription: A test agent\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid agent description too long
allPassed &= runTest('Invalid agent description too long', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\nname: test-agent\ndescription: ${'a'.repeat(1025)}\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid agent color format
allPassed &= runTest('Invalid agent color format', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\nname: test-agent\ndescription: A test agent\ncolor: "invalid-color"\n---\n`
}, false, { API_KEY: 'test-key' });

// Valid agent with all optional fields
allPassed &= runTest('Valid agent with all optional fields', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  agents: ['test-agent'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-agent/test-agent.md': `---\nname: test-agent\ndescription: A test agent\nicon: "bot"\ncolor: "#ff0000"\nmetadata:\n  cursor-display-name: "Test Agent"\n---\n`
}, true, { API_KEY: 'test-key' });

// Invalid hooks.json missing events array
allPassed &= runTest('Invalid hooks.json missing events', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  hooks: ['test-hook'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-hook/hooks.json': JSON.stringify({}, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid hooks.json missing event field
allPassed &= runTest('Invalid hooks.json missing event', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  hooks: ['test-hook'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-hook/hooks.json': JSON.stringify({
    events: [
      { script: 'format.js' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid hooks.json missing script field
allPassed &= runTest('Invalid hooks.json missing script', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  hooks: ['test-hook'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-hook/hooks.json': JSON.stringify({
    events: [
      { event: 'on-save' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid hooks.json with additional properties (schema has additionalProperties: false)
allPassed &= runTest('Invalid hooks.json additional properties', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  hooks: ['test-hook'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-hook/hooks.json': JSON.stringify({
    events: [
      { event: 'on-save', script: 'format.js' }
    ],
    invalidProperty: 'should not be allowed'
  }, null, 2),
  'test-hook/format.js': 'console.log("formatting...");'
}, false, { API_KEY: 'test-key' });

// Invalid command.json missing required fields
allPassed &= runTest('Invalid command.json missing required fields', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({}, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid command name pattern (uppercase)
allPassed &= runTest('Invalid command name pattern (uppercase)', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'TestCommand',
    description: 'A test command',
    script: 'run.js'
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid command name mismatch with folder
allPassed &= runTest('Invalid command name mismatch with folder', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'other-command',
    description: 'A test command',
    script: 'run.js'
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid command description too long
allPassed &= runTest('Invalid command description too long', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'test-command',
    description: 'a'.repeat(1025),
    script: 'run.js'
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid command color format
allPassed &= runTest('Invalid command color format', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'test-command',
    description: 'A test command',
    script: 'run.js',
    color: 'invalid-color'
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Valid command with all optional fields
allPassed &= runTest('Valid command with all optional fields', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'test-command',
    description: 'A test command',
    script: 'run.js',
    arguments: [
      { name: 'input', description: 'Input file', type: 'string', required: true },
      { name: 'output', description: 'Output file', type: 'string', required: false, default: 'out.txt' }
    ],
    icon: 'terminal',
    color: '#00ff00',
    metadata: {
      'cursor-display-name': 'Test Command'
    }
  }, null, 2)
}, true, { API_KEY: 'test-key' });

// Invalid command argument name pattern
allPassed &= runTest('Invalid command argument name pattern', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'test-command',
    description: 'A test command',
    script: 'run.js',
    arguments: [
      { name: '1invalid', description: 'Invalid arg name', type: 'string', required: true }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid command argument type
allPassed &= runTest('Invalid command argument type', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-command/command.json': JSON.stringify({
    name: 'test-command',
    description: 'A test command',
    script: 'run.js',
    arguments: [
      { name: 'input', description: 'Input file', type: 'invalid-type', required: true }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Missing command.json file
allPassed &= runTest('Missing command.json file', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  commands: ['test-command'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  // No command.json file
}, false, { API_KEY: 'test-key' });

// Valid plugin with rules
allPassed &= runTest('Valid plugin with rules', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ],
    priority: 50
  }, null, 2)
}, true, { API_KEY: 'test-key' });

// Invalid rule missing required fields
allPassed &= runTest('Invalid rule.json missing required fields', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({}, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule name pattern (uppercase)
allPassed &= runTest('Invalid rule name pattern (uppercase)', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'TestRule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule name mismatch with folder
allPassed &= runTest('Invalid rule name mismatch with folder', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'other-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule description too long
allPassed &= runTest('Invalid rule description too long', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'a'.repeat(1025),
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule condition type
allPassed &= runTest('Invalid rule condition type', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'invalid_type', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule action type
allPassed &= runTest('Invalid rule action type', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'invalid_action', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule priority out of range
allPassed &= runTest('Invalid rule priority out of range', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ],
    priority: 150
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Valid rule with all optional fields
allPassed &= runTest('Valid rule with all optional fields', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' },
      { type: 'language', pattern: 'typescript' },
      { type: 'always', pattern: '' }
    ],
    actions: [
      { type: 'add_context', content: 'Context for JS files' },
      { type: 'run_command', command: 'echo hello' },
      { type: 'suggest', message: 'Consider using TypeScript' }
    ],
    priority: 75,
    metadata: {
      'cursor-display-name': 'Test Rule'
    }
  }, null, 2)
}, true, { API_KEY: 'test-key' });

// Missing rule file
allPassed &= runTest('Missing rule file', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  // No rule.mdc file
}, false, { API_KEY: 'test-key' });

// Invalid rule conditions empty
allPassed &= runTest('Invalid rule conditions empty', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [],
    actions: [
      { type: 'add_context', content: 'JavaScript file detected' }
    ]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid rule actions empty
allPassed &= runTest('Invalid rule actions empty', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  rules: ['test-rule'],
  variables: { API_KEY: { description: 'API key', required: true } }
}, {
  'test-rule/rule.mdc': JSON.stringify({
    name: 'test-rule',
    description: 'A test rule',
    conditions: [
      { type: 'file_pattern', pattern: '*.js' }
    ],
    actions: []
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Valid marketplace.json matching plugin
allPassed &= runTest('Valid marketplace.json matching plugin', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'test-plugin',
      version: '1.0.0',
      path: '.',
      displayName: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/test-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, true, { API_KEY: 'test-key' });

// Invalid marketplace.json version mismatch
allPassed &= runTest('Invalid marketplace.json version mismatch', {
  name: 'test-plugin',
  version: '2.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'test-plugin',
      version: '1.0.0',
      path: '.',
      displayName: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/test-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid marketplace.json plugin not found
allPassed &= runTest('Invalid marketplace.json plugin not found', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'other-plugin',
      version: '1.0.0',
      path: '.',
      displayName: 'Other Plugin',
      description: 'Another plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/other-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Invalid marketplace.json path does not exist
allPassed &= runTest('Invalid marketplace.json path does not exist', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'test-plugin',
      version: '1.0.0',
      path: 'nonexistent',
      displayName: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/test-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Plugin not listed in marketplace.json
allPassed &= runTest('Plugin not listed in marketplace.json', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'other-plugin',
      version: '1.0.0',
      path: '.',
      displayName: 'Other Plugin',
      description: 'Another plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/other-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Marketplace.json schema validation (invalid name pattern)
allPassed &= runTest('Marketplace.json schema validation (invalid name pattern)', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  skills: ['test-skill'],
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`,
  'marketplace.json': JSON.stringify({
    plugins: [{
      name: 'Test-Plugin',
      version: '1.0.0',
      path: '.',
      displayName: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author',
      repository: 'https://github.com/example/test-plugin',
      tags: ['test'],
      license: 'MIT'
    }]
  }, null, 2)
}, false, { API_KEY: 'test-key' });

// Valid skill with scripts field referencing existing script package
allPassed &= runTest('Valid skill with scripts field', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'Test plugin',
  skills: ['test-skill']
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\nscripts:\n  - "scripts"\n---\n`,
  'test-skill/scripts/package.json': JSON.stringify({
    name: 'test-skill',
    version: '1.0.0',
    description: 'Script package for test skill',
    scripts: { test: 'echo test', typecheck: 'echo typecheck' },
    private: true
  }, null, 2)
}, true, { API_KEY: 'test-key' });

// Invalid skill with scripts field referencing non-existent script package
allPassed &= runTest('Invalid skill with scripts field (non-existent)', {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  skills: ['test-skill']
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\nscripts:\n  - "nonexistent"\n---\n`
}, false, { API_KEY: 'test-key' });

// Invalid skill with scripts field referencing directory without package.json
allPassed &= runTest('Invalid skill with scripts field (no package.json)', {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  skills: ['test-skill']
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\nscripts:\n  - "scripts"\n---\n`,
  // scripts/ directory exists but no package.json
}, false, { API_KEY: 'test-key' });

// Invalid skill with scripts field wrong name pattern
allPassed &= runTest('Invalid skill with scripts field (bad name pattern)', {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  skills: ['test-skill']
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\nscripts:\n  - "InvalidName"\n---\n`
}, false, { API_KEY: 'test-key' });

// Valid skill without scripts field (backwards compatibility)
allPassed &= runTest('Valid skill without scripts field', {
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'Test plugin',
  skills: ['test-skill']
}, {
  'test-skill/SKILL.md': `---\nname: test-skill\ndescription: A test skill\n---\n`
}, true, { API_KEY: 'test-key' });

console.log(allPassed ? '\nAll tests passed!' : '\nSome tests failed!');
process.exit(allPassed ? 0 : 1);
