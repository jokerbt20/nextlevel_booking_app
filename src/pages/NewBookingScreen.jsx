import BookingForm from '../components/BookingForm'
import Header, { BarButton } from '../components/Header'
import { useBackHandler } from '../lib/backStack'
import { color } from '../theme'

/**
 * Creating a booking is a self-contained task, so it is presented modally over
 * whatever you were looking at, with Cancel always in reach — back does the same.
 */
export default function NewBookingScreen({ onCreated, onCancel, initialDate }) {
  useBackHandler(onCancel)

  return (
    <div className="anim-modal" role="dialog" aria-modal="true" aria-label="New booking" style={styles.modal}>
      <Header
        title="New Booking"
        large={false}
        left={<BarButton onClick={onCancel}>Cancel</BarButton>}
      />
      <BookingForm initialDate={initialDate} onSaved={onCreated} />
    </div>
  )
}

const styles = {
  modal: {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    background: color.bg,
    overflowY: 'auto',
  },
}
