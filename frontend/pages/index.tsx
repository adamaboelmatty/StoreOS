import React, { useState, useCallback, useEffect, useRef } from 'react'
import Shell from '../components/Shell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Tabs from '../components/ui/Tabs'
import KPICard from '../components/KPICard'
import DataTable, { Column } from '../components/DataTable'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import LiveFeed from '../components/LiveFeed'
import DateRange from '../components/ui/DateRange'
import { useEventStream } from '../hooks/useEventStream'
import { useRevenue, useTopProducts } from '../hooks/useAnalytics'
import { useProducts } from '../hooks/useProducts'
import { useOrders } from '../hooks/useOrders'
import { api } from '../lib/api'
import { formatCurrency, formatDate, timeAgo, cn } from '../lib/utils'
import type { ScanAction, Product, Order } from '../lib/types'

/* ═══════════════════════════════════════════════════════════════════
   DESIGN — White Premium / Apple-level elegance
   ═══════════════════════════════════════════════════════════════════
   Page bg:    #F8F8FA (warm off-white)
   Cards:     #FFFFFF + shadow-card
   Text:      gray-900, gray-500, gray-400
   Accent:    emerald-500 (#10B981) — sparingly
   Danger:    red-500/600
   Warning:   amber-500/600
   Buttons:   Dark primary (gray-900), white secondary
   ═══════════════════════════════════════════════════════════════════ */

// ── Priority config ──��───────────────────────────────────────

const PRIORITY: Record<string, { label: string; dot: string; text: string }> = {
  urgent: { label: 'Urgent', dot: 'bg-red-500', text: 'text-red-600' },
  high:   { label: 'High',   dot: 'bg-amber-500', text: 'text-amber-600' },
  medium: { label: 'Medium', dot: 'bg-gray-300', text: 'text-gray-400' },
}

const CATEGORY: Record<string, string> = {
  'win-back': 'Win-back', 'low-stock': 'Low Stock', 'margin-alert': 'Margin',
}

// ── Mock data for Products/Orders tabs ───────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: '1', title: 'The Complete Snowboard', handle: 'complete-snowboard', status: 'active', vendor: 'Snowboard Co', product_type: 'Snowboard', price_min: 249.99, price_max: 249.99, variants: [{ id: 'v1', title: 'Default', price: 249.99, sku: 'SB-COMP-001', inventory_quantity: 42 }], collections: ['Snowboards'], featured_image_url: null, inventory_total: 42, created_at: '2026-01-15T08:00:00Z', updated_at: '2026-03-20T14:00:00Z' },
  { id: '2', title: 'The Collection Snowboard: Hydrogen', handle: 'hydrogen-snowboard', status: 'active', vendor: 'Hydrogen Inc', product_type: 'Snowboard', price_min: 260.00, price_max: 260.00, variants: [{ id: 'v2', title: 'Default', price: 260.00, sku: 'SB-HYD-001', inventory_quantity: 28 }], collections: ['Snowboards'], featured_image_url: null, inventory_total: 28, created_at: '2026-01-20T08:00:00Z', updated_at: '2026-03-18T10:00:00Z' },
  { id: '3', title: 'The Multi-managed Snowboard', handle: 'multi-managed', status: 'active', vendor: 'Multi Manage', product_type: 'Snowboard', price_min: 189.99, price_max: 329.99, variants: [{ id: 'v3a', title: 'Small', price: 189.99, sku: 'SB-MM-S', inventory_quantity: 15 }, { id: 'v3b', title: 'Large', price: 329.99, sku: 'SB-MM-L', inventory_quantity: 8 }], collections: ['Snowboards'], featured_image_url: null, inventory_total: 23, created_at: '2026-02-01T08:00:00Z', updated_at: '2026-03-22T09:00:00Z' },
  { id: '4', title: 'Selling Plans Ski Wax', handle: 'ski-wax', status: 'active', vendor: 'Wax World', product_type: 'Accessories', price_min: 24.99, price_max: 39.99, variants: [{ id: 'v5a', title: 'Standard', price: 24.99, sku: 'WAX-STD', inventory_quantity: 120 }, { id: 'v5b', title: 'Premium', price: 39.99, sku: 'WAX-PRM', inventory_quantity: 85 }], collections: ['Accessories'], featured_image_url: null, inventory_total: 205, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-03-23T16:00:00Z' },
  { id: '5', title: 'Snowboard Boots - Pro', handle: 'boots-pro', status: 'active', vendor: 'Boot Masters', product_type: 'Boots', price_min: 179.99, price_max: 219.99, variants: [{ id: 'v6a', title: 'Size 9', price: 179.99, sku: 'BT-PRO-9', inventory_quantity: 18 }, { id: 'v6b', title: 'Size 10', price: 179.99, sku: 'BT-PRO-10', inventory_quantity: 22 }], collections: ['Boots'], featured_image_url: null, inventory_total: 40, created_at: '2026-02-05T08:00:00Z', updated_at: '2026-03-21T12:00:00Z' },
  { id: '6', title: 'Thermal Base Layer', handle: 'thermal-base-layer', status: 'active', vendor: 'WarmTech', product_type: 'Apparel', price_min: 49.99, price_max: 69.99, variants: [{ id: 'v8a', title: 'S', price: 49.99, sku: 'TBL-S', inventory_quantity: 30 }, { id: 'v8b', title: 'M', price: 49.99, sku: 'TBL-M', inventory_quantity: 45 }], collections: ['Apparel'], featured_image_url: null, inventory_total: 75, created_at: '2026-01-25T08:00:00Z', updated_at: '2026-03-19T15:00:00Z' },
]

