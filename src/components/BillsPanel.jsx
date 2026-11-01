import { useEffect, useState } from 'react'
import {
  addExpense,
  generateMonthExpenses,
  getExpenseTemplates,
  getMonthlyExpenses,
  setExpensePaid,
} from '../api/reports'
import { formatCurrency } from '../utils/format'
import { color, font, radius } from '../theme'
import Icon from './Icon'
import { Badge, Button, Chip, ChipRow, Field, Input, SkeletonList } from './ui'

/** The server's five categories, in the words the owner uses. */
export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent', icon: 'box' },
  { key: 'salary', label: 'Salaries', icon: 'people' },
  { key: 'utilities', label: 'Bills', icon: 'exclamation' },
  { key: 'loan', label: 'Loan', icon: 'wallet' },
  { key: 'other', label: 'Other', icon: 'tag' },
]
const categoryLabel = (key) => EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? 'Other'

/**
 * A month's bills, to act on rather than just read: tick one paid, add one in a
 * few taps, or fill an empty month from the standing list (rent, salaries, …).
 *
 * Adding stays inside the panel instead of opening a second sheet, because the
 * panel itself often lives inside one.
 */
export default function BillsPanel({ year, month, onChanged, startAdding = false }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [isAdding, setIsAdding] = useState(startAdding)
  const [isFilling, setIsFilling] = useState(false)

  function load() {
    return getMonthlyExpenses(year, month)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    setData(null)
    load()
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePaid(bill) {
    setBusyId(bill.id)
    setError(null)
    try {
      await setExpensePaid(bill.id, !bill.isPaid)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function fillFromList() {
    setIsFilling(true)
    setError(null)
    try {
      setData(await generateMonthExpenses(year, month))
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsFilling(false)
    }
  }

  if (!data && !error) return <SkeletonList count={3} />

  const bills = data?.expenses ?? []
  const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0)
  const unpaid = bills.filter((b) => !b.isPaid).reduce((s, b) => s + Number(b.amount || 0), 0)

  return (
    <div>
      {error && <p style={styles.error}>{error}</p>}

      {bills.length === 0 && !isAdding && (
        <div style={styles.empty}>
          <p style={font.subhead}>No bills entered for this month yet.</p>
          <Button variant="tinted" size="small" disabled={isFilling} onClick={fillFromList} style={{ marginTop: 10 }}>
            {isFilling ? 'Adding…' : 'Add the usual monthly bills'}
          </Button>
        </div>
      )}

      {bills.length > 0 && (
        <div className="cell-list">
          {bills.map((b) => (
            <div key={b.id} style={styles.row}>
              {/* The circle is the whole point of the row: one tap and it is paid. */}
              <button
                type="button"
                aria-label={b.isPaid ? `Mark ${b.name} unpaid` : `Mark ${b.name} paid`}
                aria-pressed={b.isPaid}
                disabled={busyId === b.id}
                onClick={() => togglePaid(b)}
                style={{ ...styles.check, ...(b.isPaid ? styles.checkOn : {}) }}
              >
                {b.isPaid && <Icon name="check" size={15} strokeWidth={3} />}
              </button>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...styles.name, ...(b.isPaid ? { color: color.muted } : {}) }}>{b.name}</span>
                <span style={font.footnote}>
                  {categoryLabel(b.category)}
                  {b.dueDay ? ` · due on the ${b.dueDay}.` : ''}
                </span>
              </span>
              {b.isOverdue ? (
                <Badge tone="danger">Late</Badge>
              ) : (
                !b.isPaid && <Badge tone="warning">Unpaid</Badge>
              )}
              <span style={styles.amount}>{formatCurrency(b.amount)}</span>
            </div>
          ))}
          <div style={{ ...styles.row, minHeight: 40 }}>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>Total</span>
            {unpaid > 0 && <span style={{ ...font.footnote, color: color.warning }}>{formatCurrency(unpaid)} unpaid</span>}
            <span style={{ ...styles.amount, fontWeight: 700 }}>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {isAdding ? (
        <AddBillForm
          year={year}
          month={month}
          onCancel={() => setIsAdding(false)}
          onAdded={async () => {
            setIsAdding(false)
            await load()
            onChanged?.()
          }}
        />
      ) : (
        <Button variant="tinted" full onClick={() => setIsAdding(true)} style={{ marginTop: 12 }}>
          <Icon name="plus" size={16} strokeWidth={2.6} /> Add Expense
        </Button>
      )}
    </div>
  )
}

/**
 * The quickest path from "I just paid the electricity" to a recorded bill: pick
 * one of the usual bills (or a category), type the amount, save. Paid is on by
 * default, because that is usually why it is being entered.
 */
function AddBillForm({ year, month, onCancel, onAdded }) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('utilities')
  const [amount, setAmount] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getExpenseTemplates()
      .then((list) => setTemplates(list ?? []))
      .catch(() => {})
  }, [])

  function pickTemplate(t) {
    if (templateId === t.id) {
      setTemplateId(null)
      return
    }
    setTemplateId(t.id)
    setName(t.name)
    setCategory(t.category)
    if (t.defaultAmount > 0) setAmount(String(t.defaultAmount))
  }

  async function save(e) {
    e.preventDefault()
    const value = Number(String(amount).replace(',', '.'))
    if (!name.trim()) return setError('What is it for? Give it a name.')
    if (!(value > 0)) return setError('Enter the amount.')
    setIsSaving(true)
    setError(null)
    try {
      await addExpense({
        year,
        month,
        name: name.trim(),
        category,
        amount: value,
        templateId: templateId ?? undefined,
        isPaid,
      })
      onAdded()
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={save} style={styles.form}>
      <p style={styles.formTitle}>New Expense</p>

      {templates.length > 0 && (
        <Field label="Usual bills">
          <ChipRow>
            {templates.map((t) => (
              <Chip key={t.id} active={templateId === t.id} onClick={() => pickTemplate(t)}>
                {t.name}
              </Chip>
            ))}
          </ChipRow>
        </Field>
      )}

      <Field label="Type">
        <ChipRow>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              active={category === c.key}
              onClick={() => {
                setCategory(c.key)
                setTemplateId(null)
              }}
            >
              {c.label}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Field label="Name">
        <Input
          value={name}
          placeholder={category === 'rent' ? 'Rent' : category === 'utilities' ? 'Electricity, water, internet…' : 'What was it?'}
          onChange={(e) => {
            setName(e.target.value)
            setTemplateId(null)
          }}
        />
      </Field>

      <Field label="Amount (MKD)">
        <Input inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
      </Field>

      <button type="button" style={styles.paidToggle} onClick={() => setIsPaid((v) => !v)} aria-pressed={isPaid}>
        <span style={{ ...styles.check, ...(isPaid ? styles.checkOn : {}) }}>
          {isPaid && <Icon name="check" size={15} strokeWidth={3} />}
        </span>
        Already paid
      </button>

      {error && <p style={styles.error}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} style={{ flex: 2 }}>
          {isSaving ? 'Saving…' : 'Save Expense'}
        </Button>
      </div>
    </form>
  )
}

const styles = {
  error: {
    color: color.danger,
    background: color.dangerSoft,
    borderRadius: radius.md,
    padding: '10px 12px',
    fontSize: 13,
    margin: '0 0 10px',
  },
  empty: { padding: '6px 0 4px' },
  row: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '6px 0' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    boxShadow: `inset 0 0 0 1.5px ${color.faint}`,
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  checkOn: { background: color.success, boxShadow: 'none' },
  name: { display: 'block', fontSize: 14, fontWeight: 500, color: color.text },
  amount: { fontSize: 14, fontWeight: 600, color: color.text, flexShrink: 0 },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: radius.lg,
    // Outlined, not filled: the fields inside already use the fill colour.
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  formTitle: { ...font.headline },
  paidToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 14,
    fontWeight: 500,
    color: color.text,
    textAlign: 'left',
  },
}
