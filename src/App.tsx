import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/Layout/AppLayout';
import FireworksPage from '@/pages/FireworksPage/FireworksPage';
import PatternPage from '@/pages/PatternPage/PatternPage';
import TimelinePage from '@/pages/TimelinePage/TimelinePage';
import WindSimulationPage from '@/pages/WindSimulationPage/WindSimulationPage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';
import { useFireworkStore } from '@/store/useFireworkStore';
import { useEffect } from 'react';
import type { Firework } from '@/types';

const sampleFireworks: Omit<Firework, 'id' | 'createdAt'>[] = [
  {
    name: '红牡丹',
    model: 'HW-R001',
    ascentTime: 4.5,
    burstHeight: 80,
    spreadRadius: 15,
    color: '#ff4757',
    effectType: 'peony',
    smokeVolume: 0.6,
  },
  {
    name: '金菊花',
    model: 'HW-Y002',
    ascentTime: 5.2,
    burstHeight: 100,
    spreadRadius: 20,
    color: '#ffd700',
    effectType: 'chrysanthemum',
    smokeVolume: 0.7,
  },
  {
    name: '银垂柳',
    model: 'HW-W003',
    ascentTime: 6.0,
    burstHeight: 120,
    spreadRadius: 25,
    color: '#ffffff',
    effectType: 'willow',
    smokeVolume: 0.8,
  },
  {
    name: '蓝圆环',
    model: 'HW-B004',
    ascentTime: 4.0,
    burstHeight: 70,
    spreadRadius: 12,
    color: '#00d4ff',
    effectType: 'ring',
    smokeVolume: 0.5,
  },
  {
    name: '彩彗星',
    model: 'HW-C005',
    ascentTime: 3.5,
    burstHeight: 60,
    spreadRadius: 8,
    color: '#a55eea',
    effectType: 'comet',
    smokeVolume: 0.4,
  },
  {
    name: '绿棕榈',
    model: 'HW-G006',
    ascentTime: 5.5,
    burstHeight: 110,
    spreadRadius: 22,
    color: '#2ed573',
    effectType: 'palm',
    smokeVolume: 0.65,
  },
];

export default function App() {
  const { fireworks, bulkImport } = useFireworkStore();

  useEffect(() => {
    if (fireworks.length === 0) {
      bulkImport(sampleFireworks);
    }
  }, [fireworks.length, bulkImport]);

  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/fireworks" replace />} />
          <Route path="/fireworks" element={<FireworksPage />} />
          <Route path="/pattern" element={<PatternPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/wind" element={<WindSimulationPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
