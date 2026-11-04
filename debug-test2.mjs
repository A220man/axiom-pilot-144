import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const tmpDir = `/tmp/test-validator-debug2-${Date.now()}`;
fs.mkdirSync(tmpDir, { recursive: true });

// Create .cursor-plugin directory
const pluginDir = path.join(tmpDir, '.cursor-plugin');
fs.mkdirSync(pluginDir, { recursive: true });

// Write plugin.json
const pluginJson = {
  name: "test-plugin",
  version: "1.0.0",
  displayName: "Test Plugin",
  description: "A test plugin",
  skills: ["test-skill"]
};
fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2));

// Write skill with scripts field
const skillDir = path.join(pluginDir, 'test-skill');
fs.mkdirSync(skillDir, { recursive: true });
fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: test-skill\ndescription: A test skill\nscripts:\n  - "scripts"\n---\n`);

// Write script package
const scriptsDir = path.join(skillDir, 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });
fs.writeFileSync(path.join(scriptsDir, 'package.json'), JSON.stringify({
  name: 'test-skill',
  version: '1.0.0',
  description: 'Script package for test skill',
  scripts: { test: 'echo test', typecheck: 'echo typecheck' },
  private: true
}, null, 2));

const scriptPath = path.resolve('scripts/validate-plugins.mjs');
const result = spawnSync('node', [scriptPath], { encoding: 'utf-8', cwd: tmpDir });
console.log('stdout:', result.stdout);
console.log('stderr:', result.stderr);
console.log('exit code:', result.status);

fs.rmSync(tmpDir, { recursive: true, force: true });
