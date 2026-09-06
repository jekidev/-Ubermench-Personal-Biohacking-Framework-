import { GOOGLE_SECRET_KEYS } from './connectors/oauth/google-oauth'
import { getSecret, setSecret } from '../app/services/secret-vault'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const clientId = String(config.public.googleClientId || '')
  const clientSecret = config.public.googleClientSecret ? String(config.public.googleClientSecret) : ''

  if (clientId && !(await getSecret(GOOGLE_SECRET_KEYS.clientId))) {
    await setSecret(GOOGLE_SECRET_KEYS.clientId, clientId)
  }
  if (clientSecret && !(await getSecret(GOOGLE_SECRET_KEYS.clientSecret))) {
    await setSecret(GOOGLE_SECRET_KEYS.clientSecret, clientSecret)
  }
})
