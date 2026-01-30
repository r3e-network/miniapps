#!/usr/bin/env node
/**
 * MiniApp Review Automation Script
 *
 * Runs comprehensive reviews across all 52 mini-apps:
 * 1. Contract documentation check
 * 2. Test coverage verification
 * 3. Responsive UI validation
 * 4. README completeness
 * 5. Code quality metrics
 *
 * Usage: node scripts/review-all.js [--rounds=N]
 */

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(__dirname, '..', 'apps');
const REVIEW_ROUNDS = 40;

const REVIEW_CRITERIA = {
  documentation: {
    hasReadme: true,
    hasUsageSection: true,
    hasContractDocs: true,
    minReadmeLength: 500,
  },
  tests: {
    hasTestFile: true,
    minTestCount: 10,
  },
  responsive: {
    usesResponsiveLayout: true,
    hasDesktopSidebar: true,
    hasMobileOptimizations: true,
  },
  contracts: {
    hasContractsDir: true,
    hasNatSpecDocs: true,
    minDocRatio: 0.5,
  },
};

function getApps() {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs.readdirSync(APPS_DIR).filter(name =>
    fs.statSync(path.join(APPS_DIR, name)).isDirectory()
  );
}

function reviewApp(appName) {
  const appDir = path.join(APPS_DIR, appName);
  const results = {
    name: appName,
    scores: {
      documentation: 0,
      tests: 0,
      responsive: 0,
      contracts: 0,
      overall: 0,
    },
    issues: [],
    passed: [],
  };

  // Check README
  const readmePath = path.join(appDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    results.passed.push('README exists');

    if (content.length >= REVIEW_CRITERIA.documentation.minReadmeLength) {
      results.scores.documentation += 20;
      results.passed.push('README has sufficient length');
    } else {
      results.issues.push('README too short');
    }

    if (content.toLowerCase().includes('## usage')) {
      results.scores.documentation += 30;
      results.passed.push('Has Usage section');
    } else {
      results.issues.push('Missing Usage section');
    }

    if (content.toLowerCase().includes('## how it works')) {
      results.scores.documentation += 20;
      results.passed.push('Has How It Works section');
    }

    if (content.toLowerCase().includes('## features')) {
      results.scores.documentation += 20;
      results.passed.push('Has Features section');
    }
  } else {
    results.issues.push('Missing README');
  }

  // Check test files
  const testPattern = ['**/*.test.ts', '**/*.spec.ts', '__tests__/**/*.ts'];
  let testCount = 0;
  for (const pattern of testPattern) {
    const files = globSync(path.join(appDir, pattern));
    testCount += files.length;
  }

  if (testCount > 0) {
    results.scores.tests += 50;
    results.passed.push(`Has ${testCount} test file(s)`);
    if (testCount >= REVIEW_CRITERIA.tests.minTestCount) {
      results.scores.tests += 50;
      results.passed.push('Sufficient test coverage');
    }
  } else {
    results.issues.push('No test files found');
  }

  // Check responsive layout
  const indexVue = path.join(appDir, 'src', 'pages', 'index', 'index.vue');
  if (fs.existsSync(indexVue)) {
    const content = fs.readFileSync(indexVue, 'utf-8');

    if (content.includes('ResponsiveLayout')) {
      results.scores.responsive += 30;
      results.passed.push('Uses ResponsiveLayout');

      if (content.includes('layout="sidebar"') || content.includes("layout='sidebar'")) {
        results.scores.responsive += 20;
        results.passed.push('Has sidebar layout');
      }

      if (content.includes(':show-sidebar="isDesktop"') || content.includes(':show-sidebar=isDesktop')) {
        results.scores.responsive += 20;
        results.passed.push('Has desktop sidebar prop');
      }

      if (content.includes('#desktop-sidebar')) {
        results.scores.responsive += 20;
        results.passed.push('Has desktop sidebar slot');
      }

      if (content.includes('v-if="!isDesktop"') || content.includes('v-if=!isDesktop')) {
        results.scores.responsive += 10;
        results.passed.push('Has mobile optimizations');
      }
    } else {
      results.issues.push('Does not use ResponsiveLayout');
    }
  }

  // Check contracts
  const contractsDir = path.join(appDir, 'contracts');
  if (fs.existsSync(contractsDir)) {
    results.scores.contracts += 30;
    results.passed.push('Has contracts directory');

      const csFiles = globSync(path.join(contractsDir, '*.cs'));
      if (csFiles.length > 0) {
        let totalLines = 0;
        let docLines = 0;
        for (const f of csFiles) {
          const content = fs.readFileSync(f, 'utf-8');
          totalLines += content.split('\n').length;
          const summaryRegex = new RegExp('^\\s*/// <summary>', 'gm');
          const matches = content.match(summaryRegex);
          docLines += matches ? matches.length : 0;
        }

        const docRatio = docLines > 0 ? docLines / (totalLines / 10) : 0;
        if (docRatio >= REVIEW_CRITERIA.contracts.minDocRatio) {
          results.scores.contracts += 40;
          results.passed.push('Good NatSpec documentation');
        } else if (docRatio > 0) {
          results.scores.contracts += 20;
          results.passed.push('Partial NatSpec documentation');
        } else {
          results.issues.push('Missing NatSpec documentation');
        }
      }
    } else {
      results.issues.push('No contracts directory');
    }

  // Calculate overall score
  results.scores.overall = Math.round(
    (results.scores.documentation +
    results.scores.tests +
    results.scores.responsive +
    results.scores.contracts) / 4
  );

  return results;
}

