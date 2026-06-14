import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, SkipBack, Zap, AlertTriangle, Download, Plus, Trash2, Settings, RefreshCw, Eye, Video, FileVideo, MessageSquare, Wind, Users, Calendar } from 'lucide-react';
import { useFireworkStore } from '@/store/useFireworkStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useScriptStore } from '@/store/useScriptStore';
import { TimingEngine } from '@/engine/TimingEngine';
import { SmokeWarningEngine } from '@/engine/SmokeWarningEngine';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, SEGMENT_STATUS_COLORS, SEGMENT_STATUS_LABELS } from '@/types';
import type { SmokeWarning, LaunchCommand, TimelineSegment, ActualEffectRecord, ActualSegmentRecord, SegmentStatus } from '@/types';
import { cn } from '@/lib/utils';
import { electronStore, isElectron } from '@/lib/electronStore';

export default function TimelinePage() {
  const { getFireworkMap, fireworks } = useFireworkStore();
  const { getActiveProject, setTimelineSegments, setLaunchScript, launchScript: storedScript } = useProjectStore();
  const { saveScript } = useScriptStore();
  
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [launchScript, setScript] = useState<LaunchCommand[]>([]);
  const [warnings, setWarnings] = useState<SmokeWarning[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [targetBurstTime, setTargetBurstTime] = useState(5000);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptTheme, setScriptTheme] = useState('通用');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saveTab, setSaveTab] = useState<'basic' | 'actual'>('basic');
  const [actualVideoUrl, setActualVideoUrl] = useState('');
  const [actualVideoFileName, setActualVideoFileName] = useState('');
  const [actualNotes, setActualNotes] = useState('');
  const [deviationSummary, setDeviationSummary] = useState('');
  const [weatherConditions, setWeatherConditions] = useState('');
  const [audienceFeedback, setAudienceFeedback] = useState('');
  const [actualSegments, setActualSegments] = useState<ActualSegmentRecord[]>([]);
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  const activeProject = getActiveProject();
  const fireworkMap = getFireworkMap();
  const launchPoints = activeProject?.launchPoints || [];

  useEffect(() => {
    if (activeProject && activeProject.launchPoints.length > 0 && activeProject.timelineSegments.length === 0) {
      const autoSegments = TimingEngine.splitIntoSegments(
        activeProject.launchPoints,
        fireworkMap,
        10
      );
      setSegments(autoSegments);
      setTimelineSegments(autoSegments);
    } else if (activeProject) {
      setSegments(activeProject.timelineSegments);
    }
  }, [activeProject, fireworkMap, setTimelineSegments]);

  useEffect(() => {
    if (segments.length > 0 && launchPoints.length > 0) {
      const script = TimingEngine.generateLaunchScript(launchPoints, segments, fireworkMap);
      setScript(script);
      setLaunchScript(script);
      
      const smokeWarnings = SmokeWarningEngine.analyzeSmokeRisk(script, fireworkMap);
      setWarnings(smokeWarnings);
      setSuggestions(SmokeWarningEngine.getOptimizationSuggestions(smokeWarnings));
    }
  }, [segments, launchPoints, fireworkMap, setLaunchScript]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - currentTime / playbackSpeed;
      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) * playbackSpeed;
        const totalDuration = TimingEngine.getTotalDuration(launchScript) * 1000;
        
        if (elapsed >= totalDuration) {
          setCurrentTime(totalDuration);
          setIsPlaying(false);
          return;
        }
        
        setCurrentTime(elapsed);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, launchScript]);

  const handleCalculateCompensation = () => {
    if (launchPoints.length === 0) {
      alert('请先在图形反推页生成发射点位');
      return;
    }

    const compensations = TimingEngine.calculateTimingCompensation(
      launchPoints,
      fireworkMap,
      targetBurstTime
    );

    const compensatedPoints = TimingEngine.applyCompensation(launchPoints, compensations);
    const syncPoints = TimingEngine.synchronizeBurstHeight(
      compensatedPoints,
      fireworkMap,
      launchPoints[0]?.targetHeight || 100
    );

    const updatedProject = activeProject ? {
      ...activeProject,
      launchPoints: syncPoints,
    } : null;

    if (updatedProject) {
      const { updateProject } = useProjectStore.getState();
      updateProject(activeProject!.id, { launchPoints: syncPoints });
    }
  };

  const handleAddSegment = () => {
    const newSegment: TimelineSegment = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: activeProject?.id || '',
      name: `新段落 ${segments.length + 1}`,
      startTime: segments.length > 0 
        ? Math.max(...segments.map(s => s.startTime + s.duration))
        : 0,
      duration: 10,
      orderIndex: segments.length,
      color: ['#ff6b35', '#ffd700', '#00d4ff', '#ff4757', '#2ed573', '#a55eea'][segments.length % 6],
      launchPointIds: [],
    };
    const newSegments = [...segments, newSegment];
    setSegments(newSegments);
    setTimelineSegments(newSegments);
  };

  const handleDeleteSegment = (id: string) => {
    const newSegments = segments.filter(s => s.id !== id);
    setSegments(newSegments);
    setTimelineSegments(newSegments);
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null);
    }
  };

  const handleUpdateSegment = (id: string, updates: Partial<TimelineSegment>) => {
    const newSegments = segments.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    setSegments(newSegments);
    setTimelineSegments(newSegments);
  };

  const handleOpenSaveModal = () => {
    const initActualSegments: ActualSegmentRecord[] = segments.map(seg => ({
      segmentId: seg.id,
      segmentName: seg.name,
      plannedStartTime: seg.startTime * 1000,
      actualStartTime: seg.startTime * 1000,
      plannedDuration: seg.duration * 1000,
      actualDuration: seg.duration * 1000,
      plannedLaunchCount: seg.launchPointIds.length,
      actualLaunchCount: seg.launchPointIds.length,
      status: 'completed' as SegmentStatus,
      deviationNotes: '',
    }));
    setActualSegments(initActualSegments);
    setShowSaveModal(true);
  };

  const handleSelectVideo = async () => {
    const result = await electronStore.selectVideoFile();
    if (result.success && result.filePath && result.fileName) {
      setActualVideoUrl(result.filePath);
      setActualVideoFileName(result.fileName);
    } else if (result.error) {
      alert('选择视频失败: ' + result.error);
    }
  };

  const handleUpdateSegmentStatus = (index: number, status: SegmentStatus) => {
    const newSegments = [...actualSegments];
    newSegments[index] = { ...newSegments[index], status };
    setActualSegments(newSegments);
  };

  const handleUpdateSegmentNotes = (index: number, notes: string) => {
    const newSegments = [...actualSegments];
    newSegments[index] = { ...newSegments[index], deviationNotes: notes };
    setActualSegments(newSegments);
  };

  const handleUpdateSegmentActual = (index: number, field: keyof ActualSegmentRecord, value: any) => {
    const newSegments = [...actualSegments];
    newSegments[index] = { ...newSegments[index], [field]: value };
    setActualSegments(newSegments);
  };

  const hasActualData = () => {
    return actualVideoUrl || actualNotes || deviationSummary || 
           weatherConditions || audienceFeedback ||
           actualSegments.some(s => 
             s.status !== 'completed' || 
             s.deviationNotes ||
             (s.actualStartTime !== undefined && s.actualStartTime !== s.plannedStartTime) ||
             (s.actualDuration !== undefined && s.actualDuration !== s.plannedDuration) ||
             (s.actualLaunchCount !== undefined && s.actualLaunchCount !== s.plannedLaunchCount)
           );
  };

  const handleSaveScript = () => {
    if (!scriptName.trim()) {
      alert('请输入脚本名称');
      return;
    }
    
    let actualEffect: ActualEffectRecord | undefined;
    
    if (hasActualData()) {
      actualEffect = {
        videoUrl: actualVideoUrl || undefined,
        videoFileName: actualVideoFileName || undefined,
        notes: actualNotes || undefined,
        deviationSummary: deviationSummary || undefined,
        weatherConditions: weatherConditions || undefined,
        audienceFeedback: audienceFeedback || undefined,
        segments: actualSegments,
        recordedAt: new Date().toISOString(),
      };
    }
    
    saveScript({
      projectId: activeProject?.id || '',
      name: scriptName,
      theme: scriptTheme,
      version: '1.0',
      launchScript,
      timelineSegments: segments,
      actualEffect,
    });
    
    setShowSaveModal(false);
    setScriptName('');
    setScriptTheme('通用');
    setActualVideoUrl('');
    setActualVideoFileName('');
    setActualNotes('');
    setDeviationSummary('');
    setWeatherConditions('');
    setAudienceFeedback('');
    setSaveTab('basic');
    alert('脚本保存成功！');
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${remainingMs}`;
  };

  const totalDuration = TimingEngine.getTotalDuration(launchScript) * 1000;
  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Clock className="w-7 h-7 text-fire-gold" />
            时序编排
          </h2>
          <p className="text-sm text-cyan-400/60 mt-1">
            编排齐射段落时序，计算时序补偿，检测烟雾风险
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" onClick={handleCalculateCompensation}>
            <Zap className="w-4 h-4" />
            时序补偿
          </button>
          <button className="btn btn-secondary" onClick={handleOpenSaveModal}>
            <Download className="w-4 h-4" />
            保存脚本
          </button>
          <button className="btn btn-primary" onClick={handleAddSegment}>
            <Plus className="w-4 h-4" />
            添加段落
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  className="p-2 rounded-lg bg-night-800 hover:bg-night-700 text-cyan-400 transition-colors"
                  onClick={() => { setCurrentTime(0); setIsPlaying(false); }}
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  className={cn(
                    'p-3 rounded-xl transition-all duration-200',
                    isPlaying 
                      ? 'bg-fire-orange text-white shadow-glow-orange' 
                      : 'bg-fire-orange/20 text-fire-orange hover:bg-fire-orange/30'
                  )}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div className="font-mono text-2xl text-white">
                  {formatTime(currentTime)}
                  <span className="text-cyan-400/40 text-sm ml-2">/ {formatTime(totalDuration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-cyan-400/60">播放速度</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-20 text-xs"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>

            <div className="relative h-2 bg-night-800 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                setCurrentTime(percent * totalDuration);
              }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-fire-orange to-fire-gold"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
                style={{ left: `calc(${(currentTime / totalDuration) * 100}% - 8px)` }}
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 card p-6 overflow-auto"
          >
            <div className="relative">
              <div className="sticky top-0 z-10 flex mb-4">
                <div className="w-48 flex-shrink-0" />
                <div className="flex-1 relative h-8">
                  {Array.from({ length: Math.ceil(totalDuration / 5000) + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-cyan-500/20"
                      style={{ left: `${(i * 5000 / totalDuration) * 100}%` }}
                    >
                      <span className="absolute -top-1 text-[10px] text-cyan-400/40 font-mono">
                        {i * 5}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {segments.map((segment) => (
                <motion.div
                  key={segment.id}
                  layout
                  className={cn(
                    'flex items-center mb-3 group',
                    selectedSegmentId === segment.id && 'bg-cyan-500/5 rounded-lg -mx-2 px-2 py-1'
                  )}
                >
                  <div 
                    className="w-48 flex-shrink-0 pr-4 cursor-pointer"
                    onClick={() => setSelectedSegmentId(segment.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm text-white truncate">{segment.name}</span>
                    </div>
                    <div className="text-xs text-cyan-400/40 font-mono mt-0.5">
                      {segment.launchPointIds.length} 发 · {segment.duration}s
                    </div>
                  </div>
                  <div className="flex-1 relative h-10">
                    <motion.div
                      layout
                      className={cn(
                        'absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all duration-200',
                        selectedSegmentId === segment.id && 'ring-2 ring-white/50'
                      )}
                      style={{
                        left: `${(segment.startTime * 1000 / totalDuration) * 100}%`,
                        width: `${(segment.duration * 1000 / totalDuration) * 100}%`,
                        backgroundColor: segment.color + '40',
                        borderLeft: `3px solid ${segment.color}`,
                      }}
                      onClick={() => setSelectedSegmentId(segment.id)}
                      whileHover={{ scaleY: 1.1 }}
                    >
                      <div className="absolute inset-0 flex items-center px-3 overflow-hidden">
                        <div className="flex gap-0.5">
                          {segment.launchPointIds.slice(0, 10).map((pid) => {
                            const point = launchPoints.find(p => p.id === pid);
                            const fw = point ? fireworkMap.get(point.fireworkId) : null;
                            return (
                              <div
                                key={pid}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: fw?.color || '#666' }}
                              />
                            );
                          })}
                          {segment.launchPointIds.length > 10 && (
                            <span className="text-xs text-white/60 ml-1">
                              +{segment.launchPointIds.length - 10}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                  <button
                    className="ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-fire-red/20 text-fire-red transition-all"
                    onClick={() => handleDeleteSegment(segment.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}

              {currentTime > 0 && (
                <motion.div
                  className="absolute top-0 bottom-0 w-px bg-fire-orange z-20 pointer-events-none"
                  style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-fire-orange" />
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="card p-4 max-h-48 overflow-auto">
            <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">发射脚本</h4>
            {launchScript.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-cyan-400/40">
                    <th className="text-left py-2">时间</th>
                    <th className="text-left py-2">发射管</th>
                    <th className="text-left py-2">烟花</th>
                    <th className="text-left py-2">角度</th>
                  </tr>
                </thead>
                <tbody>
                  {launchScript.slice(0, 20).map((cmd, i) => {
                    const fw = fireworkMap.get(cmd.fireworkId);
                    return (
                      <tr key={i} className="border-t border-cyan-500/10">
                        <td className="py-1.5 font-mono text-fire-orange">{formatTime(cmd.time)}</td>
                        <td className="py-1.5 font-mono text-cyber-cyan">{cmd.tubeNumber}</td>
                        <td className="py-1.5 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fw?.color }} />
                          {fw?.name}
                        </td>
                        <td className="py-1.5 font-mono">{cmd.angle}°</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-cyan-400/40 py-8">
                暂无发射脚本，请先在图形反推页生成发射点位
              </div>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-80 flex flex-col gap-4 overflow-y-auto"
        >
          <div className="card p-5">
            <h4 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyber-cyan" />
              时序补偿参数
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cyan-400/60 mb-2">目标绽放时间</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="500"
                    value={targetBurstTime}
                    onChange={(e) => setTargetBurstTime(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono text-sm text-fire-orange w-16 text-right">
                    {targetBurstTime / 1000}s
                  </span>
                </div>
              </div>
              <p className="text-xs text-cyan-400/40">
                系统将根据各烟花升空时间自动计算发射延时，确保所有烟花在同一高度同时绽放
              </p>
            </div>
          </div>

          {selectedSegment && (
            <div className="card p-5">
              <h4 className="font-display text-sm font-bold text-white mb-4">段落设置</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1.5">段落名称</label>
                  <input
                    type="text"
                    value={selectedSegment.name}
                    onChange={(e) => handleUpdateSegment(selectedSegment.id, { name: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">开始时间</label>
                    <input
                      type="number"
                      value={selectedSegment.startTime}
                      onChange={(e) => handleUpdateSegment(selectedSegment.id, { startTime: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">持续时间</label>
                    <input
                      type="number"
                      value={selectedSegment.duration}
                      onChange={(e) => handleUpdateSegment(selectedSegment.id, { duration: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1.5">段落颜色</label>
                  <input
                    type="color"
                    value={selectedSegment.color}
                    onChange={(e) => handleUpdateSegment(selectedSegment.id, { color: e.target.value })}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="card p-5">
              <h4 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-fire-gold" />
                烟雾风险预警
                <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: RISK_LEVEL_COLORS[warnings[0].riskLevel] + '20',
                    color: RISK_LEVEL_COLORS[warnings[0].riskLevel]
                  }}
                >
                  {RISK_LEVEL_LABELS[warnings[0].riskLevel]}
                </span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-auto">
                {warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className="p-2 rounded-lg border text-xs"
                    style={{
                      backgroundColor: RISK_LEVEL_COLORS[warning.riskLevel] + '10',
                      borderColor: RISK_LEVEL_COLORS[warning.riskLevel] + '30',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono" style={{ color: RISK_LEVEL_COLORS[warning.riskLevel] }}>
                        {formatTime(warning.timePoint)}
                      </span>
                      <span className="text-cyan-400/60">
                        {warning.simultaneousCount} 发同时
                      </span>
                    </div>
                    <p className="text-cyan-400/80">{warning.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-cyan-500/10">
                <p className="text-xs text-cyan-400/60 mb-2">优化建议</p>
                <ul className="space-y-1">
                  {suggestions.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs text-cyan-400/80 flex items-start gap-2">
                      <span className="text-fire-gold mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h4 className="font-display text-sm font-bold text-white mb-4">统计信息</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-night-800/50 p-3 rounded-lg text-center">
                <div className="font-display text-2xl text-fire-orange">
                  {launchScript.length}
                </div>
                <div className="text-xs text-cyan-400/60">发射指令</div>
              </div>
              <div className="bg-night-800/50 p-3 rounded-lg text-center">
                <div className="font-display text-2xl text-fire-gold">
                  {segments.length}
                </div>
                <div className="text-xs text-cyan-400/60">段落数</div>
              </div>
              <div className="bg-night-800/50 p-3 rounded-lg text-center">
                <div className="font-display text-2xl text-cyber-cyan">
                  {Math.ceil(totalDuration / 1000)}
                </div>
                <div className="text-xs text-cyan-400/60">总时长(秒)</div>
              </div>
              <div className="bg-night-800/50 p-3 rounded-lg text-center">
                <div className="font-display text-2xl text-cyber-green">
                  {warnings.length}
                </div>
                <div className="text-xs text-cyan-400/60">风险项</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold text-white mb-4">保存发射脚本</h3>
              
              <div className="flex gap-2 mb-4">
                <button
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    saveTab === 'basic' 
                      ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30' 
                      : 'bg-night-800 text-cyan-400/60 hover:text-white hover:bg-night-700'
                  )}
                  onClick={() => setSaveTab('basic')}
                >
                  基本信息
                </button>
                <button
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                    saveTab === 'actual' 
                      ? 'bg-fire-orange/20 text-fire-orange border border-fire-orange/30' 
                      : 'bg-night-800 text-cyan-400/60 hover:text-white hover:bg-night-700'
                  )}
                  onClick={() => setSaveTab('actual')}
                >
                  <Video className="w-3 h-3" />
                  实燃效果
                  {hasActualData() && (
                    <span className="w-2 h-2 rounded-full bg-fire-orange" />
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {saveTab === 'basic' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5">脚本名称</label>
                      <input
                        type="text"
                        value={scriptName}
                        onChange={(e) => setScriptName(e.target.value)}
                        placeholder="如：2026新年开场秀"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5">主题分类</label>
                      <select
                        value={scriptTheme}
                        onChange={(e) => setScriptTheme(e.target.value)}
                        className="w-full"
                      >
                        <option value="通用">通用</option>
                        <option value="节日庆典">节日庆典</option>
                        <option value="商业活动">商业活动</option>
                        <option value="婚礼庆典">婚礼庆典</option>
                        <option value="开业典礼">开业典礼</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div className="bg-night-800/50 p-4 rounded-lg">
                      <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">脚本统计</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="font-display text-2xl text-fire-orange">{launchScript.length}</div>
                          <div className="text-xs text-cyan-400/60">发射指令</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl text-fire-gold">{segments.length}</div>
                          <div className="text-xs text-cyan-400/60">段落数</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl text-cyber-cyan">
                            {formatTime(launchScript.length > 0 ? Math.max(...launchScript.map(c => c.time)) + 5000 : 0)}
                          </div>
                          <div className="text-xs text-cyan-400/60">总时长</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                        <FileVideo className="w-3 h-3" />
                        现场视频
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={actualVideoFileName}
                          placeholder="未选择视频文件"
                          readOnly
                          className="flex-1 bg-night-800 text-cyan-400/60"
                        />
                        <button
                          className={cn(
                            'btn',
                            isElectron ? 'btn-secondary' : 'btn-secondary opacity-50 cursor-not-allowed'
                          )}
                          onClick={handleSelectVideo}
                          disabled={!isElectron}
                        >
                          {isElectron ? '选择视频' : '仅桌面端可用'}
                        </button>
                      </div>
                      {!isElectron && (
                        <p className="text-xs text-cyan-400/40 mt-1">视频导入功能仅在桌面客户端可用</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                          <Wind className="w-3 h-3" />
                          天气情况
                        </label>
                        <input
                          type="text"
                          value={weatherConditions}
                          onChange={(e) => setWeatherConditions(e.target.value)}
                          placeholder="如：晴，风速3m/s"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          燃放日期
                        </label>
                        <input
                          type="date"
                          value={weatherConditions ? '' : ''}
                          onChange={(e) => setWeatherConditions(prev => prev ? prev : e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        观众反馈
                      </label>
                      <textarea
                        value={audienceFeedback}
                        onChange={(e) => setAudienceFeedback(e.target.value)}
                        placeholder="记录现场观众反应..."
                        rows={2}
                        className="w-full text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        现场备注
                      </label>
                      <textarea
                        value={actualNotes}
                        onChange={(e) => setActualNotes(e.target.value)}
                        placeholder="记录现场特殊情况..."
                        rows={2}
                        className="w-full text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cyan-400/60 mb-1.5 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        偏差说明
                      </label>
                      <textarea
                        value={deviationSummary}
                        onChange={(e) => setDeviationSummary(e.target.value)}
                        placeholder="记录与计划不符的情况..."
                        rows={2}
                        className="w-full text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cyan-400/60 uppercase tracking-wider mb-3">段落执行记录</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {actualSegments.map((seg, index) => (
                          <div key={seg.segmentId} className="bg-night-800/50 p-3 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1">
                                <div className="text-sm text-white font-medium">{seg.segmentName}</div>
                                <div className="text-xs text-cyan-400/40 font-mono">
                                  计划: {formatTime(seg.plannedStartTime)} - {formatTime(seg.plannedStartTime + seg.plannedDuration)} · {seg.plannedLaunchCount}发
                                </div>
                              </div>
                              <select
                                value={seg.status}
                                onChange={(e) => handleUpdateSegmentStatus(index, e.target.value as SegmentStatus)}
                                className="text-xs"
                                style={{ 
                                  backgroundColor: SEGMENT_STATUS_COLORS[seg.status] + '20',
                                  color: SEGMENT_STATUS_COLORS[seg.status],
                                  borderColor: SEGMENT_STATUS_COLORS[seg.status] + '30'
                                }}
                              >
                                {Object.entries(SEGMENT_STATUS_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-[10px] text-cyan-400/40 mb-1">实际发数</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={seg.actualLaunchCount ?? 0}
                                  onChange={(e) => handleUpdateSegmentActual(index, 'actualLaunchCount', parseInt(e.target.value))}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-cyan-400/40 mb-1">实际延时(ms)</label>
                                <input
                                  type="number"
                                  value={(seg.actualStartTime ?? 0) - seg.plannedStartTime}
                                  onChange={(e) => handleUpdateSegmentActual(index, 'actualStartTime', seg.plannedStartTime + parseInt(e.target.value))}
                                  className="w-full text-xs"
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              value={seg.deviationNotes || ''}
                              onChange={(e) => handleUpdateSegmentNotes(index, e.target.value)}
                              placeholder="段落偏差说明..."
                              className="w-full text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-cyan-500/10">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowSaveModal(false)}
                >
                  取消
                </button>
                <button className="btn btn-primary flex-1" onClick={handleSaveScript}>
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
