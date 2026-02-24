"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltipContent } from "@/components/ui/chart"

const COLORS: Record<string, string> = {
  "Trial Ativo": "#f59e0b",
  "Trial Expirado": "#ef4444",
  Convertido: "#10b981",
  Outro: "#94a3b8",
}

interface TrialStatusChartProps {
  data: Array<{ status: string; value: number }>
}

function TrialStatusChart({ data }: TrialStatusChartProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Status de Trials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" name="Workspaces" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={COLORS[entry.status] || "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export { TrialStatusChart }
