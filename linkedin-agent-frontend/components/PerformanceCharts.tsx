"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { TrendingUp, Users, CheckCircle, ArrowUpRight } from "lucide-react";

interface FunnelItem {
  stage: string;
  count: number;
  color: string;
}

interface GrowthItem {
  day: string;
  qualified: number;
  sent: number;
  target: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>

        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PerformanceCharts() {
  const [funnelData, setFunnelData] = useState<FunnelItem[]>([
    { stage: "Identified", count: 0, color: "rgba(194, 96, 30, 0.85)" },
    { stage: "Contacted", count: 0, color: "rgba(37, 99, 235, 0.85)" },
    { stage: "Replied", count: 0, color: "rgba(109, 40, 217, 0.85)" },
    { stage: "Clicked", count: 0, color: "rgba(21, 128, 61, 0.85)" },
    { stage: "Converted", count: 0, color: "rgba(161, 98, 7, 0.85)" },
  ]);

  const [growthData, setGrowthData] = useState<GrowthItem[]>([
    { day: "Day 1", qualified: 0, sent: 0, target: 0 },
    { day: "Day 5", qualified: 0, sent: 0, target: 0 },
    { day: "Day 10", qualified: 0, sent: 0, target: 0 },
    { day: "Day 15", qualified: 0, sent: 0, target: 0 },
    { day: "Day 20", qualified: 0, sent: 0, target: 0 },
    { day: "Day 25", qualified: 0, sent: 0, target: 0 },
    { day: "Day 30", qualified: 0, sent: 0, target: 0 },
  ]);

  const [conversionRate, setConversionRate] = useState("0%");
  const [growthPercent, setGrowthPercent] = useState("+0%");

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (data.success) {
          if (data.stats.funnel && data.stats.funnel.length > 0) {
            setFunnelData(data.stats.funnel);
          }

          if (data.stats.growth && data.stats.growth.length > 0) {
            setGrowthData(data.stats.growth);
          }

          if (data.stats.campaigns?.conversion_rate) {
            setConversionRate(`${data.stats.campaigns.conversion_rate}%`);
          }

          if (data.stats.growthPercent) {
            setGrowthPercent(`+${data.stats.growthPercent}%`);
          }
        }
      } catch (error) {
        console.error("Error fetching performance stats:", error);
      }
    }

    fetchStats();
  }, []);

  const totalProspects = funnelData[0]?.count || 250;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Growth Chart */}

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>

              <div>
                <CardTitle className="text-lg">
                  Croissance sur 30 jours
                </CardTitle>

                <p className="text-xs text-gray-500">
                  Leads intéressés vs invitations envoyées
                </p>
              </div>

            </div>

            <Badge className="bg-green-100 text-green-700 border-0">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              {growthPercent}
            </Badge>

          </div>
        </CardHeader>

        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            
            <AreaChart
              data={growthData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >

              <defs>
                <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>

                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend wrapperStyle={{ paddingTop: "20px" }} />

              <Area
                type="monotone"
                dataKey="qualified"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorQualified)"
                name="Leads Intéressés"
              />

              <Area
                type="monotone"
                dataKey="sent"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSent)"
                name="Invitations Envoyées"
              />

            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Funnel Chart */}

      <Card className="border-0 shadow-lg overflow-hidden">

        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>

              <div>
                <CardTitle className="text-lg">
                  Funnel de Conversion
                </CardTitle>

                <p className="text-xs text-gray-500">
                  Parcours prospect → client
                </p>
              </div>

            </div>

            <Badge className="bg-blue-100 text-blue-700 border-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              {conversionRate} global
            </Badge>

          </div>

        </CardHeader>

        <CardContent className="p-6">

          <ResponsiveContainer width="100%" height={280}>

            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                horizontal
                vertical={false}
              />

              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />

              <YAxis
                dataKey="stage"
                type="category"
                width={90}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
              />

              <Tooltip />

              <Bar
                dataKey="count"
                radius={[0, 8, 8, 0]}
                barSize={32}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={1}
              >

                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </CardContent>

      </Card>

    </div>
  );
}