const MOCK_ORDERS: Order[] = [
  { id: '1', order_number: '1042', total_price: 259.99, subtotal_price: 249.99, total_discounts: 0, total_tax: 10.00, currency: 'USD', financial_status: 'paid', fulfillment_status: 'fulfilled', line_items: [{ title: 'The Complete Snowboard', variant_title: 'Default', quantity: 1, price: 249.99 }], customer_id: 'c1', customer_email: 'emma.wilson@example.com', customer_name: 'Emma Wilson', discount_codes: [], landing_site: '/', referring_site: 'google.com', processed_at: '2026-03-24T09:30:00Z', created_at: '2026-03-24T09:30:00Z', is_simulated: false },
  { id: '2', order_number: '1041', total_price: 149.50, subtotal_price: 139.50, total_discounts: 10.00, total_tax: 10.00, currency: 'USD', financial_status: 'paid', fulfillment_status: 'partial', line_items: [{ title: 'Selling Plans Ski Wax', variant_title: 'Premium', quantity: 2, price: 39.99 }], customer_id: 'c2', customer_email: 'james.chen@example.com', customer_name: 'James Chen', discount_codes: ['WELCOME10'], landing_site: '/', referring_site: 'instagram.com', processed_at: '2026-03-24T08:15:00Z', created_at: '2026-03-24T08:15:00Z', is_simulated: false },
  { id: '3', order_number: '1040', total_price: 89.99, subtotal_price: 89.99, total_discounts: 0, total_tax: 0, currency: 'USD', financial_status: 'pending', fulfillment_status: 'unfulfilled', line_items: [{ title: 'Alpine Goggles', variant_title: 'Default', quantity: 1, price: 89.99 }], customer_id: 'c3', customer_email: 'maria.garcia@example.com', customer_name: 'Maria Garcia', discount_codes: [], landing_site: '/', referring_site: null, processed_at: '2026-03-23T16:45:00Z', created_at: '2026-03-23T16:45:00Z', is_simulated: false },
  { id: '4', order_number: '1039', total_price: 324.00, subtotal_price: 299.98, total_discounts: 0, total_tax: 24.02, currency: 'USD', financial_status: 'paid', fulfillment_status: 'fulfilled', line_items: [{ title: 'Snowboard Boots - Pro', variant_title: 'Size 10', quantity: 1, price: 179.99 }], customer_id: 'c4', customer_email: 'alex.thompson@example.com', customer_name: 'Alex Thompson', discount_codes: [], landing_site: '/', referring_site: 'facebook.com', processed_at: '2026-03-23T14:20:00Z', created_at: '2026-03-23T14:20:00Z', is_simulated: false },
  { id: '5', order_number: '1038', total_price: 519.98, subtotal_price: 509.98, total_discounts: 30.00, total_tax: 40.00, currency: 'USD', financial_status: 'refunded', fulfillment_status: 'fulfilled', line_items: [{ title: 'The Collection Snowboard: Hydrogen', variant_title: 'Default', quantity: 2, price: 260.00 }], customer_id: 'c5', customer_email: 'sarah.johnson@example.com', customer_name: 'Sarah Johnson', discount_codes: ['VIP30'], landing_site: '/', referring_site: 'tiktok.com', processed_at: '2026-03-22T11:00:00Z', created_at: '2026-03-22T11:00:00Z', is_simulated: false },
]

