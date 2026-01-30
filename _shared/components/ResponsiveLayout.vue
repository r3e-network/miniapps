<template>
  <div 
    class="responsive-layout"
    :class="{ 
      'is-mobile': isMobile, 
      'is-desktop': isDesktop,
      'is-tablet': isTablet,
      [`layout-${layout}`]: true
    }"
  >
    <!-- Desktop Header -->
    <header v-if="!isMobile && showHeader" class="desktop-header">
      <slot name="desktop-header">
        <div class="header-brand">
          <img v-if="logo" :src="logo" class="header-logo" alt="logo" />
          <h1 class="header-title">{{ title }}</h1>
        </div>
        <nav class="header-nav" v-if="navItems?.length">
          <button 
            v-for="item in navItems" 
            :key="item.key"
            :class="['nav-item', { active: activeTab === item.key }]"
            @click="$emit('navigate', item.key)"
          >
            <span class="nav-icon" v-if="item.icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>
        <div class="header-actions">
          <slot name="header-actions" />
        </div>
      </slot>
    </header>

    <!-- Mobile Header -->
    <header v-if="isMobile && showHeader" class="mobile-header">
      <slot name="mobile-header">
        <button v-if="showBack" class="back-btn" @click="$emit('back')">←</button>
        <h1 class="header-title">{{ title }}</h1>
        <div class="header-actions">
          <slot name="mobile-header-actions" />
        </div>
      </slot>
    </header>

    <!-- Desktop Sidebar + Main Content -->
    <div v-if="!isMobile" class="desktop-body">
      <aside v-if="showSidebar" class="desktop-sidebar">
        <slot name="desktop-sidebar">
          <nav class="sidebar-nav" v-if="navItems?.length">
            <button 
              v-for="item in navItems" 
              :key="item.key"
              :class="['sidebar-item', { active: activeTab === item.key }]"
              @click="$emit('navigate', item.key)"
            >
              <span class="sidebar-icon" v-if="item.icon">{{ item.icon }}</span>
              <span class="sidebar-label">{{ item.label }}</span>
            </button>
          </nav>
        </slot>
      </aside>
      
      <main class="main-content desktop-main">
        <slot />
      </main>
      
      <aside v-if="showRightPanel" class="desktop-right-panel">
        <slot name="desktop-right-panel" />
      </aside>
    </div>

    <!-- Mobile Main Content -->
    <template v-else>
      <main class="main-content mobile-main">
        <slot />
      </main>
      
      <!-- Mobile Bottom Navigation -->
      <nav v-if="showNav && navItems?.length" class="mobile-bottom-nav">
        <slot name="mobile-nav">
          <button 
            v-for="item in navItems" 
            :key="item.key"
            :class="['mobile-nav-item', { active: activeTab === item.key }]"
            @click="$emit('navigate', item.key)"
          >
            <span class="nav-icon" v-if="item.icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </slot>
      </nav>
      
      <!-- Spacer for bottom nav -->
      <div v-if="showNav && navItems?.length" class="mobile-nav-spacer" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

export interface NavItem {
  key: string;
  label: string;
  icon?: string;
}

export type LayoutType = 'default' | 'sidebar' | 'centered' | 'fullwidth';

const props = withDefaults(defineProps<{
  title?: string;
  logo?: string;
  navItems?: NavItem[];
  activeTab?: string;
  showNav?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  showBack?: boolean;
  layout?: LayoutType;
  desktopBreakpoint?: number;
}>(), {
  showNav: true,
  showHeader: true,
  showSidebar: false,
  showRightPanel: false,
  showBack: false,
  layout: 'default',
  desktopBreakpoint: 768
});

const emit = defineEmits<{
  navigate: [key: string];
  back: [];
}>();

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const isMobile = computed(() => windowWidth.value < props.desktopBreakpoint);
const isTablet = computed(() => windowWidth.value >= props.desktopBreakpoint && windowWidth.value < 1024);
const isDesktop = computed(() => windowWidth.value >= 1024);

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="scss">
// CSS Variables for theming
.responsive-layout {
  --header-height: 64px;
  --sidebar-width: 240px;
  --right-panel-width: 320px;
  --bottom-nav-height: 64px;
  --content-max-width: 1200px;
  
  --color-primary: #00a651;
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e5e5e5;
  
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

// Desktop Header
.desktop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;

  .header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .header-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }
    
    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
  }

  .header-nav {
    display: flex;
    gap: 8px;
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(0, 166, 81, 0.1);
        color: var(--color-primary);
      }
      
      &.active {
        background: var(--color-primary);
        color: white;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

// Mobile Header
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;

  .back-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    flex: 1;
    text-align: center;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

// Desktop Body Layout
.desktop-body {
  display: flex;
  flex: 1;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

// Desktop Sidebar
.desktop-sidebar {
  width: var(--sidebar-width);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 16px;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  overflow-y: auto;

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    
    &:hover {
      background: rgba(0, 166, 81, 0.1);
      color: var(--color-primary);
    }
    
    &.active {
      background: var(--color-primary);
      color: white;
    }

    .sidebar-icon {
      font-size: 18px;
    }
  }
}

// Desktop Right Panel
.desktop-right-panel {
  width: var(--right-panel-width);
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: 24px;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
}

// Main Content
.main-content {
  flex: 1;
  
  &.desktop-main {
    padding: 24px;
    max-width: var(--content-max-width);
  }
  
  &.mobile-main {
    padding: 16px;
    padding-bottom: calc(16px + var(--bottom-nav-height));
  }
}

// Mobile Bottom Navigation
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: var(--bottom-nav-height);
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    gap: 4px;
    
    &.active {
      color: var(--color-primary);
    }

    .nav-icon {
      font-size: 22px;
    }

    .nav-label {
      font-size: 11px;
    }
  }
}

.mobile-nav-spacer {
  height: var(--bottom-nav-height);
}

// Layout Variants
.layout-centered .main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.layout-fullwidth .main-content {
  max-width: none;
  padding: 0;
}

// Responsive adjustments
@media (max-width: 1200px) {
  .desktop-right-panel {
    display: none;
  }
}

@media (max-width: 992px) {
  .desktop-sidebar {
    width: 72px;
    
    .sidebar-label {
      display: none;
    }
    
    .sidebar-item {
      justify-content: center;
      padding: 12px;
    }
  }
}

// Hide utilities
.hide-mobile {
  @media (max-width: 767px) {
    display: none !important;
  }
}

.hide-desktop {
  @media (min-width: 768px) {
    display: none !important;
  }
}
</style>
