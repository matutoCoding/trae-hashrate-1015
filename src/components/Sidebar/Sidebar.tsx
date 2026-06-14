import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Target, Clock, Wind, FolderOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const navItems: NavItem[] = [
  { path: '/fireworks', label: '烟花录入', icon: Sparkles, color: 'var(--accent-orange)' },
  { path: '/pattern', label: '图形反推', icon: Target, color: 'var(--accent-cyan)' },
  { path: '/timeline', label: '时序编排', icon: Clock, color: 'var(--accent-gold)' },
  { path: '/wind', label: '风偏模拟', icon: Wind, color: 'var(--accent-green)' },
  { path: '/library', label: '脚本库', icon: FolderOpen, color: 'var(--accent-purple, #a55eea)' },
];

export default function Sidebar() {
  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-64 h-full bg-gradient-to-b from-night-900 to-night-950 border-r border-cyan-500/10 flex flex-col relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fire-orange via-fire-gold to-cyber-cyan" />

      <div className="relative p-6 border-b border-cyan-500/10">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-fire-orange to-fire-red flex items-center justify-center shadow-glow-orange"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-wider">
              FIREWORKS
            </h1>
            <p className="text-[10px] text-cyan-400/60 tracking-widest uppercase">
              Design System
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <p className="text-[10px] text-cyan-400/40 uppercase tracking-widest px-3 mb-3">
          工作区
        </p>
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'relative group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-transparent text-white'
                  : 'text-cyan-400/60 hover:text-white hover:bg-cyan-500/10'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-fire-orange to-fire-gold"
                    style={{ boxShadow: '0 0 10px var(--accent-orange)' }}
                  />
                )}
                <item.icon
                  className={cn(
                    'w-4 h-4 transition-transform duration-300',
                    isActive && 'scale-110'
                  )}
                  style={{ color: isActive ? item.color : undefined }}
                />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-1.5 h-1.5 rounded-full bg-fire-orange ml-auto animate-pulse"
                    style={{ boxShadow: '0 0 8px var(--accent-orange)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-cyan-500/10">
        <div className="card p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-cyan-400/60">
            <Settings className="w-3 h-3" />
            <span>系统状态</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
            <span className="text-xs text-cyber-green">引擎就绪</span>
          </div>
          <div className="text-[10px] text-cyan-400/40 font-mono">
            v1.0.0 | Build 2026.06
          </div>
        </div>
      </div>
    </motion.div>
  );
}
