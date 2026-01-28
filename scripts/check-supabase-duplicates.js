#!/usr/bin/env node
/**
 * Check for duplicate entries in miniapp_stats table
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDuplicates() {
  console.log('🔍 Checking miniapp_stats table for duplicates...\n');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,name,chain_id,created_at,updated_at&order=created_at.desc`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
    }
  );

  if (!response.ok) {
    console.error('❌ Query failed:', response.status, response.statusText);
    return;
  }

  const data = await response.json();

  if (data.length === 0) {
    console.log('Table is empty');
    return;
  }

  console.log(`📊 Total records: ${data.length}\n`);

  // Group by app_id
  const byApp = {};
  data.forEach(row => {
    if (!byApp[row.app_id]) byApp[row.app_id] = [];
    byApp[row.app_id].push(row);
  });

  const duplicates = Object.entries(byApp).filter(([id, rows]) => rows.length > 1);

  console.log(`📋 Unique app_ids: ${Object.keys(byApp).length}\n`);

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} app_ids with multiple entries:\n`);
    duplicates.forEach(([appId, rows]) => {
      console.log(`  ${appId}:`);
      rows.forEach((r, i) => {
        const chain = r.chain_id || '(no chain)';
        const created = r.created_at || '(no date)';
        console.log(`    [${i+1}] chain_id=${chain}, created=${created}`);
      });
    });
  } else {
    console.log('✅ No duplicates found\n');
  }

  // Show all entries
  console.log('📋 All entries:');
  data.forEach(row => {
    const name = row.name || '(no name)';
    const chain = row.chain_id || '(no chain)';
    const created = row.created_at || '(no date)';
    console.log(`  ${row.app_id.padEnd(35)} ${name.padEnd(30)} chain=${chain.padEnd(20)} ${created}`);
  });
}

checkDuplicates().catch(console.error);
