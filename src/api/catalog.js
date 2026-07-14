import { apiRequest } from './client'

export const getOffers = () => apiRequest('/website/offers')

export const getAddons = (category) =>
  apiRequest('/website/addons', { params: category ? { category } : undefined })

export const getTakenSlots = (date) => apiRequest('/website/slots', { params: { date } })
