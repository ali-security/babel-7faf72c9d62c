"use strict";

// Prints every skipped test after the run, with the reason upstream skips it,
// because Jest's summary only reports a bare "N skipped" count.
// Runs untranspiled on every CI leg (down to Node 6): keep it ES2015-only, with no trailing commas in calls.

const path = require("path");

const REASONS = [
  [
    "packages/babel-standalone/test/babel.js",
    "upstream wraps this suite in describe.skip when TEST_TYPE=cov (coverage runs test the instrumented src, not the standalone bundle)",
  ],
  [
    "packages/babel-core/test/async.js",
    "upstream skips these async-plugin tests on Node 6",
  ],
  [
    "eslint/babel-eslint-tests/test/integration/eslint/eslint.js",
    "upstream it.skip: visiting properties left of a spread was removed from babel-eslint because it broke other rules (#249)",
  ],
  [
    "packages/babel-traverse/test/traverse.js",
    "upstream it.skip: re-visiting skipped-then-requeued paths is deferred to Babel 8 (NodePath.requeue notes it loops forever with transform-block-scoping's TDZ visitor)",
  ],
];

const FIXTURE_REASON =
  "fixture disabled upstream: its directory name starts with '.', which @babel/helper-fixtures marks as disabled (it.skip)";

function reasonFor(relPath) {
  for (let i = 0; i < REASONS.length; i++) {
    if (relPath === REASONS[i][0]) return REASONS[i][1];
  }
  return FIXTURE_REASON;
}

class SkippedTestsReporter {
  constructor(globalConfig) {
    this._rootDir = globalConfig.rootDir;
  }

  onRunComplete(contexts, results) {
    const lines = [];
    const suites = [];
    results.testResults.forEach(file => {
      const relPath = path
        .relative(this._rootDir, file.testFilePath)
        .split(path.sep)
        .join("/");
      // Jest counts a file whose every test is skipped as a "skipped" suite.
      if (file.skipped) {
        suites.push(
          "SKIPPED SUITE " + relPath + " -- reason: " + reasonFor(relPath)
        );
      }
      file.testResults.forEach(test => {
        if (test.status === "pending" || test.status === "skipped") {
          lines.push(
            "SKIPPED " +
              relPath +
              " > " +
              test.fullName +
              " -- reason: " +
              reasonFor(relPath)
          );
        }
      });
    });
    process.stdout.write(
      "\nSkipped test suites (" +
        suites.length +
        "):\n" +
        suites.join("\n") +
        "\nSkipped tests (" +
        lines.length +
        "):\n" +
        lines.join("\n") +
        "\n"
    );
  }
}

module.exports = SkippedTestsReporter;
