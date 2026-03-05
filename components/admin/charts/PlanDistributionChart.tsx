"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltipContent } from "@/components/ui/chart"

const COLORS: Record<string, string> = {
  Pessoal: "#94a3b8",
  Pro: "#3b82f6",
  Business: "#8b5cf6",
  Agency: "#10b981",
}

interface PlanDistributionChartProps {
  data: Array<{ plan: string; value: number }>
}

function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Distribuicao por Plano</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="plan"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.plan}
                    fill={COLORS[entry.plan] || "#94a3b8"}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltipContent hideLabel />}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export { PlanDistributionChart }