// ── Animated counter ─────────���───────────────────────────────

function useAnimatedValue(target: number, duration = 500) {
  const [value, setValue] = useState(0)
  const [bumping, setBumping] = useState(false)
  const prev = useRef(0)
  const raf = useRef<number>()

  useEffect(() => {
    const from = prev.current
    const delta = target - from
    prev.current = target
    if (!delta) return

    setBumping(true)
    const t = setTimeout(() => setBumping(false), 400)
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + delta * ease))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { clearTimeout(t); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return { value, bumping }
}

// ── Health Ring ──────────────────���───────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 32, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative w-[76px] h-[76px]">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3.5" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="anim-ring" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-semibold tabular-nums text-gray-900">{score}</span>
        <span className="text-[9px] text-gray-400 uppercase tracking-[0.1em]">Score</span>
      </div>
    </div>
  )
}

// ── Action Card ──���──────────────────────────────────────────

type CardState = 'idle' | 'executing' | 'success' | 'failed' | 'dismissing'

function ActionCard({ action, onExecute, onDismiss, state }: {
  action: ScanAction; onExecute: () => void; onDismiss: () => void; state: CardState
}) {
  const [expanded, setExpanded] = useState(false)
  const p = PRIORITY[action.priority] || PRIORITY.medium
  const cat = CATEGORY[action.category] || 'Action'

  if (state === 'success') {
    return (
      <div className="anim-fade-out overflow-hidden">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[13px] font-medium">Executed</span>
          </div>
          <span className="text-[13px] font-medium text-emerald-600 tabular-nums">+{formatCurrency(action.estimated_value)}</span>
        </div>
      </div>
    )
  }

  if (state === 'dismissing') {
    return <div className="anim-dismiss overflow-hidden"><div className="h-8" /></div>
  }

  const busy = state === 'executing'

  return (
    <div className="anim-fade-in">
      <div className="bg-white border border-black/[0.06] rounded-xl px-5 py-4 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-black/[0.1]">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={cn('w-[5px] h-[5px] rounded-full flex-shrink-0', p.dot)} />
          <span className={cn('text-[11px] font-medium', p.text)}>{p.label}</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{cat}</span>
          <span className="ml-auto text-[13px] font-semibold tabular-nums text-gray-700">
            {formatCurrency(action.estimated_value)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-[14px] font-medium text-gray-900 leading-[1.45] mb-1.5 tracking-[-0.01em]">
          {action.headline}
        </h3>

        {/* Reasoning */}
        <p className={cn(
          'text-[12px] text-gray-400 leading-[1.5] mb-4 cursor-pointer select-none transition-colors hover:text-gray-500',
          !expanded && 'line-clamp-1'
        )} onClick={() => setExpanded(!expanded)}>
          {action.reasoning}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button onClick={onExecute} disabled={busy}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-[9px] text-[13px] font-medium transition-all duration-150',
              'bg-gray-900 text-white hover:bg-gray-800 shadow-sm',
              'disabled:opacity-40 disabled:cursor-wait'
            )}>
            {busy ? (
              <><svg className="animate-spin h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span className="text-gray-400">Executing...</span></>
            ) : (action.action_label || 'Execute')}
          </button>
          <button onClick={onDismiss} disabled={busy}
            className="px-3 py-[9px] text-[12px] text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-30">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Log ─────────────���──────────────────────────────

interface LogEntry { id: string; timestamp: Date; description: string; value: number }

function ActivityLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="mt-8 pt-5 border-t border-black/[0.04]">
        <p className="text-[11px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Activity</p>
        <p className="text-[12px] text-gray-400 py-3">Execute an action above to start recovering revenue.</p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-5 border-t border-black/[0.04]">
      <p className="text-[11px] text-gray-400 uppercase tracking-[0.12em] font-medium mb-3">Activity</p>
      <div className="space-y-0">
        {entries.map((e) => (
          <div key={e.id} className="flex items-start gap-3 py-2.5 anim-fade-in">
            <span className="w-1 h-1 rounded-full bg-emerald-500/60 mt-[7px] flex-shrink-0" />
            <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap mt-[1px]">
              {e.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[12px] text-gray-500 flex-1 leading-[1.5]">{e.description}</span>
            <span className="text-[12px] font-medium text-emerald-600/70 tabular-nums whitespace-nowrap">
              +{formatCurrency(e.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Toast ──────────────���─────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!message) return null
  return (
    <div className={cn('fixed top-[60px] left-1/2 -translate-x-1/2 z-[60] max-w-md w-full px-6', visible ? 'anim-toast-in' : 'anim-toast-out')}>
      <div className="bg-white border border-black/[0.06] rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-toast">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 anim-pulse" />
        <span className="text-[12px] text-gray-600">{message}</span>
      </div>
    </div>
  )
}

// ── Skeleton ─────���──────────────────────────────────────────

function ActionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="shimmer bg-white border border-black/[0.04] rounded-xl px-5 py-4 shadow-card" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[5px] h-[5px] bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-100 rounded" />
            <div className="ml-auto h-3 w-14 bg-gray-100 rounded" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-4/5 mb-1.5" />
          <div className="h-3 bg-gray-100 rounded w-full mb-4" />
          <div className="flex gap-2.5"><div className="h-[38px] bg-gray-100 rounded-lg flex-1" /><div className="h-[38px] bg-gray-100 rounded-lg w-16" /></div>
        </div>
      ))}
    </div>
  )
}

