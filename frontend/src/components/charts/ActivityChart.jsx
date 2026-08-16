import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import './charts.css';

/** Shared tooltip so every chart in the product reads the same way. */
export function ChartTooltip({ active, payload, label, labelFormat = 'd MMM yyyy' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="chart-tip__label">
        {typeof label === 'string' && label.includes('-') ? format(parseISO(label), labelFormat) : label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tip__row">
          <span className="chart-tip__swatch" style={{ background: p.color }} />
          <span className="grow">{p.name}</span>
          <span className="mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ActivityChart({ data = [], height = 260 }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-1)" stopOpacity={0.34} />
              <stop offset="100%" stopColor="var(--viz-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-4)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--viz-4)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(parseISO(d), 'd MMM')}
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={38}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
          />

          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="var(--viz-1)"
            strokeWidth={2}
            fill="url(#gradCompleted)"
          />
          <Area
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="var(--viz-4)"
            strokeWidth={1.6}
            strokeDasharray="4 3"
            fill="url(#gradCreated)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
