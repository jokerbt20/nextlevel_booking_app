import { PushNotifications } from '@capacitor/push-notifications'
import { registerPushToken } from './api/push'

const TOKEN_KEY = 'nl_push_token'

export function getSavedPushToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setupPushNotifications(onNotificationTap) {
  const registrationListener = PushNotifications.addListener('registration', (token) => {
    localStorage.setItem(TOKEN_KEY, token.value)
    registerPushToken(token.value).catch(() => {})
  })

  const registrationErrorListener = PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration error', err)
  })

  const tapListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const bookingId = action.notification?.data?.bookingId
    if (bookingId) onNotificationTap(Number(bookingId))
  })

  ;(async () => {
    try {
      let perm = await PushNotifications.checkPermissions()
      if (perm.receive === 'prompt') {
        perm = await PushNotifications.requestPermissions()
      }
      if (perm.receive !== 'granted') return
      await PushNotifications.register()
    } catch (err) {
      console.warn('Push notification setup failed', err)
    }
  })()

  return () => {
    registrationListener.remove()
    registrationErrorListener.remove()
    tapListener.remove()
  }
}