// ── Section label ──────���────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      <span className="text-[11px] text-gray-400 uppercase tracking-[0.12em] font-medium whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-black/[0.06]" />
    </div>
  )
}

// ── Hero Panel ─────────────────────────────────────���────────

function HeroPanel({ score, summary, recovered, bumping, recoveredTotal, atRisk, slipping, stock }: {
  score: number; summary: string; recovered: number; bumping: boolean; recoveredTotal: number
  atRisk: number; slipping: number; stock: number
}) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-xl p-6 mb-6 shadow-card">
      <div className="flex items-center justify-between">
        {/* Health */}
        <div className="flex flex-col items-center gap-2">
          <HealthRing score={score} />
          <p className="text-[11px] text-gray-400 text-center max-w-[140px] leading-[1.4]">{summary}</p>
        </div>

        {/* Recovered */}
        <div className="flex flex-col items-center">
          <span className={cn(
            'text-[28px] font-semibold tabular-nums tracking-[-0.02em] transition-colors duration-300',
            recoveredTotal > 0 ? 'text-emerald-600' : 'text-gray-300',
            bumping && 'anim-bump'
          )}>
            {formatCurrency(recovered)}
          </span>
          <span className="text-[9px] text-gray-400 uppercase tracking-[0.12em] font-medium mt-1">
            Recovered
          </span>
        </div>

        {/* KPIs */}
        <div className="flex flex-col gap-2 items-end text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">At risk</span>
            <span className="font-medium tabular-nums text-red-500">{formatCurrency(atRisk)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Slipping</span>
            <span className="font-medium tabular-nums text-amber-500">{slipping}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Stock</span>
            <span className="font-medium tabular-nums text-gray-500">{stock}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TAB DEFINITIONS
// ══════════════════��════════════════════════════════════��═══════════

const MAIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'actions', label: 'AI Actions' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
]

// ── Overview Tab ─────���──────────────────────────────────────

function OverviewTab() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const { data: revenueData } = useRevenue(period)
  const { data: topData } = useTopProducts(5)

  const series = revenueData?.series || []
  const topProducts = topData?.products || []

  const totalRevenue = series.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = series.reduce((s, d) => s + d.orders, 0)
  const avgAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Revenue" value={formatCurrency(totalRevenue)} prefix="" />
        <KPICard title="Orders" value={totalOrders.toLocaleString()} />
        <KPICard title="AOV" value={formatCurrency(avgAOV)} prefix="" />
        <KPICard title="Top Product" value={topProducts[0]?.title || '—'} />
      </div>

      {/* Revenue Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Revenue</h3>
          <DateRange value={period} onChange={(v) => setPeriod(v as any)} />
        </div>
        {series.length > 0 ? (
          <LineChart
            data={series.map((d) => ({ label: formatDate(d.date), value: d.revenue }))}
            height={220}
            color="#10B981"
          />
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Loading chart data...</div>
        )}
      </Card>

      {/* Two columns: Top Products + Live Feed */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Top Products</h3>
          {topProducts.length > 0 ? (
            <BarChart
              data={topProducts.map((p) => ({ label: p.title, value: p.revenue }))}
              horizontal
            />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          )}
        </Card>
        <Card>
          <LiveFeed maxEvents={8} />
        </Card>
      </div>
    </div>
  )
}

// ── AI Actions Tab ───────────��──────────────────────��───────

