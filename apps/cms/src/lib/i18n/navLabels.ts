/**
 * Translations for custom nav links and views.
 * Keys match the i18n locale codes configured in payload.config.ts.
 */
export const navLabels: Record<string, Record<string, string>> = {
  tasksBoard:        { en: 'Tasks Board',          zh: '任務看板' },
  regionEditor:      { en: 'Region Editor',        zh: '區域編輯器' },
  logViewer:         { en: 'Log Viewer',            zh: '日誌檢視器' },
  serverHealth:      { en: 'Server Health',         zh: '伺服器狀態' },
  backups:           { en: 'Backups',               zh: '備份管理' },
  evolutionEditor:   { en: 'Digivolution Editor',   zh: '進化編輯器' },
};

/**
 * Get the current admin locale from the HTML lang attribute.
 * Falls back to 'en' if unrecognised.
 */
export function getAdminLocale(): string {
  if (typeof document === 'undefined') return 'en';
  const lang = document.documentElement.lang || 'en';
  // Normalise zh-TW / zh-HK → zh  (mirrors i18next load:'languageOnly')
  if (lang.startsWith('zh')) return 'zh';
  return lang;
}

/** Resolve a nav label for the current locale. */
export function t(key: string): string {
  const locale = getAdminLocale();
  return navLabels[key]?.[locale] || navLabels[key]?.en || key;
}
