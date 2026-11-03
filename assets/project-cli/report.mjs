// scripts/render/report.ts
var display = (value) => value.replaceAll("\r", "\\r").replaceAll("\n", "\\n");
var line = (finding) => `${display(finding.file)}:${finding.line} - ${display(finding.message)}`;
var repairLabel = (finding) => {
  if (finding.severity !== "repairable") return "";
  if (finding.repair.applied) return "repaired";
  if (finding.repair.withheld) return "withheld until this roadmap's errors are fixed";
  return "repairable with --fix";
};
function formatReport(findings, options = {}) {
  const errors = findings.filter((finding) => finding.severity === "error");
  const repairs = findings.filter((finding) => finding.severity === "repairable");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const output = errors.map(line);
  output.push(...repairs.map((finding) => `${line(finding)} (${repairLabel(finding)})`));
  if (options.verbose) output.push(...warnings.map(line));
  else if (warnings.length) {
    output.push(`${warnings.length} warning${warnings.length === 1 ? "" : "s"} (--verbose to list)`);
  }
  return output.length ? `${output.join("\n")}
` : "";
}
var findingsExitCode = (findings) => findings.some((finding) => finding.severity === "error") ? 1 : 0;
export {
  findingsExitCode,
  formatReport
};
