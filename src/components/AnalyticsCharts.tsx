import React, { useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ServiceRecord, StoreProfile } from '../types';
import { getStatusDetails } from '../utils/formatters';

interface AnalyticsChartsProps {
  services: ServiceRecord[];
  stores: StoreProfile[];
}

const STATUS_COLORS: Record<string, string> = {
  pago: '#10b981',      // emerald-500
  pendente: '#f59e0b',  // amber-500
  parcial: '#0ea5e9',   // sky-500
  atrasado: '#f43f5e',  // rose-500
  cancelado: '#94a3b8', // slate-400
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  services,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Status Distribution data for Donut Chart
  const statusCounts: Record<string, number> = {
    pago: 0,
    pendente: 0,
    parcial: 0,
    atrasado: 0,
  };

  services.forEach((s) => {
    if (statusCounts[s.paymentStatus] !== undefined) {
      statusCounts[s.paymentStatus] += 1;
    } else {
      statusCounts[s.paymentStatus] = 1;
    }
  });

  const pieData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: getStatusDetails(status as any).label,
      rawStatus: status,
      value: count,
      color: STATUS_COLORS[status] || '#64748b',
    }));

  const totalServices = pieData.reduce((sum, item) => sum + item.value, 0);

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const slices = pieData.map((item, index) => {
    const percentage = totalServices > 0 ? (item.value / totalServices) * 100 : 0;
    const strokeDasharray = `${(item.value / (totalServices || 1)) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += (item.value / (totalServices || 1)) * circumference;

    return {
      ...item,
      index,
      percentage,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="w-full">
      {/* Donut Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-sky-600" />
              <span>Status dos Pagamentos</span>
            </h3>
            <p className="text-xs text-slate-500">Distribuição proporcional dos serviços cadastrados</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            Total: {totalServices}
          </span>
        </div>

        <div className="h-56 w-full my-auto flex flex-col items-center justify-center relative">
          {totalServices > 0 ? (
            <div className="relative flex items-center justify-center">
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />

                {/* Slices */}
                {slices.map((slice) => {
                  const isHovered = hoveredIndex === slice.index;
                  return (
                    <circle
                      key={slice.name}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      fill="transparent"
                      strokeLinecap="round"
                      className="transition-all duration-200 cursor-pointer"
                      style={{
                        opacity: hoveredIndex === null || isHovered ? 1 : 0.6,
                      }}
                      onMouseEnter={() => setHoveredIndex(slice.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Center information hole */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none"
              >
                {activeSlice ? (
                  <>
                    <span 
                      className="text-xs font-bold truncate max-w-[100px]" 
                      style={{ color: activeSlice.color }}
                    >
                      {activeSlice.name}
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 leading-tight">
                      {activeSlice.value}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {activeSlice.percentage.toFixed(0)}% do total
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-slate-900 leading-tight">
                      {totalServices}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      serviços
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs py-8">
              Nenhum registro para exibir no gráfico
            </div>
          )}
        </div>

        {/* Custom Clean Legend below Pie */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          {slices.map((item) => (
            <div
              key={item.name}
              onMouseEnter={() => setHoveredIndex(item.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition cursor-pointer ${
                hoveredIndex === item.index ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="font-bold text-slate-800">{item.value}</span>
                <span className="text-[10px] text-slate-400">({item.percentage.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
