import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from '../locales/en/common.json'
import enAssets from '../locales/en/assets.json'
import enDashboard from '../locales/en/dashboard.json'
import enIssuances from '../locales/en/issuances.json'
import enAuthorizations from '../locales/en/authorizations.json'
import enCompliance from '../locales/en/compliance.json'
import enReports from '../locales/en/reports.json'
import enBalances from '../locales/en/balances.json'
import enSettings from '../locales/en/settings.json'
import enHelp from '../locales/en/help.json'

import deCommon from '../locales/de/common.json'
import deAssets from '../locales/de/assets.json'
import deDashboard from '../locales/de/dashboard.json'
import deIssuances from '../locales/de/issuances.json'
import deAuthorizations from '../locales/de/authorizations.json'
import deCompliance from '../locales/de/compliance.json'
import deReports from '../locales/de/reports.json'
import deBalances from '../locales/de/balances.json'
import deSettings from '../locales/de/settings.json'
import deHelp from '../locales/de/help.json'

const resources = {
  en: {
    common: enCommon,
    assets: enAssets,
    dashboard: enDashboard,
    issuances: enIssuances,
    authorizations: enAuthorizations,
    compliance: enCompliance,
    reports: enReports,
    balances: enBalances,
    settings: enSettings,
    help: enHelp,
  },
  de: {
    common: deCommon,
    assets: deAssets,
    dashboard: deDashboard,
    issuances: deIssuances,
    authorizations: deAuthorizations,
    compliance: deCompliance,
    reports: deReports,
    balances: deBalances,
    settings: deSettings,
    help: deHelp,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    debug: false, // Disable debug for production
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    defaultNS: 'common',
    ns: ['common', 'assets', 'dashboard', 'issuances', 'authorizations', 'compliance', 'reports', 'balances', 'settings', 'help'],
    
    // Ensure fallback to English for missing translations
    fallbackLng: 'en',
    
    // Return key if translation is missing
    returnEmptyString: false,
    returnNull: false,
    returnObjects: true,
    
    // Key separator for nested keys
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
  })

export default i18n
