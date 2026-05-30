#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DOCS = [
  'AGENTS.md',
  'docs/agent/INDEX.md',
  'docs/agent/TASK_STARTUP_PLAYBOOK.md',
  'docs/agent/WORKFLOW.md',
  'docs/agent/VALIDATION_MATRIX.md',
];

const GENERATED_OR_LOCAL = [
  /^\.next\//,
  /^node_modules\//,
  /^temp\//,
  /^coverage\//,
  /^next-dev\.(stdout|stderr)\.log$/,
  /^tsconfig\.tsbuildinfo$/,
];

const VALIDATION_COMMANDS = [
  'yarn check:docs',
  'yarn check:fast',
  'yarn check:socket',
  'yarn check:murder',
  'yarn check:full',
  'yarn typecheck',
  'yarn lint',
  'yarn build',
  'yarn test:murder',
  'yarn smoke:socket',
  'node --preserve-symlinks-main .codex/hooks/codex-harness.cjs --self-test',
  'node .codex/hooks/codex-harness.cjs --self-test',
];

function readJsonFromStdin() {
  const input = fs.readFileSync(0, 'utf8').trim();
  if (!input) {
    return {};
  }
  return JSON.parse(input);
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return String(result.stdout || '').trim();
}

function getGitRoot(cwd) {
  return (
    run('git', ['rev-parse', '--show-toplevel'], { cwd }) ||
    cwd ||
    process.cwd()
  );
}

function toRepoPath(root, filePath) {
  let normalized = filePath.replace(/\\/g, '/').trim();
  normalized = normalized.replace(/^"|"$/g, '');
  if (!normalized) {
    return '';
  }

  if (path.isAbsolute(filePath)) {
    return path.relative(root, filePath).replace(/\\/g, '/');
  }

  return normalized.replace(/^\.\//, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function gitLines(root, args) {
  const output = run('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
  });
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((line) => toRepoPath(root, line))
    .filter(Boolean);
}

function isGeneratedOrLocal(filePath) {
  return GENERATED_OR_LOCAL.some((pattern) => pattern.test(filePath));
}

function getChangedFiles(root) {
  return unique([
    ...gitLines(root, ['diff', '--name-only', '--']),
    ...gitLines(root, ['diff', '--cached', '--name-only', '--']),
    ...gitLines(root, ['ls-files', '--others', '--exclude-standard']),
  ]).filter((filePath) => !isGeneratedOrLocal(filePath));
}

function classifyFiles(files) {
  const docs = [];
  const validations = [];
  const notes = [];

  const hasHarness = files.some((filePath) => filePath.startsWith('.codex/'));
  const hasAgentDocs = files.some(
    (filePath) => filePath === 'AGENTS.md' || filePath.startsWith('docs/agent/')
  );
  const hasOnlyDocs =
    files.length > 0 &&
    files.every(
      (filePath) =>
        /\.(md|markdown)$/i.test(filePath) || filePath.startsWith('docs/')
    );
  const hasSocket = files.some(
    (filePath) =>
      filePath.startsWith('src/pages/api/socket/') ||
      filePath === 'src/components/provider/SocketProvider.tsx' ||
      filePath === 'src/types/socket.d.ts' ||
      filePath === 'src/types/room.d.ts' ||
      filePath === 'src/components/GameRooms.tsx' ||
      filePath === 'src/components/RoomModal.tsx'
  );
  const hasSocketFullRisk = files.some(
    (filePath) =>
      filePath === 'src/components/provider/SocketProvider.tsx' ||
      filePath === 'src/pages/api/socket/io.ts' ||
      filePath === 'src/middleware.ts' ||
      filePath === 'next.config.mjs' ||
      filePath === 'package.json'
  );
  const hasMurder = files.some(
    (filePath) =>
      filePath.startsWith('data/murder-mystery/') ||
      /murderMystery/i.test(filePath) ||
      filePath.startsWith('src/components/murderMystery/') ||
      filePath.startsWith('src/app/murder_mystery/')
  );
  const hasCode = files.some((filePath) =>
    /\.(cjs|mjs|js|jsx|ts|tsx)$/i.test(filePath)
  );
  const hasBuildSurface = files.some(
    (filePath) =>
      filePath === 'src/middleware.ts' ||
      filePath === 'src/app/layout.tsx' ||
      filePath.startsWith('src/app/api/') ||
      filePath === 'next.config.mjs' ||
      filePath === 'package.json' ||
      filePath === 'tsconfig.json'
  );

  if (hasHarness) {
    docs.push('.codex/HARNESS.md');
    validations.push(
      'node --preserve-symlinks-main .codex/hooks/codex-harness.cjs --self-test'
    );
  }

  if (hasAgentDocs) {
    docs.push(
      'docs/agent/INDEX.md',
      'docs/agent/WORKFLOW.md',
      'docs/agent/VALIDATION_MATRIX.md'
    );
    validations.push('yarn check:docs');
  }

  if (hasSocket) {
    docs.push('docs/agent/contracts/ROOM_SOCKET_CONTRACT.md');
    validations.push(
      hasSocketFullRisk ? 'yarn check:full' : 'yarn check:socket'
    );
  }

  if (hasMurder) {
    docs.push(
      'data/murder-mystery/SCENARIO_AUTHORING.md',
      'docs/gpt-project/08-murder-mystery-implementation.md'
    );
    validations.push(hasSocket ? 'yarn check:full' : 'yarn check:murder');
  }

  if (hasBuildSurface && !hasSocket && !hasMurder) {
    validations.push('yarn check:fast', 'yarn build');
  } else if (hasCode && !hasSocket && !hasMurder && !hasHarness) {
    validations.push('yarn check:fast');
  }

  if (hasOnlyDocs && !hasAgentDocs && !hasHarness) {
    validations.push('yarn check:docs');
  }

  if (hasSocketFullRisk) {
    notes.push(
      'Provider, io, middleware, package, or build-surface changes require the stronger path.'
    );
  }

  if (validations.length === 0 && files.length > 0) {
    validations.push('yarn check:fast');
  }

  return {
    docs: unique(docs),
    validations: unique(validations),
    notes,
  };
}

