#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', 'apps');
const apps = fs.readdirSync(appsDir).filter(d => !d.startsWith('.'));

const howItWorksContent = {
  'breakup-contract': `
## How It Works

1. **Create Agreement**: The proposer initiates a breakup agreement by specifying terms and the other party's address
2. **Counterparty Sign**: The other party reviews and signs the agreement on-chain
3. **Time-Lock Period**: A configurable cooldown period allows both parties to reconsider
4. **Execute**: After the time-lock expires, either party can execute the final settlement
5. **On-Chain Record**: The agreement and its final state are permanently recorded on the Neo blockchain`,

  'candidate-vote': `
## How It Works

1. **Create Proposal**: Governance participants submit candidate proposals with a deposit
2. **Voting Period**: Token holders cast votes during the designated voting window
3. **Vote Weight**: Voting power is determined by governance token holdings
4. **Results Tally**: Votes are counted and results are calculated on-chain
5. **Execution**: Approved proposals can be queued for automatic execution`,

  'coin-flip': `
## How It Works

1. **Place Bet**: Players bet GAS on either heads or tails
2. **Randomness**: The Neo blockchain provides verifiable randomness via NCG
3. **Outcome Determination**: The result is determined by on-chain randomness
4. **Rewards**: Winners receive payouts based on the odds
5. **House Edge**: A small house edge funds the platform运营`,

  'daily-checkin': `
## How It Works

1. **Check In Daily**: Users check in once per UTC day to earn rewards
2. **Streak Bonus**: Consecutive check-ins increase reward multipliers
3. **Milestone Rewards**: Special bonuses are awarded at day 7, 14, 30, and beyond
4. **On-Chain Verification**: All check-ins are recorded and verifiable on Neo
5. **No Gas Fee**: Check-ins are free - platform sponsors the gas costs`,

  'dev-tipping': `
## How It Works

1. **Connect Wallet**: Developers connect their Neo wallet to receive tips
2. **Share Address**: Share your tipping address or QR code
3. **Receive Tips**: Anyone can send GAS tokens as appreciation
4. **Track Stats**: Tip amounts and frequencies are tracked on-chain
5. **Withdraw Funds**: Developers can withdraw accumulated tips at any time`,

  'ex-files': `
## How It Works

1. **Add Records**: Store important file references and metadata on-chain
2. **Categorize**: Organize files into custom categories
3. **Share**: Share records with specific addresses or publicly
4. **Verify**: All records have timestamp and creator verification
5. **Retrieve**: Access your records anytime from any device`,

  'forever-album': `
## How It Works

1. **Upload Photos**: Select and encrypt photos before uploading
2. **Encryption**: Photos are encrypted client-side using AES-256
3. **On-Chain Storage**: Metadata and encryption references are stored on Neo
4. **Share Album**: Create shared albums with specific viewers
5. **Permanent Access**: Photos remain accessible as long as the contract exists`,

  'garden-of-neo': `
## How It Works

1. **Plant Seeds**: Users acquire and plant digital seeds
2. **Growth Cycle**: Plants grow over time with user interaction
3. **Harvest**: Mature plants produce harvestable rewards
4. **Cross-Pollination**: Some plants can cross-breed for unique variants
5. **Marketplace**: Trade plants and seeds with other users`,

  'gas-sponsor': `
## How It Works

1. **Sponsorship Pool**: Sponsors deposit GAS into a sponsorship pool
2. **Eligibility Check**: Users are checked against eligibility criteria
3. **Quota System**: Daily quotas ensure fair distribution of sponsored gas
4. **Gasless Transactions**: Eligible users can execute transactions without paying gas
5. **Settlement**: Sponsors settle their pool periodically`,

  'graveyard': `
## How It Works

1. **Memorialize**: Create permanent tributes to lost projects or addresses
2. **Tombstone Design**: Choose from various tombstone designs and inscriptions
3. **On-Chain Record**: Memorials are permanently recorded on Neo blockchain
4. **Verify Loss**: Optionally verify the loss through oracle attestation
5. **Public View**: All memorials are publicly viewable and searchable`,

  'hall-of-fame': `
## How It Works

1. **Nomination**: Community members nominate candidates for recognition
2. **Boosting**: Supporters can boost their favorite candidates
3. **Voting Period**: During voting, the community decides rankings
4. **Leaderboard**: Rankings are displayed on a public leaderboard
5. **Permanent Record**: Inductees are permanently recorded on-chain`,

  'heritage-trust': `
## How It Works

1. **Create Trust**: Set up a trust with beneficiary and release conditions
2. **Configure Release**: Define time-based or condition-based release rules
3. **Fund Trust**: Deposit assets that will be managed by the trust
4. **Beneficiary Access**: Beneficiaries can claim according to release rules
5. **Owner Control**: Trust owner can modify parameters or add funds`,

  'lottery': `
## How It Works

1. **Buy Tickets**: Purchase lottery tickets with GAS
2. **Draw Period**: Wait for the scheduled draw time
3. **Random Selection**: Winning numbers are selected using Neo blockchain randomness
4. **Prize Pool**: A portion of ticket sales forms the prize pool
5. **Claim Rewards**: Winners can claim their prizes after the draw`,

  'milestone-escrow': `
## How It Works

1. **Create Escrow**: Sender creates an escrow with milestone definitions
2. **Fund Escrow**: Deposit funds that will be released upon milestone completion
3. **Milestone Review**: Milestones are reviewed and approved by the recipient
4. **Release Funds**: Upon approval, funds are released to the recipient
5. **Dispute Resolution**: Unresolved issues can be escalated`,

  'neo-gacha': `
## How It Works

1. **Acquire Gacha**: Use GAS to operate gacha machines
2. **Random Drop**: Characters are selected using on-chain randomness
3. **Rarity System**: Different characters have different rarity levels
4. **Collection**: Build your collection of unique characters
5. **Trade**: Characters can be transferred or traded`,

  'neoburger': `
## How It Works

1. **Swap Assets**: Exchange NEO and GAS tokens seamlessly
2. **Liquidity Pools**: trades are executed against liquidity pools
3. **Fee Structure**: A small fee is applied to each swap
4. **Slippage Control**: Maximum slippage can be configured
5. **On-Chain Settlement**: All swaps settle directly on Neo blockchain`,

  'soulbound-certificate': `
## How It Works

1. **Create Template**: Issuers create certificate templates with custom fields
2. **Issue Certificate**: Mint soulbound certificates for recipients
3. **Recipient Control**: Recipients control their own certificates
4. **Verification**: Third parties can verify certificate authenticity
5. **Non-Transferable**: Soulbound tokens cannot be transferred`,

  'time-capsule': `
## How It Works

1. **Create Capsule**: Seal messages or digital assets in a time capsule
2. **Set Release Time**: Define when the capsule can be opened
3. **On-Chain Storage**: Capsule metadata is stored permanently on Neo
4. **Restricted Access**: Cannot be opened before the release time
5. **Claim Capsule**: After release time, the owner can claim contents`,

  'unbreakable-vault': `
## How It Works

1. **Deposit Assets**: Send GAS or NEO to the vault contract
2. **Security Level**: Choose security configuration
3. **Time-Lock**: Assets are locked for a configurable period
4. **Emergency Recovery**: Set up recovery addresses for edge cases
5. **Claim**: After lock period, withdraw to your address`
};

let fixed = 0;

apps.forEach(app => {
  const readmePath = path.join(appsDir, app, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf8');

  if (content.includes('## How It Works')) return;

  const howItWorks = howItWorksContent[app];
  if (!howItWorks) return;

  try {
    if (content.includes('## Features')) {
      content = content.replace('## Features', howItWorks + '\n## Features');
    } else if (content.includes('## Assets')) {
      content = content.replace('## Assets', howItWorks + '\n## Assets');
    } else if (content.includes('## License')) {
      content = content.replace('## License', howItWorks + '\n## License');
    } else {
      content += howItWorks;
    }

    fs.writeFileSync(readmePath, content);
    fixed++;
    console.log('Added How It Works:', app);
  } catch (e) {
    console.error('Error:', app, e.message);
  }
});

console.log(`\nFixed ${fixed} apps`);
