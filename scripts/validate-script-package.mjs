import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');
const schemaPath = path.resolve(defaultRootDir, 'schemas/script-package.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

function validateScriptPackage(packageJsonPath, expectedDirName = null) {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] };
  }

  const valid = validate(pkg);
  let errors = valid ? [] : (validate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message }));

  return { valid: errors.length === 0, errors, pkg };
}

function runScript(packageDir, scriptName, scriptCommand) {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', scriptCommand], {
      cwd: packageDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: err.message });
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: -1, stdout, stderr: 'Timeout after 60s' });
    }, 60000);
  });
}

async function validateAndRunScriptPackage(packageJsonPath, options = {}) {
  const { runTests = false, runTypecheck = false, expectedDirName = null } = options;
  const packageDir = path.dirname(packageJsonPath);
  const result = validateScriptPackage(packageJsonPath, expectedDirName);
  
  if (!result.valid) {
    return result;
  }

  const { pkg } = result;
  const runResults = {};

  if (runTests && pkg.scripts?.test) {
    const testResult = await runScript(packageDir, 'test', pkg.scripts.test);
    runResults.test = testResult;
    if (testResult.code !== 0) {
      result.valid = false;
      result.errors.push({
        instancePath: '/scripts/test',
        message: `Test command failed (exit code ${testResult.code}): ${testResult.stderr || testResult.stdout}`
      });
    }
  }

  if (runTypecheck && pkg.scripts?.typecheck) {
    const typecheckResult = await runScript(packageDir, 'typecheck', pkg.scripts.typecheck);
    runResults.typecheck = typecheckResult;
    if (typecheckResult.code !== 0) {
      result.valid = false;
      result.errors.push({
        instancePath: '/scripts/typecheck',
        message: `Typecheck command failed (exit code ${typecheckResult.code}): ${typecheckResult.stderr || typecheckResult.stdout}`
      });
    }
  }

  result.runResults = runResults;
  return result;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const packageJsonPath = process.argv[2];
  const runTests = process.argv.includes('--test');
  const runTypecheck = process.argv.includes('--typecheck');

  if (!packageJsonPath) {
    console.error('Usage: node validate-script-package.mjs <package.json> [--test] [--typecheck]');
    process.exit(1);
  }

  const result = await validateAndRunScriptPackage(packageJsonPath, { runTests, runTypecheck });
  
  if (result.valid) {
    console.log(`✓ ${path.relative(process.cwd(), packageJsonPath)}`);
    process.exit(0);
  } else {
    console.error(`✗ ${path.relative(process.cwd(), packageJsonPath)}`);
    for (const err of result.errors) {
      console.error(`  ${err.instancePath || '/'}: ${err.message}`);
    }
    process.exit(1);
  }
}

export { validateScriptPackage, validateAndRunScriptPackage, runScript };
