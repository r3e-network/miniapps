#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', 'apps');
const apps = fs.readdirSync(appsDir).filter(d => !d.startsWith('.'));

let fixed = 0;
let errors = [];

const sidebarTemplate = `

      <!-- Desktop Sidebar -->
      <template #desktop-sidebar>
        <view class="desktop-sidebar">
          <text class="sidebar-title">{{ t('overview') }}</text>
        </view>
      </template>
`;

const sidebarCSS = `

// Desktop sidebar
.desktop-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3, 12px);
}

.sidebar-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--text-secondary, rgba(248, 250, 252, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
`;

apps.forEach(app => {
  const idxPath = path.join(appsDir, app, 'src', 'pages', 'index', 'index.vue');

  if (!fs.existsSync(idxPath)) {
    return;
  }

  let content = fs.readFileSync(idxPath, 'utf8');

  // Check if uses ResponsiveLayout
  if (!content.includes('ResponsiveLayout')) {
    return;
  }

  // Check if already has desktop-sidebar slot
  if (content.includes('#desktop-sidebar') || content.includes('desktop-sidebar')) {
    return;
  }

  try {
    // Find the end of ResponsiveLayout opening tag and insert before >
    // Pattern: <ResponsiveLayout ... >
    // We need to insert before the closing > of the opening tag

    const layoutOpenRegex = /(<ResponsiveLayout[\s\S]*?)(\/?>)/;
    const match = content.match(layoutOpenRegex);

    if (match) {
      const before = match[1];
      const after = match[2];

      // Insert the sidebar template before the closing >
      content = content.replace(
        layoutOpenRegex,
        before + sidebarTemplate + after
      );

      // Add CSS if style tag exists
      if (content.includes('</style>')) {
        content = content.replace('</style>', sidebarCSS + '</style>');
      }

      fs.writeFileSync(idxPath, content);
      fixed++;
      console.log('Fixed:', app);
    }
  } catch (e) {
    errors.push({ app, error: e.message });
  }
});

console.log(`\nFixed ${fixed} apps`);
if (errors.length > 0) {
  console.log('Errors:', errors);
}
