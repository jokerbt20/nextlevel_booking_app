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

  // The notification's data says where it leads: { type?, bookingId?, timeOffId? }.
  const tapListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data ?? {}
    onNotificationTap({
      type: data.type ?? null,
      bookingId: data.bookingId ? Number(data.bookingId) : null,
    })
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