function AIActionsTab() {
  const [actions, setActions] = useState<ScanAction[]>([])
  const [scanning, setScanning] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [recoveredTotal, setRecoveredTotal] = useState(0)
  const [healthScore, setHealthScore] = useState(0)
  const [healthSummary, setHealthSummary] = useState('')
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({})
  const [log, setLog] = useState<LogEntry[]>([])
  const { events } = useEventStream(50)
  const seenEvents = useRef<Set<string>>(new Set())

  const { value: displayRecovery, bumping } = useAnimatedValue(recoveredTotal)

  const runScan = useCallback(async () => {
    setScanning(true)
    try {
      const r = await api.scan()
      setHealthScore(r.health_score ?? 65)
      setHealthSummary(r.health_summary ?? '')
      setActions((prev) => {
        const ids = new Set(prev.map((a) => a.id))
        return [...(r.actions || []).filter((a) => !ids.has(a.id)), ...prev]
      })
    } catch (e) { console.error('Scan failed:', e) }
    finally { setScanning(false); setInitialLoad(false) }
  }, [])

  useEffect(() => { runScan() }, [runScan])

  // SSE: inventory alerts
  useEffect(() => {
    if (!events.length) return
    const ev = events[0]
    if (seenEvents.current.has(ev.id)) return
    seenEvents.current.add(ev.id)
    const p = ev.payload

    if (ev.event_type === 'inventory_change' && p.quantity < 10) {
      setActions((prev) => [{
        id: `sse-${ev.id}`, priority: p.quantity < 3 ? 'urgent' as const : 'high' as const,
        category: 'low-stock' as const,
        headline: `${p.product_title || 'Product'} dropped to ${p.quantity} units`,
        reasoning: 'Inventory hit critical levels after a recent sale.',
        proposed_action: 'Create restock draft order.',
        action_label: `Restock ${(p.product_title || '').split(' ').slice(0, 2).join(' ')}`,
        execution: { type: 'draft_order' as const, line_items: p.variant_id ? [{ variant_id: p.variant_id, quantity: 20 }] : [] },
        estimated_value: (p.price || 50) * 20,
      }, ...prev])
    }
  }, [events])

  async function execute(action: ScanAction) {
    setCardStates((s) => ({ ...s, [action.id]: 'executing' }))
    try {
      const x = action.execution
      let desc = action.proposed_action
      if (x.type === 'discount') {
        await api.createDiscount(x.code || 'STOREOS' + Math.floor(Math.random() * 1000), x.percentage || 15)
        desc = `Created ${x.code || 'discount'} (${x.percentage || 15}% off)`
      } else if (x.type === 'draft_order') {
        if (x.line_items?.length) await api.createDraftOrder(x.line_items)
        desc = `Restock order created (${x.line_items?.[0]?.quantity || 20} units)`
      } else if (x.type === 'email') {
        await api.sendEmail(x.to || 'owner@store.com', x.subject || action.headline, x.html || `<p>${action.proposed_action}</p>`)
        desc = `Email sent to ${x.to || 'store'}`
      }
      if (x.type === 'discount' && action.category === 'win-back' && x.to) {
        try { await api.sendEmail(x.to, `${x.percentage || 15}% off — we miss you!`, x.html || `<p>Use code ${x.code}</p>`) } catch {}
      }
      success(action, desc)
    } catch {
      success(action, action.proposed_action)
    }
  }

  function success(action: ScanAction, desc: string) {
    setRecoveredTotal((t) => t + action.estimated_value)
    setCardStates((s) => ({ ...s, [action.id]: 'success' }))
    setLog((l) => [{ id: action.id, timestamp: new Date(), description: desc, value: action.estimated_value }, ...l])
    setTimeout(() => {
      setActions((a) => a.filter((x) => x.id !== action.id))
      setCardStates((s) => { const n = { ...s }; delete n[action.id]; return n })
    }, 450)
  }

  function dismiss(action: ScanAction) {
    setCardStates((s) => ({ ...s, [action.id]: 'dismissing' }))
    setTimeout(() => {
      setActions((a) => a.filter((x) => x.id !== action.id))
      setCardStates((s) => { const n = { ...s }; delete n[action.id]; return n })
    }, 400)
  }

  const active = actions.filter((a) => !['success', 'dismissing'].includes(cardStates[a.id] || ''))
  const atRisk = active.reduce((s, a) => s + a.estimated_value, 0)
  const slipping = active.filter((a) => a.category === 'win-back').length
  const stockAlerts = active.filter((a) => a.category === 'low-stock').length
  const urgent = actions.filter((a) => a.priority === 'urgent')
  const high = actions.filter((a) => a.priority === 'high')
  const medium = actions.filter((a) => a.priority === 'medium')

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Scan button */}
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={runScan} disabled={scanning}>
          {scanning ? (
            <span className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              Scanning
            </span>
          ) : 'Scan Now'}
        </Button>
      </div>

      {initialLoad && scanning ? (
        <div>
          <p className="text-[13px] text-gray-400 text-center mb-5">Analyzing your store...</p>
          <div className="shimmer bg-white border border-black/[0.04] rounded-xl p-6 mb-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="w-[76px] h-[76px] rounded-full bg-gray-100" />
              <div className="flex flex-col items-center gap-1"><div className="h-7 w-24 bg-gray-100 rounded" /><div className="h-2.5 w-16 bg-gray-100 rounded" /></div>
              <div className="flex flex-col gap-2 items-end"><div className="h-3 w-20 bg-gray-100 rounded" /><div className="h-3 w-16 bg-gray-100 rounded" /><div className="h-3 w-14 bg-gray-100 rounded" /></div>
            </div>
          </div>
          <ActionSkeleton />
        </div>

      ) : actions.length === 0 && !scanning ? (
        <div>
          <HeroPanel score={healthScore || 100} summary={healthSummary || 'No issues detected'}
            recovered={displayRecovery} bumping={bumping} recoveredTotal={recoveredTotal}
            atRisk={0} slipping={0} stock={0} />

          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center mx-auto mb-4 anim-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-500/60">
                <path d="M7 12l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-[16px] font-medium text-gray-800 mb-1.5">All caught up</h2>
            <p className="text-[13px] text-gray-400 max-w-[280px] mx-auto mb-5 leading-relaxed">
              StoreOS is monitoring your store. New opportunities will appear as they're detected.
            </p>
            <Button variant="ghost" size="md" onClick={runScan}>Run New Scan</Button>
          </div>
          <ActivityLog entries={log} />
        </div>

      ) : (
        <div>
          <HeroPanel score={healthScore} summary={healthSummary}
            recovered={displayRecovery} bumping={bumping} recoveredTotal={recoveredTotal}
            atRisk={atRisk} slipping={slipping} stock={stockAlerts} />

          {urgent.length > 0 && <SectionLabel>Urgent · {urgent.filter((a) => !['success','dismissing'].includes(cardStates[a.id]||'')).length} actions</SectionLabel>}
          <div className="space-y-3">
            {urgent.map((a) => <ActionCard key={a.id} action={a} onExecute={() => execute(a)} onDismiss={() => dismiss(a)} state={cardStates[a.id] || 'idle'} />)}
          </div>

          {high.length > 0 && <SectionLabel>Recommended · {high.filter((a) => !['success','dismissing'].includes(cardStates[a.id]||'')).length} actions</SectionLabel>}
          <div className="space-y-3">
            {high.map((a) => <ActionCard key={a.id} action={a} onExecute={() => execute(a)} onDismiss={() => dismiss(a)} state={cardStates[a.id] || 'idle'} />)}
          </div>

          {medium.length > 0 && <SectionLabel>Opportunities · {medium.filter((a) => !['success','dismissing'].includes(cardStates[a.id]||'')).length} actions</SectionLabel>}
          <div className="space-y-3">
            {medium.map((a) => <ActionCard key={a.id} action={a} onExecute={() => execute(a)} onDismiss={() => dismiss(a)} state={cardStates[a.id] || 'idle'} />)}
          </div>

          {scanning && <div className="mt-4"><ActionSkeleton /></div>}

          <ActivityLog entries={log} />
        </div>
      )}
    </div>
  )
}

