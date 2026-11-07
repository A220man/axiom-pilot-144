import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import { validateScriptPackage } from './validate-script-package.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const runTests = process.argv.includes('--test');
const runTypecheck = process.argv.includes('--typecheck');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPath = path.resolve(defaultRootDir, 'schemas/plugin.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

// Load skill schema and validator
const skillSchemaPath = path.resolve(defaultRootDir, 'schemas/skill.schema.json');
const skillSchema = JSON.parse(fs.readFileSync(skillSchemaPath, 'utf-8'));
const skillValidate = ajv.compile(skillSchema);

// Load MCP schema and validator
const mcpSchemaPath = path.resolve(defaultRootDir, 'schemas/mcp.schema.json');
const mcpSchema = JSON.parse(fs.readFileSync(mcpSchemaPath, 'utf-8'));
const mcpValidate = ajv.compile(mcpSchema);

// Load command schema and validator
const commandSchemaPath = path.resolve(defaultRootDir, 'schemas/command.schema.json');
const commandSchema = JSON.parse(fs.readFileSync(commandSchemaPath, 'utf-8'));
const commandValidate = ajv.compile(commandSchema);

// Load agent schema and validator
const agentSchemaPath = path.resolve(defaultRootDir, 'schemas/agent.schema.json');
const agentSchema = JSON.parse(fs.readFileSync(agentSchemaPath, 'utf-8'));
const agentValidate = ajv.compile(agentSchema);

// Load rule schema and validator
const ruleSchemaPath = path.resolve(defaultRootDir, 'schemas/rule.schema.json');
const ruleSchema = JSON.parse(fs.readFileSync(ruleSchemaPath, 'utf-8'));
const ruleValidate = ajv.compile(ruleSchema);

// Load hooks schema and validator
const hooksSchemaPath = path.resolve(defaultRootDir, 'schemas/hooks.schema.json');
const hooksSchema = JSON.parse(fs.readFileSync(hooksSchemaPath, 'utf-8'));
const hooksValidate = ajv.compile(hooksSchema);

// Load script package schema and validator
const scriptPackageSchemaPath = path.resolve(defaultRootDir, 'schemas/script-package.schema.json');
const scriptPackageSchema = JSON.parse(fs.readFileSync(scriptPackageSchemaPath, 'utf-8'));
const scriptPackageValidate = ajv.compile(scriptPackageSchema);

// Load marketplace schema and validator
const marketplaceSchemaPath = path.resolve(defaultRootDir, 'schemas/marketplace.schema.json');
const marketplaceSchema = JSON.parse(fs.readFileSync(marketplaceSchemaPath, 'utf-8'));
const marketplaceValidate = ajv.compile(marketplaceSchema);

const placeholderRegex = /\$\{([^}]+)\}/g;

function extractPlaceholders(str) {
  const placeholders = new Set();
  let match;
  while ((match = placeholderRegex.exec(str)) !== null) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function collectPlaceholders(obj, placeholders = new Set()) {
  if (typeof obj === 'string') {
    const found = extractPlaceholders(obj);
    for (const p of found) placeholders.add(p);
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectPlaceholders(item, placeholders);
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) collectPlaceholders(value, placeholders);
  }
  return placeholders;
}