function classifyPrompt(prompt) {
  const lowered = prompt.toLowerCase();
  const files = [];

  if (
    /socket|room|re-?enter|rejoin|lobby|host|ack|sessionid|방|입장|재입장|로비|호스트/.test(
      lowered
    )
  ) {
    files.push(
      'src/pages/api/socket/handlers/commonHandler.ts',
      'src/components/GameRooms.tsx'
    );
  }

  if (
    /murder|mystery|scenario|registry|rulebook|머더|미스터리|시나리오|룰지/.test(
      lowered
    )
  ) {
    files.push('data/murder-mystery/registry.json');
  }

  if (/auth|middleware|nextauth|login|로그인|인증|미들웨어/.test(lowered)) {
    files.push('src/middleware.ts');
  }

  if (/hook|hooks|codex|agent|harness|claude|하네스|훅/.test(lowered)) {
    files.push('.codex/hooks/codex-harness.cjs', 'docs/agent/INDEX.md');
  }

  return classifyFiles(unique(files));
}

function formatChecklist(title, classification) {
  const docs = unique([...ROOT_DOCS, ...classification.docs]).slice(0, 8);
  const validations = classification.validations;
  const notes = classification.notes;
  const lines = [title, `Read first: ${docs.join(', ')}`];

  if (validations.length > 0) {
    lines.push(`Validation target: ${validations.join(' && ')}`);
  }

  if (notes.length > 0) {
    lines.push(`Notes: ${notes.join(' ')}`);
  }

  lines.push(
    'Before editing, read the direct target and one adjacent pattern file.'
  );
  lines.push('Before final, report the exact validation command and result.');
  return lines.join('\n');
}

function hookContext(eventName, additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext,
    },
  };
}

function blockPreTool(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

function toolName(input) {
  return String(input.tool_name || input.toolName || '');
}

function toolInput(input) {
  return input.tool_input || input.toolInput || {};
}

function commandText(input) {
  const currentToolInput = toolInput(input);
  if (typeof currentToolInput === 'string') {
    return currentToolInput;
  }
  return String(
    currentToolInput.command ||
      currentToolInput.cmd ||
      currentToolInput.script ||
      currentToolInput.patch ||
      ''
  );
}

function extractPatchFiles(text) {
  const files = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/);
    if (match) {
      files.push(match[1].trim());
    }
  }
  return unique(files);
}

function validationEvidence(text) {
  return VALIDATION_COMMANDS.some((command) => text.includes(command));
}

function looksDestructive(command) {
  return [
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+-[^\r\n]*f/i,
    /\bgit\s+checkout\s+--\s+/i,
    /\brm\s+-rf\b/i,
    /\bRemove-Item\b[\s\S]*\b-Recurse\b/i,
    /\bdel\s+\/[sq]\b/i,
  ].some((pattern) => pattern.test(command));
}

function handleSessionStart(input) {
  const classification = classifyFiles([]);
  return hookContext(
    'SessionStart',
    formatChecklist('Project harness loaded for next-game-web.', classification)
  );
}

