"use client";

import { TrendingUp, TrendingDown, MessageSquare, MousePointerClick, CheckCircle, Target, Users } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useState, useEffect } from "react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  color: string;
  subtitle: string;
  delay?: number;
}

function StatCard({ title, value, change, trend, icon: Icon, color, subtitle, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);
  
  const numericValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [isVisible, numericValue]);

  const colorConfig: Record<string, { bg: string; text: string; iconBg: string }> = {
    purple: { bg: "from-purple-50 to-purple-100/50", text: "text-purple-600", iconBg: "bg-purple-100" },
    green: { bg: "from-green-50 to-green-100/50", text: "text-green-600", iconBg: "bg-green-100" },
    orange: { bg: "from-orange-50 to-orange-100/50", text: "text-orange-600", iconBg: "bg-orange-100" },
    blue: { bg: "from-blue-50 to-blue-100/50", text: "text-blue-600", iconBg: "bg-blue-100" }
  };

  const colors = colorConfig[color] || colorConfig.blue;
  const isPositive = trend === "up";
  const displayValue = value.includes('%') ? `${count}%` : count;

  return (
    <Card className={`group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <CardContent className={`p-0 bg-gradient-to-br ${colors.bg}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-7 h-7 ${colors.text}`} />
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {change}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-4xl font-bold text-gray-900">{displayValue}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Target className="w-3 h-3" />{subtitle}
            </p>
          </div>
        </div>
        <div className="h-1.5 bg-gray-200/50 mx-6 mb-6 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${color === 'purple' ? 'from-purple-500 to-purple-600' : color === 'green' ? 'from-green-500 to-green-600' : color === 'orange' ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'} transition-all duration-1000`} style={{ width: isVisible ? `${Math.min(numericValue, 100)}%` : '0%' }}/>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsCards() {
  const stats = [
    { title: "Reply Rate", value: "18%", change: "-2%", trend: "down" as const, icon: MessageSquare, color: "purple", subtitle: "Target: 20%" },
    { title: "Click Rate", value: "8%", change: "+1%", trend: "up" as const, icon: MousePointerClick, color: "green", subtitle: "North Star ⭐" },
    { title: "Conversions", value: "12", change: "+3", trend: "up" as const, icon: CheckCircle, color: "orange", subtitle: "Ce mois" },
    { title: "Active Leads", value: "247", change: "+12%", trend: "up" as const, icon: Users, color: "blue", subtitle: "En prospection" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (<StatCard key={stat.title} {...stat} delay={idx * 100} />))}
    </div>
  );
}