function validateMcpConfig(mcpPath, pluginVariables = {}) {
  const content = fs.readFileSync(mcpPath, 'utf-8');
  let mcp;
  try {
    mcp = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`] };
  }

  const valid = mcpValidate(mcp);
  const errors = mcpValidate.errors ? [...mcpValidate.errors].map(e => `${e.instancePath || '/'}: ${e.message}`) : [];

  if (valid) {
    const placeholders = collectPlaceholders(mcp);
    const declaredVars = new Set([
      ...Object.keys(pluginVariables),
      ...(mcp.variables?.map(v => v.name) || [])
    ]);
    
    for (const placeholder of placeholders) {
      if (!declaredVars.has(placeholder)) {
        errors.push(`Undefined variable placeholder: ${placeholder} (not declared in plugin variables or mcp.json variables)`);
      }
    }
  }

  return { valid: valid && errors.length === 0, errors };
}

function findPluginManifests(dir) {
  const manifests = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.cursor-plugin') {
          const pluginJson = path.join(fullPath, 'plugin.json');
          if (fs.existsSync(pluginJson)) {
            manifests.push(pluginJson);
          }
        } else if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      }
    }
  }
  walk(dir);
  return manifests;
}

function validatePlugin(pluginPath) {
  const content = fs.readFileSync(pluginPath, 'utf-8');
  let plugin;
  try {
    plugin = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] };
  }
  const valid = validate(plugin);
  let errors = validate.errors ? [...validate.errors] : [];

  // Check for duplicate component names
  if (plugin.skills) errors.push(...checkDuplicates(plugin.skills, 'skills'));
  if (plugin.agents) errors.push(...checkDuplicates(plugin.agents, 'agents'));
  if (plugin.commands) errors.push(...checkDuplicates(plugin.commands, 'commands'));
  if (plugin.hooks) errors.push(...checkDuplicates(plugin.hooks, 'hooks'));
  if (plugin.rules) errors.push(...checkDuplicates(plugin.rules, 'rules'));
  if (plugin.mcpServers) errors.push(...checkDuplicates(plugin.mcpServers, 'mcpServers'));

  return { valid: errors.length === 0, errors, plugin };
}

function checkDuplicates(arr, fieldName) {
  const errors = [];
  const seen = new Set();
  for (const item of arr || []) {
    if (seen.has(item)) {
      errors.push({ instancePath: `/${fieldName}`, message: `Duplicate ${fieldName.slice(0, -1)} name: "${item}"` });
    }
    seen.add(item);
  }
  return errors;
}

function checkPaths(plugin, pluginDir) {
  const errors = [];
  const fields = ['skills', 'agents', 'commands', 'hooks', 'mcpServers', 'rules'];
  for (const field of fields) {
    if (plugin[field]) {
      for (const item of plugin[field]) {
        const itemPath = path.join(pluginDir, item);
        if (!fs.existsSync(itemPath)) {
          errors.push(`${field}/${item}: directory not found at ${itemPath}`);
        }
      }
    }
  }
  if (plugin.variables) {
    for (const [key, value] of Object.entries(plugin.variables)) {
      if (value.required && (!process.env[key] && !value.default)) {
        errors.push(`variables.${key}: required but not set and no default`);
      }
    }
  }
  return errors;
}

function validateMarketplace(marketplacePath, pluginManifests) {
  const content = fs.readFileSync(marketplacePath, 'utf-8');
  let marketplace;
  try {
    marketplace = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`] };
  }
  const valid = marketplaceValidate(marketplace);
  let errors = marketplaceValidate.errors ? [...marketplaceValidate.errors] : [];
  if (valid && marketplace.plugins) {
    // Build a map of plugin name -> manifest path
    const pluginMap = new Map();
    for (const manifestPath of pluginManifests) {
      const pluginContent = fs.readFileSync(manifestPath, 'utf-8');
      let plugin;
      try {
        plugin = JSON.parse(pluginContent);
      } catch {
        continue;
      }
      if (plugin.name) {
        pluginMap.set(plugin.name, { manifestPath, plugin });
      }
    }
    
    // Check each marketplace entry
    const listedPlugins = new Set();
    for (const entry of marketplace.plugins) {
      const pluginInfo = pluginMap.get(entry.name);
      if (!pluginInfo) {
        errors.push(`marketplace.plugins[${entry.name}]: plugin not found in repository (path: ${entry.path})`);
      } else {
        // Validate version matches
        if (pluginInfo.plugin.version !== entry.version) {
          errors.push(`marketplace.plugins[${entry.name}]: version mismatch (manifest: ${pluginInfo.plugin.version}, marketplace: ${entry.version})`);
        }
        // Validate path exists and contains the plugin
        const expectedPath = path.join(path.dirname(marketplacePath), entry.path);
        const expectedPluginJson = path.join(expectedPath, 'plugin.json');
        if (!fs.existsSync(expectedPluginJson)) {
          errors.push(`marketplace.plugins[${entry.name}]: path does not contain plugin.json (${entry.path})`);
        } else {
          // Check it's the same plugin
          const expectedContent = fs.readFileSync(expectedPluginJson, 'utf-8');
          let expectedPlugin;
          try {
            expectedPlugin = JSON.parse(expectedContent);
          } catch {
            errors.push(`marketplace.plugins[${entry.name}]: invalid JSON at path ${entry.path}`);
          }
          if (expectedPlugin && expectedPlugin.name !== entry.name) {
            errors.push(`marketplace.plugins[${entry.name}]: name mismatch at path ${entry.path} (expected ${entry.name}, found ${expectedPlugin.name})`);
          }
        }
        listedPlugins.add(entry.name);
      }
    }
    
    // Check for plugins not listed in marketplace
    for (const [name, info] of pluginMap) {
      if (!listedPlugins.has(name)) {
        errors.push(`Plugin "${name}" not listed in marketplace.json`);
      }
    }
  }
  
  return { valid: valid && errors.length === 0, errors };
}


