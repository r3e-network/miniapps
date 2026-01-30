#!/usr/bin/env node
/**
 * MiniApp Review Script
 * 
 * Performs comprehensive review of a miniapp across all dimensions:
 * - Contracts (NatSpec, security)
 * - UI/UX (responsive design)
 * - Tests (coverage)
 * - Documentation (completeness)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPS_DIR = path.join(__dirname, '../../apps');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkContractDocs(appPath) {
  const contractsDir = path.join(appPath, 'contracts');
  if (!fs.existsSync(contractsDir)) {
    return { score: 0, issues: ['No contracts directory'] };
  }

  const csFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.cs'));
  if (csFiles.length === 0) {
    return { score: 0, issues: ['No .cs contract files'] };
  }

  let documented = 0;
  let totalLines = 0;
  let docLines = 0;
  const issues = [];

  for (const file of csFiles) {
    const content = fs.readFileSync(path.join(contractsDir, file), 'utf8');
    const lines = content.split('\n');
    totalLines += lines.length;
    
    const fileDocLines = lines.filter(l => l.trim().startsWith('///')).length;
    docLines += fileDocLines;
    
    // Check for key NatSpec elements
    const hasSummary = content.includes('/// <summary>');
    const hasMainSummary = content.includes('/// <summary>') && content.indexOf('/// <summary>') < 500;
    
    if (hasMainSummary) documented++;
    
    // Check for security issues
    if (content.includes('CheckWitness') && !content.includes('throw') && !content.includes('Assert')) {
      issues.push(`${file}: Weak access control`);
    }
  }

  const docRatio = docLines / totalLines;
  const score = Math.min(100, Math.round((documented / csFiles.length) * 50 + docRatio * 50));

  return { score, issues, docRatio, files: csFiles.length };
}

function checkResponsiveUI(appPath) {
  const pagesDir = path.join(appPath, 'src/pages');
  if (!fs.existsSync(pagesDir)) {
    return { score: 0, issues: ['No pages directory'] };
  }

  const vueFiles = [];
  function findVue(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        findVue(fullPath);
      } else if (item.endsWith('.vue')) {
        vueFiles.push(fullPath);
      }
    }
  }
  findVue(pagesDir);

  if (vueFiles.length === 0) {
    return { score: 0, issues: ['No .vue files'] };
  }

  let hasResponsive = false;
  let hasMediaQuery = false;
  let usesResponsiveLayout = false;
  const issues = [];

  for (const file of vueFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('ResponsiveLayout')) usesResponsiveLayout = true;
    if (content.includes('@media') || content.includes('media query')) hasMediaQuery = true;
    if (content.includes('isMobile') || content.includes('isDesktop') || 
        content.includes('windowWidth') || content.includes('responsive')) {
      hasResponsive = true;
    }
  }

  // Score based on responsive implementation
  let score = 0;
  if (usesResponsiveLayout) score += 60;
  if (hasMediaQuery) score += 20;
  if (hasResponsive) score += 20;

  if (score < 50) {
    issues.push('Limited responsive design implementation');
  }

  return { score, issues, files: vueFiles.length, usesResponsiveLayout };
}

function checkTests(appPath) {
  const testsDir = path.join(appPath, 'tests');
  const hasTestsDir = fs.existsSync(testsDir);
  
  const srcTestsDir = path.join(appPath, 'src/__tests__');
  const hasSrcTests = fs.existsSync(srcTestsDir);

  const specFiles = [];
  if (hasTestsDir) {
    specFiles.push(...fs.readdirSync(testsDir).filter(f => f.includes('.test.') || f.includes('.spec.')));
  }
  if (hasSrcTests) {
    specFiles.push(...fs.readdirSync(srcTestsDir).filter(f => f.includes('.test.') || f.includes('.spec.')));
  }

  const score = specFiles.length > 0 ? Math.min(100, specFiles.length * 25) : 0;
  const issues = specFiles.length === 0 ? ['No test files found'] : [];

  return { score, issues, testFiles: specFiles.length };
}

function checkDocumentation(appPath, appName) {
  const readmePath = path.join(appPath, 'README.md');
  const hasReadme = fs.existsSync(readmePath);
  
  let score = 0;
  const issues = [];

  if (!hasReadme) {
    issues.push('No README.md');
  } else {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const length = readme.length;
    
    // Check sections
    const hasFeatures = readme.toLowerCase().includes('feature');
    const hasUsage = readme.toLowerCase().includes('usage') || readme.toLowerCase().includes('how to');
    const hasContract = readme.toLowerCase().includes('contract') || readme.toLowerCase().includes('smart contract');
    
    score = Math.min(100, Math.round(length / 20));
    if (hasFeatures) score += 10;
    if (hasUsage) score += 10;
    if (hasContract) score += 10;
    score = Math.min(100, score);

    if (length < 500) issues.push('README too short');
    if (!hasFeatures) issues.push('Missing Features section');
    if (!hasUsage) issues.push('Missing Usage section');
  }

  // Check for docs directory
  const docsDir = path.join(appPath, 'docs');
  if (fs.existsSync(docsDir)) {
    score += 10;
    score = Math.min(100, score);
  }

  return { score, issues, hasReadme };
}

function checkPerformance(appPath) {
  const issues = [];
  let score = 100;

  // Check for large files
  const srcDir = path.join(appPath, 'src');
  if (fs.existsSync(srcDir)) {
    function checkSize(dir, base = '') {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = path.join(base, item);
        if (fs.statSync(fullPath).isDirectory()) {
          checkSize(fullPath, relPath);
        } else {
          const stats = fs.statSync(fullPath);
          if (stats.size > 500000) { // 500KB
            issues.push(`Large file: ${relPath} (${Math.round(stats.size/1024)}KB)`);
            score -= 10;
          }
        }
      }
    }
    checkSize(srcDir);
  }

  // Check for images optimization
  const staticDir = path.join(appPath, 'src/static');
  if (fs.existsSync(staticDir)) {
    const images = fs.readdirSync(staticDir).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));
    for (const img of images) {
      const stats = fs.statSync(path.join(staticDir, img));
      if (stats.size > 200000) { // 200KB
        issues.push(`Large image: ${img} (${Math.round(stats.size/1024)}KB)`);
        score -= 5;
      }
    }
  }

  score = Math.max(0, score);
  return { score, issues };
}

function reviewApp(appName) {
  const appPath = path.join(APPS_DIR, appName);
  
  if (!fs.existsSync(appPath)) {
    log(`❌ App not found: ${appName}`, 'red');
    return null;
  }

  log(`\n🔍 Reviewing: ${appName}`, 'cyan');
  log('=' .repeat(50), 'cyan');

  const results = {
    name: appName,
    contracts: checkContractDocs(appPath),
    responsiveUI: checkResponsiveUI(appPath),
    tests: checkTests(appPath),
    documentation: checkDocumentation(appPath, appName),
    performance: checkPerformance(appPath),
  };

  // Display results
  log(`\n📋 Contract Documentation: ${results.contracts.score}/100`, results.contracts.score >= 80 ? 'green' : results.contracts.score >= 50 ? 'yellow' : 'red');
  if (results.contracts.issues.length > 0) {
    results.contracts.issues.forEach(i => log(`   ⚠️  ${i}`, 'yellow'));
  }

  log(`\n🎨 Responsive UI: ${results.responsiveUI.score}/100`, results.responsiveUI.score >= 80 ? 'green' : results.responsiveUI.score >= 50 ? 'yellow' : 'red');
  if (results.responsiveUI.usesResponsiveLayout) {
    log('   ✅ Uses ResponsiveLayout component', 'green');
  }
  if (results.responsiveUI.issues.length > 0) {
    results.responsiveUI.issues.forEach(i => log(`   ⚠️  ${i}`, 'yellow'));
  }

  log(`\n🧪 Tests: ${results.tests.score}/100`, results.tests.score >= 80 ? 'green' : results.tests.score >= 50 ? 'yellow' : 'red');
  if (results.tests.issues.length > 0) {
    results.tests.issues.forEach(i => log(`   ⚠️  ${i}`, 'yellow'));
  }

  log(`\n📖 Documentation: ${results.documentation.score}/100`, results.documentation.score >= 80 ? 'green' : results.documentation.score >= 50 ? 'yellow' : 'red');
  if (results.documentation.issues.length > 0) {
    results.documentation.issues.forEach(i => log(`   ⚠️  ${i}`, 'yellow'));
  }

  log(`\n⚡ Performance: ${results.performance.score}/100`, results.performance.score >= 80 ? 'green' : results.performance.score >= 50 ? 'yellow' : 'red');
  if (results.performance.issues.length > 0) {
    results.performance.issues.forEach(i => log(`   ⚠️  ${i}`, 'yellow'));
  }

  // Overall score
  const overall = Math.round(
    (results.contracts.score + 
     results.responsiveUI.score + 
     results.tests.score + 
     results.documentation.score + 
     results.performance.score) / 5
  );

  log(`\n📊 Overall Score: ${overall}/100`, overall >= 80 ? 'green' : overall >= 60 ? 'yellow' : 'red');

  return results;
}

function reviewAll() {
  const apps = fs.readdirSync(APPS_DIR)
    .filter(f => fs.statSync(path.join(APPS_DIR, f)).isDirectory())
    .sort();

  log(`\n🚀 Reviewing ${apps.length} MiniApps\n`, 'magenta');

  const results = [];
  for (const app of apps) {
    const result = reviewApp(app);
    if (result) results.push(result);
  }

  // Summary
  log(`\n\n${'='.repeat(60)}`, 'cyan');
  log('📈 REVIEW SUMMARY', 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');

  const avgContract = Math.round(results.reduce((a, r) => a + r.contracts.score, 0) / results.length);
  const avgUI = Math.round(results.reduce((a, r) => a + r.responsiveUI.score, 0) / results.length);
  const avgTest = Math.round(results.reduce((a, r) => a + r.tests.score, 0) / results.length);
  const avgDoc = Math.round(results.reduce((a, r) => a + r.documentation.score, 0) / results.length);
  const avgPerf = Math.round(results.reduce((a, r) => a + r.performance.score, 0) / results.length);

  log(`\nAverage Scores:`, 'blue');
  log(`  Contracts:      ${avgContract}/100`);
  log(`  Responsive UI:  ${avgUI}/100`);
  log(`  Tests:          ${avgTest}/100`);
  log(`  Documentation:  ${avgDoc}/100`);
  log(`  Performance:    ${avgPerf}/100`);

  // Apps needing attention
  const lowScorers = results
    .map(r => ({ name: r.name, score: Math.round((r.contracts.score + r.responsiveUI.score + r.tests.score + r.documentation.score + r.performance.score) / 5) }))
    .filter(r => r.score < 60)
    .sort((a, b) => a.score - b.score);

  if (lowScorers.length > 0) {
    log(`\n🔧 Apps needing attention (${lowScorers.length}):`, 'yellow');
    lowScorers.forEach(a => log(`  - ${a.name}: ${a.score}/100`, 'yellow'));
  }

  // Save report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { avgContract, avgUI, avgTest, avgDoc, avgPerf },
    results
  };
  
  const reportPath = path.join(__dirname, '../../MINIAPP_REVIEW_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved to: MINIAPP_REVIEW_REPORT.json`, 'green');
}

// Main
const targetApp = process.argv[2];
if (targetApp) {
  reviewApp(targetApp);
} else {
  reviewAll();
}
