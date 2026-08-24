import BookingForm from '../components/BookingForm'
import Header from '../components/Header'
import { useBackHandler } from '../lib/backStack'

export default function EditBookingScreen({ booking, onSaved, onCancel }) {
  // Back leaves the edit without saving, the same as the header's ‹ and Discard.
  useBackHandler(onCancel)

  const name = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ')
  return (
    <div>
      <Header title={name ? `Edit · ${name}` : 'Edit booking'} onBack={onCancel} />
      <BookingForm booking={booking} onSaved={onSaved} onCancel={onCancel} />
    </div>
  )
}
