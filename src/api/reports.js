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

// ─── Bills (fixed monthly costs) ─────────────────────────────────────────────

/** The owner's standing list — rent, salaries, utilities — to add a month's bill from in one tap. */
export const getExpenseTemplates = () => apiRequest('/admin/expenses/templates', { params: { activeOnly: true } })

/** Fills a month from the standing list. Safe to repeat: what is already there is skipped. */
export const generateMonthExpenses = (year, month) =>
  apiRequest('/admin/expenses/generate', { method: 'POST', params: { year, month } })

/** One bill: { year, month, name, category, amount, templateId?, isPaid? }. */
export const addExpense = (body) => apiRequest('/admin/expenses', { method: 'POST', body })

/** Ticks a bill paid (today) or back to unpaid. */
export const setExpensePaid = (id, isPaid) =>
  apiRequest(`/admin/expenses/${id}/paid`, { method: 'PATCH', body: { isPaid } })

// ─── Stock in the storeroom ──────────────────────────────────────────────────

/** A delivery: lines of { productId, quantity, inPacks, unitCost }. */
export const recordPurchase = (body) => apiRequest('/admin/inventory/purchases', { method: 'POST', body })

/** What is physically on the shelf; the server works out the difference. */
export const setStockCount = (body) => apiRequest('/admin/inventory/stock-counts', { method: 'POST', body })

/** Suppliers, for saying who a delivery came from. */
export const getSuppliers = () => apiRequest('/admin/inventory/suppliers')
