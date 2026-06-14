import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar/Sidebar';

export default function AppLayout() {
  return (
    <div className="flex h-full w-full bg-night-900 overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />

      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-14 border-b border-cyan-500/10 bg-night-900/80 backdrop-blur-sm flex items-center justify-between px-6"
        >
          <div className="flex items-center gap-4">
            <div className="h-4 w-px bg-cyan-500/20" />
            <span className="text-xs text-cyan-400/60 tracking-wider">
              烟花齐射空中排布发射时序与图形成形生产力系统
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-fire-orange animate-pulse" />
              <span className="text-cyan-400/60">实时计算</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 overflow-hidden"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
