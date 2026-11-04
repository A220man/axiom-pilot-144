import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateScriptPackage, validateAndRunScriptPackage } from '../scripts/validate-script-package.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testRoot = path.resolve(__dirname, '..', 'test-fixtures', 'script-packages');

// Ensure test fixtures directory exists
fs.mkdirSync(testRoot, { recursive: true });

function createTestFixture(name, packageJson) {
  const dir = path.join(testRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));
  return path.join(dir, 'package.json');
}

function cleanup() {
  if (fs.existsSync(testRoot)) {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

// Test 1: Valid minimal script package
const validMinimal = createTestFixture('valid-minimal', {
  name: 'test-package',
  version: '1.0.0',
  scripts: {
    test: 'bun test',
    typecheck: 'tsc --noEmit'
  }
});

const result1 = validateScriptPackage(validMinimal);
console.assert(result1.valid === true, 'Test 1 failed: Valid minimal script package should pass');
console.log('✓ Valid minimal script package');

// Test 2: Valid script package with all fields
const validFull = createTestFixture('valid-full', {
  name: 'test-package',
  version: '1.0.0',
  description: 'A test script package',
  scripts: {
    test: 'bun test',
    typecheck: 'tsc --noEmit',
    build: 'tsc'
  },
  dependencies: {
    'some-dep': '^1.0.0'
  },
  devDependencies: {
    'typescript': '^5.0.0',
    'bun-types': 'latest'
  },
  private: true
});

const result2 = validateScriptPackage(validFull);
console.assert(result2.valid === true, 'Test 2 failed: Valid full script package should pass');
console.log('✓ Valid script package with all fields');

// Test 3: Invalid name (uppercase)
const invalidName = createTestFixture('invalid-name', {
  name: 'Test-Package',
  version: '1.0.0',
  scripts: {
    test: 'bun test',
    typecheck: 'tsc --noEmit'
  }
});

const result3 = validateScriptPackage(invalidName);
console.assert(result3.valid === false, 'Test 3 failed: Uppercase name should fail');
console.assert(result3.errors.some(e => e.instancePath === '/name'), 'Test 3 failed: Should have name error');
console.log('✓ Invalid name (uppercase)');

// Test 4: Invalid version
const invalidVersion = createTestFixture('invalid-version', {
  name: 'test-package',
  version: '1.0',
  scripts: {
    test: 'bun test',
    typecheck: 'tsc --noEmit'
  }
});

const result4 = validateScriptPackage(invalidVersion);
console.assert(result4.valid === false, 'Test 4 failed: Invalid version should fail');
console.assert(result4.errors.some(e => e.instancePath === '/version'), 'Test 4 failed: Should have version error');
console.log('✓ Invalid version');

// Test 5: Missing required scripts
const missingScripts = createTestFixture('missing-scripts', {
  name: 'test-package',
  version: '1.0.0',
  scripts: {
    test: 'bun test'
    // missing typecheck
  }
});

const result5 = validateScriptPackage(missingScripts);
console.assert(result5.valid === false, 'Test 5 failed: Missing typecheck script should fail');
console.assert(result5.errors.some(e => e.instancePath === '/scripts' || e.message.includes('typecheck')), 'Test 5 failed: Should have scripts error');
console.log('✓ Missing required scripts (typecheck)');

// Test 6: Missing scripts object entirely
const noScripts = createTestFixture('no-scripts', {
  name: 'test-package',
  version: '1.0.0'
});

const result6 = validateScriptPackage(noScripts);
console.assert(result6.valid === false, 'Test 6 failed: Missing scripts object should fail');
console.log('✓ Missing scripts object');

// Test 7: Invalid JSON
const invalidJsonPath = path.join(testRoot, 'invalid-json', 'package.json');
fs.mkdirSync(path.dirname(invalidJsonPath), { recursive: true });
fs.writeFileSync(invalidJsonPath, '{ invalid json }');

const result7 = validateScriptPackage(invalidJsonPath);
console.assert(result7.valid === false, 'Test 7 failed: Invalid JSON should fail');
console.assert(result7.errors.some(e => e.message.includes('Invalid JSON')), 'Test 7 failed: Should have JSON error');
console.log('✓ Invalid JSON');

// Test 8: Script package with empty test script
const emptyTestScript = createTestFixture('empty-test-script', {
  name: 'test-package',
  version: '1.0.0',
  scripts: {
    test: '',
    typecheck: 'tsc --noEmit'
  }
});

const result8 = validateScriptPackage(emptyTestScript);
console.assert(result8.valid === true, 'Test 8 failed: Empty test script string should pass schema validation');
console.log('✓ Empty test script (schema allows)');

cleanup();

console.log('\nAll schema validation tests passed!');