function checkMcpConfigs(plugin, pluginDir) {
  const errors = [];
  if (plugin.mcpServers) {
    for (const server of plugin.mcpServers) {
      const serverDir = path.join(pluginDir, server);
      const mcpPath = path.join(serverDir, 'mcp.json');
      if (fs.existsSync(mcpPath)) {
        const result = validateMcpConfig(mcpPath, plugin.variables || {});
        if (!result.valid) {
          for (const err of result.errors) {
            errors.push(`${server}/mcp.json: ${err}`);
          }
        }
      } else {
        errors.push(`${server}/mcp.json: file not found at ${mcpPath}`);
      }
    }
  }
  return errors;
}

function validateSkill(skillPath, skillDirName, skillDir) {
  const content = fs.readFileSync(skillPath, 'utf-8');
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { valid: false, errors: [{ instancePath: '', message: 'Missing frontmatter (--- ... ---)' }], frontmatter: null };
  }
  const yamlContent = match[1];
  let frontmatter;
  try {
    frontmatter = yaml.load(yamlContent);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid YAML in frontmatter: ${e.message}` }], frontmatter: null };
  }
  if (frontmatter.name && frontmatter.name !== skillDirName) {
    return {
      valid: false,
      errors: [{ instancePath: '/name', message: `name "${frontmatter.name}" does not match folder name "${skillDirName}"` }],
      frontmatter
    };
  }
  const valid = skillValidate(frontmatter);
  let errors = valid ? [] : (skillValidate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message }));
  
  // Validate scripts field references
  if (frontmatter.scripts && Array.isArray(frontmatter.scripts)) {
    for (const scriptRef of frontmatter.scripts) {
      const scriptPackageDir = path.join(skillDir, scriptRef);
      const packageJsonPath = path.join(scriptPackageDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        errors.push({ instancePath: '/scripts', message: `Script package "${scriptRef}" not found at ${scriptPackageDir}/package.json` });
      }
    }
  }
  
  return { valid: errors.length === 0, errors, frontmatter };
}

function validateAgent(agentPath, agentDirName) {
  const content = fs.readFileSync(agentPath, 'utf-8');
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { valid: false, errors: [{ instancePath: '', message: 'Missing frontmatter (--- ... ---)' }] };
  }
  const yamlContent = match[1];
  let frontmatter;
  try {
    frontmatter = yaml.load(yamlContent);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid YAML in frontmatter: ${e.message}` }] };
  }
  if (frontmatter.name && frontmatter.name !== agentDirName) {
    return {
      valid: false,
      errors: [{ instancePath: '/name', message: `name "${frontmatter.name}" does not match folder name "${agentDirName}"` }]
    };
  }
  const valid = agentValidate(frontmatter);
  return { valid, errors: valid ? [] : (agentValidate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message })) };
}

function validateHooks(hooksPath) {
  const content = fs.readFileSync(hooksPath, 'utf-8');
  const hooksDir = path.dirname(hooksPath);
  let hooks;
  try {
    hooks = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] };
  }
  
  // Validate against schema
  const valid = hooksValidate(hooks);
  const errors = valid ? [] : (hooksValidate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message }));
  
  // Additional runtime check: verify script files exist
  if (valid && Array.isArray(hooks.events)) {
    for (let i = 0; i < hooks.events.length; i++) {
      const event = hooks.events[i];
      if (event.script && typeof event.script === 'string') {
        const scriptPath = path.join(hooksDir, event.script);
        if (!fs.existsSync(scriptPath)) {
          errors.push({ instancePath: `/events/${i}/script`, message: `Script file not found: ${event.script}` });
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function validateCommand(commandPath, commandDirName) {
  const content = fs.readFileSync(commandPath, 'utf-8');
  let config;
  try {
    config = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] };
  }
  if (config.name && config.name !== commandDirName) {
    return {
      valid: false,
      errors: [{ instancePath: '/name', message: `name "${config.name}" does not match folder name "${commandDirName}"` }]
    };
  }
  const valid = commandValidate(config);
  return { valid, errors: valid ? [] : (commandValidate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message })) };
}

function validateRule(rulePath, ruleDirName) {
  const content = fs.readFileSync(rulePath, 'utf-8');
  let config;
  try {
    config = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [{ instancePath: '', message: `Invalid JSON: ${e.message}` }] };
  }
  if (config.name && config.name !== ruleDirName) {
    return {
      valid: false,
      errors: [{ instancePath: '/name', message: `name "${config.name}" does not match folder name "${ruleDirName}"` }]
    };
  }
  const valid = ruleValidate(config);
  return { valid, errors: valid ? [] : (ruleValidate.errors || []).map(e => ({ instancePath: e.instancePath, message: e.message })) };
}

