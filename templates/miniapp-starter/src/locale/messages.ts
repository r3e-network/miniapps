/**
 * Miniapp i18n Messages
 *
 * Define all user-facing text here.
 * Merge with commonMessages from @shared/locale/common
 */

import { commonMessages } from "@shared/locale/common";

export const messages = {
  // ============================================================
  // APP INFO
  // ============================================================
  title: { en: "Template Miniapp", zh: "模板迷你应用" },
  description: {
    en: "A starting template for new miniapps",
    zh: "新迷你应用的起始模板",
  },

  // ============================================================
  // TABS
  // ============================================================
  tabMain: { en: "Main", zh: "主页" },

  // ============================================================
  // ACTIONS
  // ============================================================
  actionButton: { en: "Do Something", zh: "执行操作" },
  processing: { en: "Processing...", zh: "处理中..." },
  invalidInput: { en: "Please check your input", zh: "请检查您的输入" },
  success: { en: "Operation successful!", zh: "操作成功！" },
  error: { en: "An error occurred", zh: "发生错误" },

  // ============================================================
  // DOCUMENTATION
  // ============================================================
  step1: {
    en: "First, connect your wallet",
    zh: "首先，连接您的钱包",
  },
  step2: {
    en: "Then, configure your settings",
    zh: "然后，配置您的设置",
  },
  step3: {
    en: "Finally, execute your transaction",
    zh: "最后，执行您的交易",
  },

  feature1Name: { en: "Feature One", zh: "功能一" },
  feature1Desc: {
    en: "Description of the first feature",
    zh: "第一个功能的描述",
  },
  feature2Name: { en: "Feature Two", zh: "功能二" },
  feature2Desc: {
    en: "Description of the second feature",
    zh: "第二个功能的描述",
  },

  // ============================================================
  // COMMON MESSAGES (from shared)
  // ============================================================
  ...commonMessages,
} as const;
