import BookingForm from '../components/BookingForm'
import Header, { BarButton } from '../components/Header'
import { useBackHandler } from '../lib/backStack'

export default function EditBookingScreen({ booking, onSaved, onCancel }) {
  // Back leaves the edit without saving, the same as the header's ‹ and Discard.
  useBackHandler(onCancel)

  const name = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ')
  return (
    <div className="anim-screen">
      <Header
        title={name || 'Edit Booking'}
        large={false}
        left={<BarButton onClick={onCancel}>Cancel</BarButton>}
      />
      <BookingForm booking={booking} onSaved={onSaved} onCancel={onCancel} />
    </div>
  )
}