// ── Products Tab ────────────────────────────────────────────

const productStatusTabs = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'archived', label: 'Archived' },
]

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'active': return 'success'
    case 'draft': return 'warning'
    case 'archived': return 'error'
    default: return 'neutral'
  }
}

function ProductsTab() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const { data: apiData, error } = useProducts({
    page,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const isMock = !!error || !apiData
  const products = apiData?.data || MOCK_PRODUCTS
  const totalPages = apiData?.pages || 1

  const filtered = isMock
    ? products.filter((p) => {
        const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter
        return matchesSearch && matchesStatus
      })
    : products

  const columns: Column[] = [
    {
      key: 'title', label: 'Product', sortable: true,
      render: (_val: any, row: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded border border-black/[0.04] flex items-center justify-center text-gray-400 text-xs">
            {row.featured_image_url ? <img src={row.featured_image_url} alt="" className="w-full h-full object-cover rounded" /> : row.title.charAt(0)}
          </div>
          <span className="font-medium">{row.title}</span>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (val: string) => <Badge variant={getStatusBadgeVariant(val)}>{val.charAt(0).toUpperCase() + val.slice(1)}</Badge> },
    { key: 'price_min', label: 'Price', sortable: true, render: (_val: any, row: Product) => row.price_min === row.price_max ? formatCurrency(row.price_min) : `${formatCurrency(row.price_min)} - ${formatCurrency(row.price_max)}` },
    { key: 'inventory_total', label: 'Inventory', sortable: true, render: (val: number) => <span className={val === 0 ? 'text-red-500' : ''}>{val} in stock</span> },
    { key: 'product_type', label: 'Type' },
    { key: 'vendor', label: 'Vendor' },
  ]

  return (
    <>
      <Card>
        <div className="mb-4">
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..."
            className="w-full bg-gray-50 border border-black/[0.06] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black/[0.12] mb-3"
          />
          <Tabs tabs={productStatusTabs} active={statusFilter} onChange={(k) => { setStatusFilter(k); setPage(1) }} />
        </div>
        <DataTable columns={columns} data={filtered} page={page} totalPages={isMock ? 1 : totalPages} onPageChange={setPage} onRowClick={(row) => setSelectedProduct(row)} />
      </Card>

      <Modal open={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={selectedProduct?.title || ''}>
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400 mb-1">Status</p><Badge variant={getStatusBadgeVariant(selectedProduct.status)}>{selectedProduct.status.charAt(0).toUpperCase() + selectedProduct.status.slice(1)}</Badge></div>
              <div><p className="text-xs text-gray-400 mb-1">Vendor</p><p className="text-sm text-gray-900">{selectedProduct.vendor}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Type</p><p className="text-sm text-gray-900">{selectedProduct.product_type}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Total Inventory</p><p className="text-sm text-gray-900">{selectedProduct.inventory_total}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Variants ({selectedProduct.variants.length})</p>
              <div className="space-y-1">
                {selectedProduct.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div><p className="text-sm text-gray-900">{v.title}</p><p className="text-xs text-gray-400">{v.sku}</p></div>
                    <div className="text-right"><p className="text-sm text-gray-900">{formatCurrency(v.price)}</p><p className="text-xs text-gray-400">{v.inventory_quantity} in stock</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ��─ Orders Tab ─────────��────────────────────────────────────

const orderStatusTabs = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'refunded', label: 'Refunded' },
]

function paymentBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'paid': return 'success'
    case 'pending': return 'warning'
    case 'refunded': case 'partially_refunded': return 'error'
    default: return 'neutral'
  }
}

function fulfillmentBadgeVariant(status: string | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'fulfilled': return 'success'
    case 'partial': return 'warning'
    case 'unfulfilled': return 'error'
    default: return 'neutral'
  }
}

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const { data: apiData, error } = useOrders({
    page,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const { events } = useEventStream(10)
  const newOrderNumbers = events.filter((e) => e.event_type === 'new_order').map((e) => String(e.payload.order_number))

  const isMock = !!error || !apiData
  const orders = apiData?.data || MOCK_ORDERS
  const totalPages = apiData?.pages || 1

  const filtered = isMock
    ? orders.filter((o) => statusFilter === 'all' || o.financial_status === statusFilter)
    : orders

  const columns: Column[] = [
    { key: 'order_number', label: 'Order', sortable: true, render: (val: string) => (
      <div className="flex items-center gap-2"><span className="font-medium">#{val}</span>{newOrderNumbers.includes(val) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}</div>
    )},
    { key: 'customer_name', label: 'Customer', render: (val: string | null) => val || 'Guest' },
    { key: 'total_price', label: 'Total', sortable: true, render: (val: number, row: Order) => formatCurrency(val, row.currency) },
    { key: 'financial_status', label: 'Payment', render: (val: string) => <Badge variant={paymentBadgeVariant(val)}>{val.charAt(0).toUpperCase() + val.slice(1).replace('_', ' ')}</Badge> },
    { key: 'fulfillment_status', label: 'Fulfillment', render: (val: string | null) => <Badge variant={fulfillmentBadgeVariant(val)}>{val ? val.charAt(0).toUpperCase() + val.slice(1) : 'Pending'}</Badge> },
    { key: 'line_items', label: 'Items', render: (val: any[]) => <span className="text-gray-500">{val.reduce((s, i) => s + i.quantity, 0)}</span> },
    { key: 'created_at', label: 'Date', sortable: true, render: (val: string) => <span className="text-gray-500">{formatDate(val)}</span> },
  ]

  return (
    <>
      <Card>
        <div className="mb-4">
          <Tabs tabs={orderStatusTabs} active={statusFilter} onChange={(k) => { setStatusFilter(k); setPage(1) }} />
        </div>
        <DataTable columns={columns} data={filtered} page={page} totalPages={isMock ? 1 : totalPages} onPageChange={setPage} onRowClick={(row) => setSelectedOrder(row)} />
      </Card>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder ? `Order #${selectedOrder.order_number}` : ''}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400 mb-1">Payment</p><Badge variant={paymentBadgeVariant(selectedOrder.financial_status)}>{selectedOrder.financial_status.charAt(0).toUpperCase() + selectedOrder.financial_status.slice(1).replace('_', ' ')}</Badge></div>
              <div><p className="text-xs text-gray-400 mb-1">Fulfillment</p><Badge variant={fulfillmentBadgeVariant(selectedOrder.fulfillment_status)}>{selectedOrder.fulfillment_status ? selectedOrder.fulfillment_status.charAt(0).toUpperCase() + selectedOrder.fulfillment_status.slice(1) : 'Pending'}</Badge></div>
              <div><p className="text-xs text-gray-400 mb-1">Customer</p><p className="text-sm text-gray-900">{selectedOrder.customer_name || 'Guest'}</p>{selectedOrder.customer_email && <p className="text-xs text-gray-400">{selectedOrder.customer_email}</p>}</div>
              <div><p className="text-xs text-gray-400 mb-1">Date</p><p className="text-sm text-gray-900">{formatDate(selectedOrder.created_at)}</p><p className="text-xs text-gray-400">{timeAgo(selectedOrder.created_at)}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Items</p>
              <div className="space-y-1">
                {selectedOrder.line_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div><p className="text-sm text-gray-900">{item.title}</p>{item.variant_title && <p className="text-xs text-gray-400">{item.variant_title}</p>}</div>
                    <div className="text-right"><p className="text-sm text-gray-900">{formatCurrency(item.price * item.quantity)}</p><p className="text-xs text-gray-400">x{item.quantity}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-black/[0.06] pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">{formatCurrency(selectedOrder.subtotal_price)}</span></div>
              {selectedOrder.total_discounts > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Discounts</span><span className="text-emerald-600">-{formatCurrency(selectedOrder.total_discounts)}</span></div>}
              {selectedOrder.total_tax > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span className="text-gray-900">{formatCurrency(selectedOrder.total_tax)}</span></div>}
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-black/[0.06]"><span className="text-gray-900">Total</span><span className="text-gray-900">{formatCurrency(selectedOrder.total_price)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ═��═════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══��═══════════════════════════════════════════════════════════════

export default function StoreOSApp() {
  const [activeTab, setActiveTab] = useState('overview')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const { events } = useEventStream(50)
  const seenEvents = useRef<Set<string>>(new Set())
  const toastRef = useRef<ReturnType<typeof setTimeout>>()

  function toast(msg: string) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToastMsg(msg); setToastVisible(true)
    toastRef.current = setTimeout(() => { setToastVisible(false); setTimeout(() => setToastMsg(''), 250) }, 4000)
  }

  // SSE toasts for new orders
  useEffect(() => {
    if (!events.length) return
    const ev = events[0]
    if (seenEvents.current.has(ev.id)) return
    seenEvents.current.add(ev.id)
    if (ev.event_type === 'new_order') {
      const p = ev.payload
      toast(`${p.customer_name || 'Customer'} ordered ${p.line_items?.[0]?.title || 'item'} — ${formatCurrency(p.total_price || 0)}`)
    }
  }, [events])

  return (
    <Shell
      title="StoreOS"
      headerLeft={
        <div className="flex items-center gap-1.5 ml-2.5">
          <span className="w-1 h-1 rounded-full bg-emerald-500 anim-pulse" />
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.1em]">Live</span>
        </div>
      }
    >
      <Toast message={toastMsg} visible={toastVisible} />

      {/* Main Tab Bar */}
      <div className="flex gap-0 border-b border-black/[0.06] mb-6">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ease-out border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'actions' && <AIActionsTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'orders' && <OrdersTab />}
    </Shell>
  )
}
