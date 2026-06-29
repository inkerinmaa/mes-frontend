import { createSharedComposable } from '@vueuse/core'
import { i18n } from '../i18n'

export const useLocale = createSharedComposable(() => {
  const locale = i18n.global.locale

  function setLocale(lang: string) {
    locale.value = lang as 'en' | 'ru'
    localStorage.setItem('locale', lang)
  }

  return { locale, setLocale }
})
