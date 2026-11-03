// This is the deliberate failure gate used only by the failed-check variant.
console.error('Intentional rehearsal verification failure; do not bypass this gate.');
process.exitCode = 1;
