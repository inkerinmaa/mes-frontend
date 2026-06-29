import { useLocale } from './useLocale'

export function useLocalizedField() {
  const { locale } = useLocale()

  function localize<T extends string | null>(base: T, eng?: string | null): T {
    return locale.value === 'en' && eng ? (eng as T) : base
  }

  return { localize }
}