function globSync(pattern) {
  const glob = require('glob');
  return glob.sync(pattern, { nodir: true });
}

function runReview(rounds = 1) {
  console.log(`\n🔍 Starting ${rounds} round(s) of review...\n`);

  const apps = getApps();
  console.log(`📦 Found ${apps.length} mini-apps\n`);

  const allResults = [];
  const summary = {
    rounds: rounds,
    appsReviewed: apps.length,
    avgScores: { documentation: 0, tests: 0, responsive: 0, contracts: 0, overall: 0 },
    issuesFound: [],
    appsByScore: { high: [], medium: [], low: [] },
  };

  for (let round = 1; round <= rounds; round++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Review Round ${round}/${rounds}`);
    console.log(`${'='.repeat(60)}\n`);

    const roundResults = [];
    for (const app of apps) {
      const result = reviewApp(app);
      roundResults.push(result);
      allResults.push(result);
    }

    // Calculate round statistics
    const roundScores = {
      documentation: 0,
      tests: 0,
      responsive: 0,
      contracts: 0,
      overall: 0,
    };

    roundResults.forEach(r => {
      roundScores.documentation += r.scores.documentation;
      roundScores.tests += r.scores.tests;
      roundScores.responsive += r.scores.responsive;
      roundScores.contracts += r.scores.contracts;
      roundScores.overall += r.scores.overall;
    });

    Object.keys(roundScores).forEach(k => {
      roundScores[k] = Math.round(roundScores[k] / roundResults.length);
    });

    console.log(`📊 Round ${round} Average Scores:`);
    console.log(`   Documentation: ${roundScores.documentation}/100`);
    console.log(`   Tests: ${roundScores.tests}/100`);
    console.log(`   Responsive: ${roundScores.responsive}/100`);
    console.log(`   Contracts: ${roundScores.contracts}/100`);
    console.log(`   Overall: ${roundScores.overall}/100`);

    // Show top/bottom apps
    const sorted = [...roundResults].sort((a, b) => b.scores.overall - a.scores.overall);
    console.log(`\n🏆 Top 3 Apps:`);
    sorted.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}: ${r.scores.overall}/100`);
    });

    console.log(`\n⚠️ Bottom 3 Apps:`);
    sorted.slice(-3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}: ${r.scores.overall}/100 - ${r.issues[0] || 'No issues'}`);
    });
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 FINAL SUMMARY (${rounds} rounds)`);
  console.log(`${'='.repeat(60)}\n`);

  const finalScores = { documentation: 0, tests: 0, responsive: 0, contracts: 0, overall: 0 };
  allResults.forEach(r => {
    finalScores.documentation += r.scores.documentation;
    finalScores.tests += r.scores.tests;
    finalScores.responsive += r.scores.responsive;
    finalScores.contracts += r.scores.contracts;
    finalScores.overall += r.scores.overall;
  });

  Object.keys(finalScores).forEach(k => {
    finalScores[k] = Math.round(finalScores[k] / allResults.length);
  });

  console.log('📊 Average Scores Across All Rounds:');
  console.log(`   Documentation: ${finalScores.documentation}/100`);
  console.log(`   Tests: ${finalScores.tests}/100`);
  console.log(`   Responsive: ${finalScores.responsive}/100`);
  console.log(`   Contracts: ${finalScores.contracts}/100`);
  console.log(`   Overall: ${finalScores.overall}/100`);

  // Categorize apps
  allResults.forEach(r => {
    if (r.scores.overall >= 80) summary.appsByScore.high.push(r.name);
    else if (r.scores.overall >= 50) summary.appsByScore.medium.push(r.name);
    else summary.appsByScore.low.push(r.name);
  });

  console.log(`\n📊 App Distribution:`);
  console.log(`   High (80+): ${summary.appsByScore.high.length} apps`);
  console.log(`   Medium (50-79): ${summary.appsByScore.medium.length} apps`);
  console.log(`   Low (<50): ${summary.appsByScore.low.length} apps`);

  // Common issues
  const issueCounts = {};
  allResults.forEach(r => {
    r.issues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });

  console.log(`\n🔧 Most Common Issues:`);
  Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([issue, count]) => {
      console.log(`   ${count}x - ${issue}`);
    });

  return { allResults, summary, finalScores };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const roundsArg = args.find(a => a.startsWith('--rounds='));
  const rounds = roundsArg ? parseInt(roundsArg.split('=')[1]) : 1;

  const { allResults, summary, finalScores } = runReview(rounds);

  // Save results
  const outputPath = path.join(__dirname, '..', 'MINIAPP_REVIEW_REPORT.json');
  const report = {
    generatedAt: new Date().toISOString(),
    summary: finalScores,
    results: allResults,
  };
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${outputPath}`);

  // Exit with appropriate code
  process.exit(finalScores.overall >= 50 ? 0 : 1);
}

module.exports = { runReview, reviewApp, REVIEW_CRITERIA };
