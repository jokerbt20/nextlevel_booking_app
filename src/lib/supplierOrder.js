/**
 * Supplier order messages, in the exact shape the web admin's "Order from
 * suppliers" dialog copies — so a message sent from the phone reads the same as
 * one sent from the desk:
 *
 *   Нарачка за 03.10.2026 во 19:30:
 *   Пица - Маргарита x 4
 *   Мешана даска x 2
 *
 * Deliberately plain text: Viber shows exactly what it is given, and bullets or
 * tables arrive as noise on a phone.
 */

const pad = (n) => String(n).padStart(2, '0')

function formatQty(value) {
  const n = Number(value ?? 0)
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)))
}

export function orderText(group, eventDate) {
  let header = 'Нарачка:'
  if (eventDate) {
    const d = new Date(eventDate)
    const day = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
    // Bookings with no slot store midnight; then the date goes out on its own.
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
    header = `Нарачка за ${hasTime ? `${day} во ${pad(d.getHours())}:${pad(d.getMinutes())}` : day}:`
  }
  const lines = (group.lines ?? []).map((l) => `${l.productName} x ${formatQty(l.quantity)}`)
  return [header, ...lines].join('\n')
}

/**
 * Copies text, falling back to a hidden textarea where the async clipboard API
 * is unavailable. Resolves true when the text made it to the clipboard.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

/** Opens Viber's "forward" screen with the message filled in; you pick the chat. */
export const viberForwardUrl = (text) => `viber://forward?text=${encodeURIComponent(text)}`
