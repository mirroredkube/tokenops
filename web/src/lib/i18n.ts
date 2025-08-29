import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from '../locales/en/common.json'
import enAssets from '../locales/en/assets.json'
import enIssuances from '../locales/en/issuances.json'
import enAuthorizations from '../locales/en/authorizations.json'
import enCompliance from '../locales/en/compliance.json'
import enReports from '../locales/en/reports.json'
import enBalances from '../locales/en/balances.json'
import enSettings from '../locales/en/settings.json'

import deCommon from '../locales/de/common.json'
import deAssets from '../locales/de/assets.json'
import deIssuances from '../locales/de/issuances.json'
import deAuthorizations from '../locales/de/authorizations.json'
import deCompliance from '../locales/de/compliance.json'
import deReports from '../locales/de/reports.json'
import deBalances from '../locales/de/balances.json'
import deSettings from '../locales/de/settings.json'

const resources = {
  en: {
    common: enCommon,
    assets: enAssets,
    issuances: enIssuances,
    authorizations: enAuthorizations,
    compliance: enCompliance,
    reports: enReports,
    balances: enBalances,
    settings: enSettings,
  },
  de: {
    common: deCommon,
    assets: deAssets,
    issuances: deIssuances,
    authorizations: deAuthorizations,
    compliance: deCompliance,
    reports: deReports,
    balances: deBalances,
    settings: deSettings,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    defaultNS: 'common',
    ns: ['common', 'assets', 'issuances', 'authorizations', 'compliance', 'reports', 'balances', 'settings'],
  })

export default i18n