function handleUserPrompt(input) {
  const prompt = String(input.prompt || '');
  const classification = classifyPrompt(prompt);
  return hookContext(
    'UserPromptSubmit',
    formatChecklist('Prompt classified by project harness.', classification)
  );
}

function handlePreTool(input) {
  const name = toolName(input);
  const command = commandText(input);

  if (
    /^Bash$|^functions\.shell_command$/.test(name) &&
    looksDestructive(command)
  ) {
    return blockPreTool(
      'Project hook blocked a destructive shell command. Confirm intent and use a narrower non-destructive command first.'
    );
  }

  const patchFiles = extractPatchFiles(command);
  if (patchFiles.length === 0) {
    return {};
  }

  const classification = classifyFiles(patchFiles);
  return hookContext(
    'PreToolUse',
    formatChecklist(
      `Pending edit touches: ${patchFiles.slice(0, 8).join(', ')}`,
      classification
    )
  );
}

function handlePostTool(input) {
  const root = getGitRoot(input.cwd || process.cwd());
  const files = getChangedFiles(root);

  if (files.length === 0) {
    return {};
  }

  const classification = classifyFiles(files);
  return hookContext(
    'PostToolUse',
    formatChecklist(
      `Current changed files: ${files.slice(0, 12).join(', ')}`,
      classification
    )
  );
}

function handleStop(input) {
  if (input.stop_hook_active) {
    return { continue: true };
  }

  const root = getGitRoot(input.cwd || process.cwd());
  const files = getChangedFiles(root);
  if (files.length === 0) {
    return { continue: true };
  }

  const lastMessage = String(input.last_assistant_message || '');
  if (validationEvidence(lastMessage)) {
    return { continue: true };
  }

  const classification = classifyFiles(files);
  const validations =
    classification.validations.join(' && ') || 'yarn check:fast';

  return {
    decision: 'block',
    reason: [
      `Files changed without validation evidence in the final response: ${files.slice(0, 12).join(', ')}`,
      `Run and report: ${validations}.`,
      'If a command cannot run, state the exact command and blocker before finishing.',
    ].join('\n'),
  };
}

function printClassification() {
  const root = getGitRoot(process.cwd());
  const files = getChangedFiles(root);
  const classification = classifyFiles(files);
  process.stdout.write(
    JSON.stringify(
      {
        files,
        docs: unique([...ROOT_DOCS, ...classification.docs]),
        validations: classification.validations,
        notes: classification.notes,
      },
      null,
      2
    )
  );
  process.stdout.write('\n');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function selfTest() {
  const prompt = classifyPrompt(
    'Fix socket room rejoin flow in murder mystery.'
  );
  assert(
    prompt.validations.includes('yarn check:full'),
    'socket+murder prompt should require check:full'
  );

  const edit = classifyFiles(['src/components/GameRooms.tsx']);
  assert(
    edit.validations.includes('yarn check:socket'),
    'room UI edit should require check:socket'
  );

  const harness = classifyFiles(['.codex/hooks/codex-harness.cjs']);
  assert(
    harness.validations.includes(
      'node --preserve-symlinks-main .codex/hooks/codex-harness.cjs --self-test'
    ),
    'harness edit should require self-test'
  );

  const blocked = handlePreTool({
    tool_name: 'Bash',
    tool_input: { command: 'git reset --hard HEAD' },
  });
  assert(
    blocked.hookSpecificOutput &&
      blocked.hookSpecificOutput.permissionDecision === 'deny',
    'destructive command should be denied'
  );

  process.stdout.write('codex-harness self-test passed\n');
}

function main() {
  const mode = process.argv[2];

  if (mode === '--self-test') {
    selfTest();
    return;
  }

  if (mode === '--classify') {
    printClassification();
    return;
  }

  const input = readJsonFromStdin();

  if (mode === 'session-start') {
    writeJson(handleSessionStart(input));
  } else if (mode === 'user-prompt') {
    writeJson(handleUserPrompt(input));
  } else if (mode === 'pre-tool') {
    writeJson(handlePreTool(input));
  } else if (mode === 'post-tool') {
    writeJson(handlePostTool(input));
  } else if (mode === 'stop') {
    writeJson(handleStop(input));
  } else {
    writeJson({
      systemMessage: `Unknown codex harness mode: ${mode || '(missing)'}`,
    });
  }
}

try {
  main();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  if (process.argv[2] === '--self-test' || process.argv[2] === '--classify') {
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  writeJson({
    systemMessage: `Codex harness failed open: ${message}`,
  });
}
