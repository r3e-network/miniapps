# Continuous Improvement Workflow

## Overview

This document outlines the systematic approach to continuously review and improve all 52 miniapps for:
- **Code Quality**: Contracts, frontend, tests
- **UI/UX**: True responsive design for mobile/desktop
- **Performance**: Optimization and best practices
- **Documentation**: Comprehensive guides and references
- **Security**: Regular audits and fixes

## Daily Workflow

### Morning Review (30 min)
```bash
# Run automated review
node .claude/scripts/review-miniapp.js

# Check CI status
gh run list --limit 5

# Review overnight changes
git log --oneline --since="yesterday"
```

### Improvement Session (2-3 hours)
1. **Select Target MiniApps**: Choose 2-3 apps from the low-scorers list
2. **Focus Area**: Pick one dimension (contracts, UI, tests, docs)
3. **Apply Improvements**: Make focused changes
4. **Test**: Run build and verify
5. **Commit**: Clear commit message with before/after scores

### Evening Wrap-up (15 min)
```bash
# Update tracking
node .claude/scripts/review-miniapp.js

# Commit progress
git add .
git commit -m "improve(miniapps): [description of changes]"
git push
```

## Weekly Focus Rotation

| Day | Focus Area | Activities |
|-----|------------|------------|
| Monday | Contract Documentation | Add NatSpec to 3-4 contracts |
| Tuesday | Responsive UI | Improve mobile/desktop layouts |
| Wednesday | Test Coverage | Add unit/integration tests |
| Thursday | Performance | Optimize bundle size, images |
| Friday | Documentation | Update READMEs, user guides |

## Review Dimensions

### 1. Contract Documentation (Current: 15/100)

**Goal**: All contracts fully documented with NatSpec

**Checklist**:
- [ ] Class-level summary with features
- [ ] All event delegates documented
- [ ] All constants documented
- [ ] All storage prefixes documented
- [ ] All structs documented
- [ ] All public methods documented
- [ ] Security considerations noted

**Command**:
```bash
node .claude/scripts/review-miniapp.js [app-name]
```

### 2. Responsive UI (Current: 57/100)

**Goal**: All apps have true responsive layouts

**Mobile Layout (< 768px)**:
- Single column, full width
- Bottom navigation
- Touch-friendly buttons (min 44px)
- Stacked content
- Simplified headers

**Desktop Layout (>= 768px)**:
- Multi-column where appropriate
- Side navigation or top tabs
- Persistent sidebars
- Hover interactions
- Expanded information

**Implementation**:
```vue
<template>
  <ResponsiveLayout
    :title="appTitle"
    :nav-items="navItems"
    :show-sidebar="isDesktop"
    layout="sidebar"
  >
    <!-- Content adapts automatically -->
  </ResponsiveLayout>
</template>
```

### 3. Test Coverage (Current: 0/100)

**Goal**: >80% test coverage for all apps

**Test Types**:
- Unit tests for utilities
- Component tests for Vue components
- Integration tests for contract interactions
- E2E tests for critical user flows

**Test Structure**:
```
miniapp-name/
├── tests/
│   ├── unit/
│   │   ├── utils.spec.ts
│   │   └── components.spec.ts
│   ├── integration/
│   │   └── contract.spec.ts
│   └── e2e/
│       └── user-flow.spec.ts
```

### 4. Performance (Current: 98/100)

**Goal**: Maintain >95 performance score

**Checks**:
- Bundle size < 500KB
- Images optimized (< 200KB)
- Lazy loading implemented
- No unnecessary re-renders

### 5. Documentation (Current: 96/100)

**Goal**: Complete documentation for all apps

**Required**:
- README.md with setup, usage, features
- Contract documentation
- User guide
- API reference

## Priority Matrix

Apps are prioritized based on:
1. **Current Score** (lower = higher priority)
2. **Usage** (popular apps get priority)
3. **Complexity** (simpler apps first)

### Current Priority Queue (Lowest Scores)
1. social-karma (30/100)
2. prediction-market (34/100)
3. charity-vault (36/100)
4. coin-flip (37/100)
5. timestamp-proof (39/100)

## Quality Gates

Before marking a miniapp as "complete":

- [ ] Contract documentation score >= 80
- [ ] Responsive UI score >= 80
- [ ] Tests score >= 50 (minimum)
- [ ] Documentation score >= 80
- [ ] Performance score >= 90
- [ ] CI passing
- [ ] Manual QA complete

## Automation

### Automated Review Script
```bash
# Review all apps
node .claude/scripts/review-miniapp.js

# Review specific app
node .claude/scripts/review-miniapp.js coin-flip
```

### Pre-commit Hooks
```bash
# Run before each commit
pnpm lint
pnpm typecheck
pnpm test:run
```

### CI Checks
- Build all apps
- Run tests
- Check bundle size
- Validate contracts

## Progress Tracking

### Weekly Metrics
- Average contract score
- Average UI score
- Average test score
- Number of apps passing all gates

### Monthly Review
- Full review of all apps
- Update priority queue
- Adjust focus areas
- Celebrate milestones

## Improvement Templates

### Contract Documentation Template
See `CONTRACT_DOCUMENTATION_TEMPLATE.md`

### Responsive UI Template
See `_shared/responsive-layout.scss`

### Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '../src/components/MyComponent.vue';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent);
    expect(wrapper.exists()).toBe(true);
  });
});
```

## Communication

### Commit Message Format
```
improve(app-name): Brief description

- Specific change 1
- Specific change 2

Before: X/100
After: Y/100
```

### Progress Updates
Weekly summary in team channel:
```
📊 MiniApp Improvement Week of [Date]

Completed:
- Fixed X apps
- Improved Y dimension
- New average score: Z/100

Next Week:
- Focus on [dimension]
- Target apps: [list]
```

## Tools

### Required
- Node.js 20+
- pnpm
- Git
- GitHub CLI

### Recommended
- VS Code with extensions
- Neo debugger
- Neo Express

## Getting Started

1. **Clone and setup**:
```bash
git clone [repo]
cd miniapps
pnpm install
```

2. **Run initial review**:
```bash
node .claude/scripts/review-miniapp.js
```

3. **Pick an app to improve**:
```bash
node .claude/scripts/review-miniapp.js [app-name]
```

4. **Start improving!**

## Success Metrics

- [ ] All apps score >= 70/100
- [ ] All apps score >= 80/100
- [ ] All apps score >= 90/100
- [ ] 100% contract documentation
- [ ] 100% responsive UI
- [ ] >80% test coverage
- [ ] Zero security issues
