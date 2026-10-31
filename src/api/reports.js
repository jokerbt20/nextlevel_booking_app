import { apiRequest } from './client'

// Every endpoint here is Admin-only server-side (403 for operators), which is
// why the Reports tab is never rendered for them in the first place.

/** Revenue, cost, profit and pipeline keyed on the date each party happens. */
export const getBusinessReport = (from, to) =>
  apiRequest('/admin/reports/business', { params: { from, to } })

/** Stock on hand and value for every product, with low/out-of-stock flags. */
export const getStockReport = () => apiRequest('/admin/inventory/reports/stock')

/** Spend, revenue, COGS and profit per product for a date range. */
export const getProductProfitReport = (from, to) =>
  apiRequest('/admin/inventory/reports/profit', { params: { from, to } })

/** Every item each party in the range used, one row per booking and product. */
export const getBusinessItems = (from, to) =>
  apiRequest('/admin/reports/business/items', { params: { from, to } })

/** A month's bills and its break-even standing. */
export const getMonthlyExpenses = (year, month) =>
  apiRequest('/admin/expenses', { params: { year, month } })
