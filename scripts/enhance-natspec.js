#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', 'apps');
const apps = fs.readdirSync(appsDir).filter(d => !d.startsWith('.'));

const partialNatSpecApps = [
  'burn-league', 'candidate-vote', 'compound-capsule', 'council-governance',
  'doomsday-clock', 'event-ticket-pass', 'ex-files', 'forever-album',
  'garden-of-neo', 'gas-sponsor', 'gov-merc', 'graveyard', 'masquerade-dao',
  'milestone-escrow', 'million-piece-map', 'neo-gacha', 'quadratic-funding',
  'red-envelope', 'stream-vault', 'time-capsule', 'trustanchor',
  'turtle-match', 'unbreakable-vault'
];

let fixed = 0;

apps.forEach(app => {
  if (!partialNatSpecApps.includes(app)) return;

  const contractsDir = path.join(appsDir, app, 'contracts');
  if (!fs.existsSync(contractsDir)) return;

  const csFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.cs'));

  csFiles.forEach(csFile => {
    const filePath = path.join(contractsDir, csFile);
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Add /// <summary> to APP_ID constant
    content = content.replace(
      /(private const string APP_ID = "[^"]+";)/g,
      '/// <summary>Unique application identifier for the ' + app + ' miniapp.</summary>\n        $1'
    );

    // Add /// <summary> to long constants without them
    content = content.replace(
      /(private const long MIN_[A-Z_]+ = \d+;(\s*\/\/.*)?)/g,
      '/// <summary>Minimum value for operation.</summary>\n        $1'
    );

    content = content.replace(
      /(private const long [A-Z_]+_THRESHOLD = \d+;(\s*\/\/.*)?)/g,
      '/// <summary>Threshold value for tier calculation.</summary>\n        $1'
    );

    content = content.replace(
      /(private const long [A-Z_]+ = \d+;(\s*\/\/.*)?)/g,
      function(match) {
        if (match.includes('/// <summary>')) return match;
        const name = match.match(/private const long ([A-Z_]+)/)?.[1] || '';
        let desc = 'Constant value for ';
        if (name.includes('REWARD')) desc = 'Reward amount ';
        else if (name.includes('FEE')) desc = 'Fee rate ';
        else if (name.includes('BONUS')) desc = 'Bonus amount ';
        else if (name.includes('MAX')) desc = 'Maximum allowed value ';
        else if (name.includes('DURATION')) desc = 'Duration in seconds ';
        else if (name.includes('PERIOD')) desc = 'Period in seconds ';
        else if (name.includes('WINDOW')) desc = 'Time window in seconds ';
        else if (name.includes('THRESHOLD')) desc = 'Threshold for tier ';
        else if (name.includes('COUNT')) desc = 'Count limit ';
        else if (name.includes('MULTIPLIER')) desc = 'Multiplier value ';
        else desc = 'Configuration constant ';
        return '/// <summary>' + desc + '.</summary>\n        ' + match.trim();
      }
    );

    // Add /// <summary> to prefix constants
    content = content.replace(
      /(private static readonly byte\[\] PREFIX_[A-Z_]+ = new byte\[\] \{ 0x[0-9A-F]+ \};)/g,
      function(match) {
        if (match.includes('/// <summary>')) return match;
        const prefix = match.match(/PREFIX_[A-Z_]+/)?.[0] || '';
        const desc = 'Storage prefix for ' + prefix.replace('PREFIX_', '').replace(/_/g, ' ').toLowerCase();
        return '/// <summary>' + desc + '.</summary>\n        ' + match.trim();
      }
    );

    // Add /// <summary> to event delegates
    content = content.replace(
      /(public delegate void ([A-Za-z]+)Handler\([^)]+\);)/g,
      function(match, fullMatch, name) {
        if (fullMatch.includes('/// <summary>')) return fullMatch;
        const desc = 'Event emitted when ' + name.replace('Handler', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase() + '.';
        return '/// <summary>' + desc + '</summary>\n    ' + fullMatch;
      }
    );

    // Add /// <summary> to storage map declarations
    content = content.replace(
      /(private static StorageMap ([A-Za-z]+)Storage = new StorageMap\(StorageContext\);)/g,
      function(match, fullMatch, name) {
        if (fullMatch.includes('/// <summary>')) return fullMatch;
        const desc = 'Storage map for ' + name.replace('Storage', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase() + ' data.';
        return '/// <summary>' + desc + '</summary>\n        ' + fullMatch;
      }
    );

    // Add /// <summary> to public methods without them
    content = content.replace(
      /(public (?:BigInteger|bool|void|UInt160|string) ([A-Z][a-zA-Z]*)\([^)]*\)(?:\s*: ([A-Z][a-zA-Z]*))?)/g,
      function(match, fullMatch, methodName) {
        if (fullMatch.includes('/// <summary>')) return fullMatch;
        const desc = methodName.replace(/([A-Z])/g, ' $1').trim() + ' operation.';
        return '/// <summary>' + desc + '</summary>\n        ' + fullMatch;
      }
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log('Enhanced NatSpec:', app + '/' + csFile);
      fixed++;
    }
  });
});

console.log('\nEnhanced ' + fixed + ' contract files');
