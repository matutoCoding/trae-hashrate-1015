import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Play, RotateCcw, ZoomIn, ZoomOut, Grid3X3, AlertTriangle, CheckCircle, Circle, Square, Type, Pencil, Trash2, Download } from 'lucide-react';
import { useFireworkStore } from '@/store/useFireworkStore';
import { useProjectStore } from '@/store/useProjectStore';
import { PatternEngine } from '@/engine/PatternEngine';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/types';
import type { LaunchPoint, PatternShape, OverlapRegion, SafetyCheckResult } from '@/types';
import { cn } from '@/lib/utils';

type DrawTool = 'select' | 'circle' | 'rect' | 'text' | 'freehand';

export default function PatternPage() {
  const { fireworks, getFireworkMap } = useFireworkStore();
  const { createProject, getActiveProject, setLaunchPoints, projects, setActiveProject, launchPoints } = useProjectStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('circle');
  const [shapes, setShapes] = useState<PatternShape[]>([]);
  const [drawingShape, setDrawingShape] = useState<PatternShape | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [targetHeight, setTargetHeight] = useState(100);
  const [inferredPoints, setInferredPoints] = useState<LaunchPoint[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapRegion[]>([]);
  const [safetyResult, setSafetyResult] = useState<SafetyCheckResult | null>(null);
  const [selectedFireworkIds, setSelectedFireworkIds] = useState<string[]>([]);
  const [patternSize, setPatternSize] = useState(80);
  const [patternType, setPatternType] = useState('circle');

  const activeProject = getActiveProject();
  const currentLaunchPoints = activeProject?.launchPoints || inferredPoints;

  useEffect(() => {
    if (projects.length === 0) {
      createProject('默认项目', '通用', '烟花燃放设计项目');
    }
  }, [projects.length, createProject]);

  useEffect(() => {
    if (activeProject) {
      setSelectedFireworkIds(fireworks.slice(0, 3).map((f) => f.id));
    }
  }, [activeProject, fireworks]);

  const getSvgPoint = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 200 / scale - pan.x;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 200 / scale - pan.y;
    return { x, y };
  }, [scale, pan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      return;
    }

    const point = getSvgPoint(e);
    setStartPoint(point);

    if (drawTool === 'circle' || drawTool === 'rect' || drawTool === 'freehand') {
      setDrawingShape({
        id: Math.random().toString(36).substr(2, 9),
        type: drawTool,
        points: [point],
        color: '#ff6b35',
        strokeWidth: 2,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: pan.x + e.movementX / scale,
        y: pan.y + e.movementY / scale,
      });
      return;
    }

    if (drawingShape && startPoint) {
      const point = getSvgPoint(e);
      if (drawTool === 'freehand') {
        setDrawingShape({
          ...drawingShape,
          points: [...drawingShape.points, point],
        });
      } else {
        setDrawingShape({
          ...drawingShape,
          points: [startPoint, point],
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (drawingShape) {
      if (drawingShape.points.length >= 2) {
        setShapes([...shapes, drawingShape]);
      }
      setDrawingShape(null);
    }
    setStartPoint(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(Math.max(0.2, Math.min(5, scale * delta)));
  };

  const inferLaunchPoints = () => {
    if (fireworks.length === 0) {
      alert('请先录入烟花型号');
      return;
    }

    let targetPoints: { x: number; y: number }[] = [];

    if (shapes.length > 0) {
      shapes.forEach((shape) => {
        if (shape.type === 'circle' && shape.points.length >= 2) {
          const cx = (shape.points[0].x + shape.points[1].x) / 2;
          const cy = (shape.points[0].y + shape.points[1].y) / 2;
          const r = Math.sqrt(
            (shape.points[1].x - cx) ** 2 + (shape.points[1].y - cy) ** 2
          );
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            targetPoints.push({
              x: cx + Math.cos(angle) * r,
              y: cy + Math.sin(angle) * r,
            });
          }
        } else if (shape.points.length >= 2) {
          const steps = 20;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            targetPoints.push({
              x: shape.points[0].x + (shape.points[shape.points.length - 1].x - shape.points[0].x) * t,
              y: shape.points[0].y + (shape.points[shape.points.length - 1].y - shape.points[0].y) * t,
            });
          }
        }
      });
    } else {
      targetPoints = PatternEngine.generateSamplePattern(patternType, patternSize);
    }

    if (targetPoints.length === 0) {
      alert('请先绘制图形或选择预设图案');
      return;
    }

    const selectedFireworks = fireworks.filter((f) => selectedFireworkIds.includes(f.id));
    const points = PatternEngine.inferLaunchPoints(
      targetPoints,
      selectedFireworks.length > 0 ? selectedFireworks : fireworks,
      targetHeight,
      activeProject?.id || 'default'
    );

    setInferredPoints(points);
    if (activeProject) {
      setLaunchPoints(points);
    }

    const fwMap = getFireworkMap();
    const detectedOverlaps = PatternEngine.detectOverlaps(points, fwMap);
    setOverlaps(detectedOverlaps);

    const safety = PatternEngine.checkSafetySpacing(points, 3);
    setSafetyResult(safety);
  };

  const clearAll = () => {
    setShapes([]);
    setInferredPoints([]);
    setOverlaps([]);
    setSafetyResult(null);
  };

  const renderShape = (shape: PatternShape) => {
    if (shape.points.length < 2) return null;

    if (shape.type === 'circle') {
      const cx = (shape.points[0].x + shape.points[1].x) / 2;
      const cy = (shape.points[0].y + shape.points[1].y) / 2;
      const r = Math.sqrt(
        (shape.points[1].x - cx) ** 2 + (shape.points[1].y - cy) ** 2
      );
      return (
        <circle
          key={shape.id}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={shape.color}
          strokeWidth={shape.strokeWidth / scale}
          strokeDasharray="4 2"
          opacity={0.8}
        />
      );
    }

    if (shape.type === 'rect') {
      const x = Math.min(shape.points[0].x, shape.points[1].x);
      const y = Math.min(shape.points[0].y, shape.points[1].y);
      const w = Math.abs(shape.points[1].x - shape.points[0].x);
      const h = Math.abs(shape.points[1].y - shape.points[0].y);
      return (
        <rect
          key={shape.id}
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={shape.color}
          strokeWidth={shape.strokeWidth / scale}
          strokeDasharray="4 2"
          opacity={0.8}
        />
      );
    }

    if (shape.points.length > 1) {
      const pathData = shape.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
      return (
        <path
          key={shape.id}
          d={pathData}
          fill="none"
          stroke={shape.color}
          strokeWidth={shape.strokeWidth / scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      );
    }

    return null;
  };

  const fireworkMap = getFireworkMap();

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
              <Target className="w-7 h-7 text-cyber-cyan" />
              图形反推设计
            </h2>
            <p className="text-sm text-cyan-400/60 mt-1">
              绘制目标空中图案，系统自动反推发射点位与延时配置
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setActiveProject(e.target.value)}
              className="min-w-[200px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={clearAll}>
              <RotateCcw className="w-4 h-4" />
              清空
            </button>
            <button className="btn btn-primary" onClick={inferLaunchPoints}>
              <Play className="w-4 h-4" />
              反推发射点位
            </button>
          </div>
        </motion.div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4">
            <div className="card p-3 flex items-center gap-3">
              <span className="text-xs text-cyan-400/60 px-2">绘图工具</span>
              {[
                { tool: 'circle' as DrawTool, icon: Circle, label: '圆形' },
                { tool: 'rect' as DrawTool, icon: Square, label: '矩形' },
                { tool: 'freehand' as DrawTool, icon: Pencil, label: '手绘' },
              ].map(({ tool, icon: Icon, label }) => (
                <button
                  key={tool}
                  onClick={() => setDrawTool(tool)}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200 flex items-center gap-2',
                    drawTool === tool
                      ? 'bg-cyan-500/20 text-cyan-400 shadow-glow-cyan'
                      : 'text-cyan-400/60 hover:bg-cyan-500/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}

              <div className="h-6 w-px bg-cyan-500/20 mx-2" />

              <span className="text-xs text-cyan-400/60 px-2">预设图案</span>
              <select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value)}
                className="w-32 text-xs"
              >
                <option value="circle">圆形阵列</option>
                <option value="heart">心形</option>
                <option value="star">五角星</option>
                <option value="text">文字点阵</option>
              </select>

              <div className="h-6 w-px bg-cyan-500/20 mx-2" />

              <button
                onClick={() => setScale(scale * 1.2)}
                className="p-2 rounded-lg text-cyan-400/60 hover:bg-cyan-500/10 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScale(scale * 0.8)}
                className="p-2 rounded-lg text-cyan-400/60 hover:bg-cyan-500/10 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-cyan-400/60 font-mono">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-1 card overflow-hidden relative"
            >
              <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair"
                viewBox="-100 -100 200 200"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="0.1" />
                  </pattern>
                  <radialGradient id="centerGlow">
                    <stop offset="0%" stopColor="rgba(255,107,53,0.2)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>

                <rect x="-100" y="-100" width="200" height="200" fill="url(#grid)" />
                <circle cx="0" cy="0" r="80" fill="url(#centerGlow)" />

                <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
                  <line x1="-100" y1="0" x2="100" y2="0" stroke="rgba(0,212,255,0.2)" strokeWidth="0.2" />
                  <line x1="0" y1="-100" x2="0" y2="100" stroke="rgba(0,212,255,0.2)" strokeWidth="0.2" />

                  {overlaps.map((overlap) => (
                    <motion.circle
                      key={overlap.id}
                      cx={overlap.centerX}
                      cy={overlap.centerY}
                      r={overlap.radius}
                      fill="rgba(255,71,87,0.2)"
                      stroke="rgba(255,71,87,0.6)"
                      strokeWidth="0.3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ))}

                  {shapes.map(renderShape)}
                  {drawingShape && renderShape(drawingShape)}

                  {currentLaunchPoints.map((point, index) => {
                    const fw = fireworkMap.get(point.fireworkId);
                    return (
                      <g key={point.id}>
                        <motion.circle
                          cx={point.x}
                          cy={point.y}
                          r={fw?.spreadRadius || 10}
                          fill={`${fw?.color || '#ff6b35'}15`}
                          stroke={`${fw?.color || '#ff6b35'}40`}
                          strokeWidth="0.2"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                        />
                        <motion.circle
                          cx={point.x}
                          cy={point.y}
                          r="1.5"
                          fill={fw?.color || '#ff6b35'}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 + 0.1 }}
                          style={{ filter: `drop-shadow(0 0 3px ${fw?.color || '#ff6b35'})` }}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-cyan-400/60">
                <span className="flex items-center gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  网格 10m
                </span>
                <span>发射点: {currentLaunchPoints.length}</span>
                <span>图形: {shapes.length}</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-80 flex flex-col gap-4 overflow-y-auto"
          >
            <div className="card p-5">
              <h4 className="font-display text-sm font-bold text-white mb-4">反推参数</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-2">目标炸高</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="30"
                      max="200"
                      value={targetHeight}
                      onChange={(e) => setTargetHeight(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-mono text-sm text-fire-gold w-16 text-right">
                      {targetHeight}m
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-2">图案大小</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="20"
                      max="150"
                      value={patternSize}
                      onChange={(e) => setPatternSize(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-mono text-sm text-cyber-cyan w-16 text-right">
                      {patternSize}m
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-2">使用烟花型号</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {fireworks.map((fw) => (
                      <label key={fw.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFireworkIds.includes(fw.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFireworkIds([...selectedFireworkIds, fw.id]);
                            } else {
                              setSelectedFireworkIds(selectedFireworkIds.filter((id) => id !== fw.id));
                            }
                          }}
                          className="w-3 h-3 rounded"
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: fw.color }}
                        />
                        <span className="text-xs text-white">{fw.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {(overlaps.length > 0 || safetyResult) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card p-5"
                >
                  <h4 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-fire-gold" />
                    检测结果
                  </h4>

                  {overlaps.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-fire-red">图形重叠区</span>
                        <span className="text-xs font-mono text-fire-red">{overlaps.length} 处</span>
                      </div>
                      {overlaps.slice(0, 3).map((overlap) => (
                        <div key={overlap.id} className="text-xs text-cyan-400/80 mb-2 p-2 bg-fire-red/10 rounded border border-fire-red/20">
                          <p>{overlap.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {safetyResult && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-cyan-400/60">安全间距校验</span>
                        {safetyResult.passed ? (
                          <span className="flex items-center gap-1 text-xs text-cyber-green">
                            <CheckCircle className="w-3 h-3" />
                            通过
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-fire-red">
                            <AlertTriangle className="w-3 h-3" />
                            发现问题
                          </span>
                        )}
                      </div>
                      {safetyResult.issues.slice(0, 3).map((issue, index) => (
                        <div
                          key={index}
                          className={cn(
                            'text-xs mb-2 p-2 rounded border',
                            issue.severity === 'error'
                              ? 'bg-fire-red/10 border-fire-red/20 text-fire-red'
                              : 'bg-fire-gold/10 border-fire-gold/20 text-fire-gold'
                          )}
                        >
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {currentLaunchPoints.length > 0 && (
              <div className="card p-5">
                <h4 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyber-cyan" />
                  发射点位统计
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-night-800/50 p-3 rounded-lg text-center">
                    <div className="font-display text-2xl text-fire-orange">
                      {currentLaunchPoints.length}
                    </div>
                    <div className="text-xs text-cyan-400/60">总发射数</div>
                  </div>
                  <div className="bg-night-800/50 p-3 rounded-lg text-center">
                    <div className="font-display text-2xl text-fire-gold">
                      {activeProject?.timelineSegments.length || 0}
                    </div>
                    <div className="text-xs text-cyan-400/60">段落数</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
