// scripts/commands/command-shell.ts
import { Command } from "commander";
import { findingsExitCode, formatReport } from "./report.mjs";

// scripts/commands/audit.ts
function register(program) {
  program.command("audit").description("Check documentation structure").option("--fix", "Repair derived values").option("--verbose", "List warning details").action(async (options) => {
    await program.execute("audit", options);
  });
}

// scripts/commands/check.ts
function register2(program) {
  program.command("check").description("Check one documentation file").argument("<file>").action(async (file) => {
    await program.execute("check", { file });
  });
}

// scripts/commands/init.ts
function register3(program) {
  program.command("init").description("Survey documentation, applying only when requested").option("--apply", "Apply a safe initialization plan").action(async (options) => {
    await program.execute("init", options);
  });
}

// scripts/commands/repair.ts
function register4(program) {
  program.command("repair").description("Repair derived values only").action(async () => {
    await program.execute("repair");
  });
}

// scripts/commands/run-program.ts
import { CommanderError } from "commander";
async function runProgram(args, create, options = {}) {
  const writeErr = options.writeErr ?? ((text) => process.stderr.write(text));
  try {
    const { program, exitCode } = create();
    await program.parseAsync([...args], { from: "user" });
    return exitCode();
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
    const message = error instanceof Error ? error.message : String(error);
    writeErr(`docs-lint: ${message}
`);
    return 2;
  }
}

// scripts/commands/status.ts
function register5(program) {
  program.command("status").description("Show roadmap progress and the next ready leaf").argument("[file]").action(async (file) => {
    await program.execute("status", file === void 0 ? {} : { file });
  });
}

// scripts/commands/command-shell.ts
function registerCommands(program) {
  register3(program);
  register(program);
  register2(program);
  register4(program);
  register5(program);
}
function createCommandShell(options) {
  const writeOut = options.writeOut ?? ((text) => process.stdout.write(text));
  const writeErr = options.writeErr ?? ((text) => process.stderr.write(text));
  let exitCode = 0;
  const program = Object.assign(new Command(), {
    async execute(name, flags = {}) {
      const result = await options.handlers[name]({ ...flags, root: options.root ?? process.cwd() });
      if (result.stdout) writeOut(result.stdout);
      const report = formatReport(result.findings, flags);
      if (report) writeOut(report);
      exitCode = Math.max(result.exitCode ?? 0, findingsExitCode(result.findings));
    }
  });
  program.name("docs-lint").description("Validate documentation structure").showHelpAfterError().allowExcessArguments(false).exitOverride().configureOutput({ writeOut, writeErr });
  return { program, exitCode: () => exitCode };
}
export {
  createCommandShell,
  registerCommands,
  runProgram
};