async function validateScriptPackageInDir(skillDir, skillName) {
  const errors = [];
  // Check for scripts/ directory with package.json
  const scriptsDir = path.join(skillDir, 'scripts');
  const packageJsonPath = path.join(scriptsDir, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const result = validateScriptPackage(packageJsonPath, skillName);
    if (!result.valid) {
      for (const err of result.errors) {
        errors.push(`${skillName}/scripts/package.json: ${err.instancePath || '/'}: ${err.message}`);
      }
    }
    
    // Optionally run tests and typecheck
    if (runTests || runTypecheck) {
      const { validateAndRunScriptPackage } = await import('./validate-script-package.mjs');
      const runResult = await validateAndRunScriptPackage(packageJsonPath, { runTests, runTypecheck, expectedDirName: skillName });
      if (!runResult.valid) {
        for (const err of runResult.errors) {
          errors.push(`${skillName}/scripts/package.json: ${err.instancePath || '/'}: ${err.message}`);
        }
      }
    }
  }
  
  return errors;
}

async function main() {
  const manifests = findPluginManifests(rootDir);
  if (manifests.length === 0) {
    console.log('No plugin manifests found.');
    process.exit(0);
  }

  // Check for marketplace.json at root
  const marketplacePath = path.join(rootDir, '.cursor-plugin', 'marketplace.json');
  const hasMarketplace = fs.existsSync(marketplacePath);

  let allValid = true;
  for (const manifest of manifests) {
    const pluginDir = path.dirname(manifest);
    const result = validatePlugin(manifest);
    const pathErrors = result.plugin ? checkPaths(result.plugin, pluginDir) : [];
    const mcpErrors = result.plugin ? checkMcpConfigs(result.plugin, pluginDir) : [];
    let skillErrors = [];
    let agentErrors = [];
    let hookErrors = [];
    let commandErrors = [];
    let ruleErrors = [];
    
    if (result.plugin && result.plugin.skills) {
      for (const skill of result.plugin.skills) {
        const skillDir = path.join(pluginDir, skill);
        const skillPath = path.join(skillDir, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const skillResult = validateSkill(skillPath, skill, skillDir);
          if (!skillResult.valid) {
            for (const err of skillResult.errors) {
              skillErrors.push(`${skill}/SKILL.md: ${err.instancePath || '/'}: ${err.message}`);
            }
          }
          
          // Validate script package in skill directory (default scripts/)
          const scriptPackageErrors = await validateScriptPackageInDir(skillDir, skill);
          skillErrors.push(...scriptPackageErrors);
          
          // Validate script packages referenced in skill's scripts field
          if (skillResult.valid && skillResult.frontmatter) {
            const frontmatter = skillResult.frontmatter;
            if (frontmatter.scripts && Array.isArray(frontmatter.scripts)) {
              for (const scriptRef of frontmatter.scripts) {
                const scriptPackageDir = path.join(skillDir, scriptRef);
                const packageJsonPath = path.join(scriptPackageDir, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                  const result = validateScriptPackage(packageJsonPath, scriptRef);
                  if (!result.valid) {
                    for (const err of result.errors) {
                      skillErrors.push(`${skill}/${scriptRef}/package.json: ${err.instancePath || '/'}: ${err.message}`);
                    }
                  }
                  
                  // Optionally run tests and typecheck
                  if (runTests || runTypecheck) {
                    const { validateAndRunScriptPackage } = await import('./validate-script-package.mjs');
                    const runResult = await validateAndRunScriptPackage(packageJsonPath, { runTests, runTypecheck, expectedDirName: scriptRef });
                    if (!runResult.valid) {
                      for (const err of runResult.errors) {
                        skillErrors.push(`${skill}/${scriptRef}/package.json: ${err.instancePath || '/'}: ${err.message}`);
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          skillErrors.push(`${skill}/SKILL.md: file not found at ${skillPath}`);
        }
      }
    }
    
    // Validate agents
    if (result.plugin && result.plugin.agents) {
      for (const agent of result.plugin.agents) {
        const agentDir = path.join(pluginDir, agent);
        const agentPath = path.join(agentDir, `${agent}.md`);
        if (fs.existsSync(agentPath)) {
          const agentResult = validateAgent(agentPath, agent);
          if (!agentResult.valid) {
            for (const err of agentResult.errors) {
              agentErrors.push(`${agent}/${agent}.md: ${err.instancePath || '/'}: ${err.message}`);
            }
          }
        } else {
          agentErrors.push(`${agent}/${agent}.md: file not found at ${agentPath}`);
        }
      }
    }
    
    // Validate hooks
    if (result.plugin && result.plugin.hooks) {
      for (const hook of result.plugin.hooks) {
        const hookDir = path.join(pluginDir, hook);
        const hooksPath = path.join(hookDir, 'hooks.json');
        if (fs.existsSync(hooksPath)) {
          const hookResult = validateHooks(hooksPath);
          if (!hookResult.valid) {
            for (const err of hookResult.errors) {
              hookErrors.push(`${hook}/hooks.json: ${err.instancePath || '/'}: ${err.message}`);
            }
          }
        } else {
          hookErrors.push(`${hook}/hooks.json: file not found at ${hooksPath}`);
        }
      }
    }
    
    // Validate commands
    if (result.plugin && result.plugin.commands) {
      for (const command of result.plugin.commands) {
        const commandDir = path.join(pluginDir, command);
        const commandPath = path.join(commandDir, 'command.json');
        if (fs.existsSync(commandPath)) {
          const commandResult = validateCommand(commandPath, command);
          if (!commandResult.valid) {
            for (const err of commandResult.errors) {
              commandErrors.push(`${command}/command.json: ${err.instancePath || '/'}: ${err.message}`);
            }
          }
        } else {
          commandErrors.push(`${command}/command.json: file not found at ${commandPath}`);
        }
      }
    }
    
    // Validate rules
    if (result.plugin && result.plugin.rules) {
      for (const rule of result.plugin.rules) {
        const ruleDir = path.join(pluginDir, rule);
        const rulePath = path.join(ruleDir, 'rule.mdc');
        if (fs.existsSync(rulePath)) {
          const ruleResult = validateRule(rulePath, rule);
          if (!ruleResult.valid) {
            for (const err of ruleResult.errors) {
              ruleErrors.push(`${rule}/rule.mdc: ${err.instancePath || '/'}: ${err.message}`);
            }
          }
        } else {
          ruleErrors.push(`${rule}/rule.mdc: file not found at ${rulePath}`);
        }
      }
    }
    
    // Report skill errors
    if (skillErrors.length > 0) {
      allValid = false;
      console.error('✗ Skills validation failed:');
      for (const err of skillErrors) {
        console.error(`  ${err}`);
      }
    } else if (result.plugin && result.plugin.skills && result.plugin.skills.length > 0) {
      console.log('✓ Skills validation passed');
    }
    
    // Report agent errors
    if (agentErrors.length > 0) {
      allValid = false;
      console.error('✗ Agents validation failed:');
      for (const err of agentErrors) {
        console.error(`  ${err}`);
      }
    } else if (result.plugin && result.plugin.agents && result.plugin.agents.length > 0) {
      console.log('✓ Agents validation passed');
    }
    
    // Report hook errors
    if (hookErrors.length > 0) {
      allValid = false;
      console.error('✗ Hooks validation failed:');
      for (const err of hookErrors) {
        console.error(`  ${err}`);
      }
    } else if (result.plugin && result.plugin.hooks && result.plugin.hooks.length > 0) {
      console.log('✓ Hooks validation passed');
    }
    
    // Report command errors
    if (commandErrors.length > 0) {
      allValid = false;
      console.error('✗ Commands validation failed:');
      for (const err of commandErrors) {
        console.error(`  ${err}`);
      }
    } else if (result.plugin && result.plugin.commands && result.plugin.commands.length > 0) {
      console.log('✓ Commands validation passed');
    }
    
    // Report rule errors
    if (ruleErrors.length > 0) {
      allValid = false;
      console.error('✗ Rules validation failed:');
      for (const err of ruleErrors) {
        console.error(`  ${err}`);
      }
    } else if (result.plugin && result.plugin.rules && result.plugin.rules.length > 0) {
      console.log('✓ Rules validation passed');
    }
  }

  // Validate marketplace.json if it exists
  if (hasMarketplace) {
    console.log('Validating marketplace.json...');
    const marketplaceResult = validateMarketplace(marketplacePath, manifests);
    if (marketplaceResult.valid) {
      console.log('✓ marketplace.json');
    } else {
      allValid = false;
      console.error('✗ marketplace.json');
      for (const err of marketplaceResult.errors) {
        console.error(`  ${err}`);
      }
    }
  }

  process.exit(allValid ? 0 : 1);
}

main();
