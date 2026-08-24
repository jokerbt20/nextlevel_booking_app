import BookingForm from '../components/BookingForm'
import Header from '../components/Header'

export default function NewBookingScreen({ onCreated, initialDate }) {
  return (
    <div>
      <Header title="New Booking" />
      <BookingForm initialDate={initialDate} onSaved={onCreated} />
    </div>
  )
}
