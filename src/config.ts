interface AppConfig {
  authority: string
  clientId: string
}

let _config: AppConfig | null = null

export async function loadConfig(): Promise<void> {
  const res = await fetch('/config.json')
  if (!res.ok) throw new Error(`Failed to load /config.json: ${res.status}`)
  _config = await res.json()
}

export function getConfig(): AppConfig {
  if (!_config) throw new Error('App config not loaded — loadConfig() must complete before useAuth()')
  return _config
}
