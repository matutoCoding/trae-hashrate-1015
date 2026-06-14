import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Search, Download, Upload, Play, Pause, Eye, Trash2, Edit3, X, Check, Calendar, Tag, Film, FileJson, Clock, Zap } from 'lucide-react';
import { useScriptStore } from '@/store/useScriptStore';
import { useFireworkStore } from '@/store/useFireworkStore';
import type { Script, LaunchCommand } from '@/types';
import { cn } from '@/lib/utils';

const THEME_COLORS: Record<string, string> = {
  '通用': '#00d4ff',
  '节日庆典': '#ff6b35',
  '商业活动': '#ffd700',
  '婚礼庆典': '#ff4757',
  '开业典礼': '#2ed573',
  '其他': '#a55eea',
};

const THEME_ICONS: Record<string, string> = {
  '通用': '🎆',
  '节日庆典': '🎊',
  '商业活动': '💼',
  '婚礼庆典': '💒',
  '开业典礼': '🏪',
  '其他': '📁',
};

export default function LibraryPage() {
  const { scripts, getThemes, deleteScript, exportScript, importScript, selectScript, selectedScriptId, updateScript, getScriptById } = useScriptStore();
  const { getFireworkMap } = useFireworkStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('全部');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewScript, setPreviewScript] = useState<Script | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editName, setEditName] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  const fireworkMap = getFireworkMap();
  const themes = getThemes();
  
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = selectedTheme === '全部' || script.theme === selectedTheme;
    return matchesSearch && matchesTheme;
  });

  const allThemes = ['全部', ...themes, '通用', '节日庆典', '商业活动', '婚礼庆典', '开业典礼', '其他']
    .filter((v, i, a) => a.indexOf(v) === i);

  useEffect(() => {
    if (isPlaying && previewScript) {
      startTimeRef.current = performance.now() - playbackTime;
      const animate = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const totalDuration = getTotalDuration(previewScript.launchScript);
        
        if (elapsed >= totalDuration) {
          setPlaybackTime(totalDuration);
          setIsPlaying(false);
          return;
        }
        
        setPlaybackTime(elapsed);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, previewScript]);

  const getTotalDuration = (commands: LaunchCommand[]): number => {
    if (commands.length === 0) return 0;
    return Math.max(...commands.map(c => c.time)) + 5000;
  };

  const getActiveCommands = (commands: LaunchCommand[], time: number): LaunchCommand[] => {
    return commands.filter(c => c.time <= time && c.time + 3000 > time);
  };

  const handleExport = (script: Script) => {
    try {
      const json = exportScript(script.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.name}_v${script.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
    }
  };

  const handleImport = () => {
    try {
      setImportError('');
      importScript(importJson);
      setShowImportModal(false);
      setImportJson('');
      alert('导入成功！');
    } catch (e) {
      setImportError('JSON格式无效，请检查文件内容');
    }
  };

  const handleDelete = (script: Script) => {
    if (confirm(`确定要删除脚本"${script.name}"吗？此操作不可恢复。`)) {
      deleteScript(script.id);
      if (selectedScriptId === script.id) {
        selectScript(null);
      }
    }
  };

  const handlePreview = (script: Script) => {
    setPreviewScript(script);
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  const handleClosePreview = () => {
    setPreviewScript(null);
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleStartEdit = (script: Script) => {
    setEditingScript(script);
    setEditName(script.name);
    setEditTheme(script.theme);
  };

  const handleSaveEdit = () => {
    if (!editingScript) return;
    if (!editName.trim()) {
      alert('请输入脚本名称');
      return;
    }
    updateScript(editingScript.id, { name: editName.trim(), theme: editTheme });
    setEditingScript(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content);
        setImportJson(content);
        setImportError('');
      } catch (err) {
        setImportError('文件格式无效，请选择正确的JSON文件');
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const stats = {
    total: scripts.length,
    byTheme: themes.reduce((acc, t) => {
      acc[t] = scripts.filter(s => s.theme === t).length;
      return acc;
    }, {} as Record<string, number>),
    totalCommands: scripts.reduce((sum, s) => sum + s.launchScript.length, 0),
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Library className="w-7 h-7 text-fire-gold" />
            脚本库
          </h2>
          <p className="text-sm text-cyan-400/60 mt-1">
            按主题归类管理图形脚本，支持预览回放、导入导出
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className={cn(
              'btn btn-secondary',
              viewMode === 'grid' && 'bg-fire-gold/20 text-fire-gold border-fire-gold/30'
            )}
            onClick={() => setViewMode('grid')}
          >
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
              <div className="bg-current rounded-sm" />
              <div className="bg-current rounded-sm" />
              <div className="bg-current rounded-sm" />
              <div className="bg-current rounded-sm" />
            </div>
            网格
          </button>
          <button 
            className={cn(
              'btn btn-secondary',
              viewMode === 'list' && 'bg-fire-gold/20 text-fire-gold border-fire-gold/30'
            )}
            onClick={() => setViewMode('list')}
          >
            <div className="flex flex-col gap-0.5 w-4 h-4 justify-center">
              <div className="bg-current rounded-sm h-0.5 w-full" />
              <div className="bg-current rounded-sm h-0.5 w-full" />
              <div className="bg-current rounded-sm h-0.5 w-full" />
            </div>
            列表
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4" />
            导入
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-64 flex flex-col gap-4"
        >
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/40" />
              <input
                type="text"
                placeholder="搜索脚本..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>

          <div className="card p-4">
            <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">主题分类</h4>
            <div className="space-y-1">
              {allThemes.map((theme) => {
                const count = theme === '全部' 
                  ? scripts.length 
                  : scripts.filter(s => s.theme === theme).length;
                return (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                      selectedTheme === theme
                        ? 'bg-night-700 text-white'
                        : 'hover:bg-night-800/50 text-cyan-400/60 hover:text-white'
                    )}
                  >
                    <span className="text-lg">{THEME_ICONS[theme] || '📁'}</span>
                    <span className="flex-1 text-sm">{theme}</span>
                    <span className="text-xs font-mono bg-night-800 px-2 py-0.5 rounded">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">统计信息</h4>
            <div className="space-y-3">
              <div className="bg-night-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400/60">脚本总数</span>
                  <span className="font-display text-xl text-fire-orange">{stats.total}</span>
                </div>
              </div>
              <div className="bg-night-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400/60">发射指令</span>
                  <span className="font-display text-xl text-fire-gold">{stats.totalCommands}</span>
                </div>
              </div>
              <div className="bg-night-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400/60">主题分类</span>
                  <span className="font-display text-xl text-cyber-cyan">{themes.length}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 overflow-y-auto"
        >
          {filteredScripts.length > 0 ? (
            <div className={cn(
              'gap-4',
              viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
            )}>
              {filteredScripts.map((script) => {
                const fwCount = new Set(script.launchScript.map(c => c.fireworkId)).size;
                const duration = getTotalDuration(script.launchScript);
                const themeColor = THEME_COLORS[script.theme] || '#a55eea';
                
                return (
                  <motion.div
                    key={script.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card overflow-hidden group"
                    style={{ borderLeftColor: themeColor, borderLeftWidth: '3px' }}
                  >
                    {viewMode === 'grid' ? (
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{THEME_ICONS[script.theme] || '📁'}</span>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: themeColor + '20', color: themeColor }}
                              >
                                {script.theme}
                              </span>
                            </div>
                            {editingScript?.id === script.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-lg font-bold text-white bg-night-800 border border-cyan-500/30 rounded px-2 py-1 w-full mb-2"
                                autoFocus
                              />
                            ) : (
                              <h3 className="text-lg font-bold text-white group-hover:text-fire-orange transition-colors">
                                {script.name}
                              </h3>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {editingScript?.id === script.id ? (
                              <>
                                <button
                                  className="p-1.5 rounded-lg text-cyber-green hover:bg-cyber-green/20 transition-colors"
                                  onClick={handleSaveEdit}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg text-fire-red hover:bg-fire-red/20 transition-colors"
                                  onClick={() => setEditingScript(null)}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                                  onClick={() => handleStartEdit(script)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-fire-red hover:bg-fire-red/20 transition-all"
                                  onClick={() => handleDelete(script)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {editingScript?.id === script.id ? (
                          <div className="mb-4">
                            <label className="block text-xs text-cyan-400/60 mb-1.5">主题分类</label>
                            <select
                              value={editTheme}
                              onChange={(e) => setEditTheme(e.target.value)}
                              className="w-full"
                            >
                              {Object.keys(THEME_COLORS).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="bg-night-800/50 p-2 rounded-lg text-center">
                                <div className="font-display text-lg text-fire-orange">
                                  {script.launchScript.length}
                                </div>
                                <div className="text-[10px] text-cyan-400/60">发射数</div>
                              </div>
                              <div className="bg-night-800/50 p-2 rounded-lg text-center">
                                <div className="font-display text-lg text-fire-gold">
                                  {fwCount}
                                </div>
                                <div className="text-[10px] text-cyan-400/60">烟花型号</div>
                              </div>
                              <div className="bg-night-800/50 p-2 rounded-lg text-center">
                                <div className="font-display text-lg text-cyber-cyan">
                                  {formatTime(duration)}
                                </div>
                                <div className="text-[10px] text-cyan-400/60">时长</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-cyan-400/60 mb-4">
                              <Tag className="w-3 h-3" />
                              <span>v{script.version}</span>
                              <span className="flex-1" />
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(script.createdAt)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex gap-2">
                          <button
                            className="btn btn-primary flex-1 text-sm"
                            onClick={() => handlePreview(script)}
                          >
                            <Eye className="w-4 h-4" />
                            预览
                          </button>
                          <button
                            className="btn btn-secondary text-sm"
                            onClick={() => handleExport(script)}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: themeColor + '20' }}
                        >
                          {THEME_ICONS[script.theme] || '📁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-white truncate">{script.name}</h3>
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: themeColor + '20', color: themeColor }}
                            >
                              {script.theme}
                            </span>
                            <span className="text-[10px] text-cyan-400/40 shrink-0">v{script.version}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-cyan-400/60">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {script.launchScript.length} 发
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(script.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                            onClick={() => handlePreview(script)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                            onClick={() => handleExport(script)}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                            onClick={() => handleStartEdit(script)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg text-fire-red hover:bg-fire-red/20 transition-colors"
                            onClick={() => handleDelete(script)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-night-800 flex items-center justify-center">
                  <Library className="w-10 h-10 text-cyan-400/30" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">暂无脚本</h3>
                <p className="text-sm text-cyan-400/60 mb-4">
                  {searchQuery || selectedTheme !== '全部' 
                    ? '没有找到匹配的脚本，请尝试其他搜索条件'
                    : '在时序编排页保存脚本后，将显示在这里'}
                </p>
                {searchQuery && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setSearchQuery(''); setSelectedTheme('全部'); }}
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {previewScript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <Film className="w-6 h-6 text-fire-gold" />
                      {previewScript.name}
                    </h3>
                    <p className="text-sm text-cyan-400/60 mt-1">
                      v{previewScript.version} · {previewScript.theme} · {formatDate(previewScript.createdAt)}
                    </p>
                  </div>
                  <button
                    className="p-2 rounded-lg hover:bg-night-700 text-cyan-400 transition-colors"
                    onClick={handleClosePreview}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-hidden flex flex-col">
                <div className="relative h-64 bg-gradient-to-b from-night-900 to-night-800 rounded-xl mb-6 overflow-hidden">
                  <div className="absolute inset-0 grid-cols-[repeat(20,1fr)] grid-rows-[repeat(10,1fr)] opacity-20">
                    {Array.from({ length: 200 }).map((_, i) => (
                      <div key={i} className="border border-cyan-500/20" />
                    ))}
                  </div>

                  {getActiveCommands(previewScript.launchScript, playbackTime).map((cmd, i) => {
                    const fw = fireworkMap.get(cmd.fireworkId);
                    const progress = Math.min(1, (playbackTime - cmd.time) / 3000);
                    const x = 50 + (Math.sin(cmd.time * 0.01 + i) * 30);
                    const y = 70 - (progress * 60);
                    const scale = 0.5 + progress * 0.5;
                    
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: 1 - progress * 0.5,
                          scale,
                          x: `${x}%`,
                          y: `${y}%`,
                        }}
                        className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full"
                        style={{
                          backgroundColor: fw?.color || '#ff6b35',
                          boxShadow: `0 0 ${20 * scale}px ${fw?.color || '#ff6b35'}`,
                          left: `${x}%`,
                          top: `${y}%`,
                        }}
                      />
                    );
                  })}

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-night-900/80 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center gap-4 mb-2">
                        <button
                          className="p-2 rounded-lg bg-fire-orange text-white"
                          onClick={() => {
                            if (playbackTime >= getTotalDuration(previewScript.launchScript)) {
                              setPlaybackTime(0);
                            }
                            setIsPlaying(!isPlaying);
                          }}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 font-mono text-white">
                          {formatTime(playbackTime)} / {formatTime(getTotalDuration(previewScript.launchScript))}
                        </div>
                        <div className="text-xs text-cyan-400/60">
                          实时发射: {getActiveCommands(previewScript.launchScript, playbackTime).length} 发
                        </div>
                      </div>
                      <div className="relative h-2 bg-night-800 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = x / rect.width;
                          setPlaybackTime(percent * getTotalDuration(previewScript.launchScript));
                        }}
                      >
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-fire-orange to-fire-gold"
                          style={{ width: `${(playbackTime / getTotalDuration(previewScript.launchScript)) * 100}%` }}
                        />
                        {previewScript.launchScript.map((cmd, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                            style={{ left: `${(cmd.time / getTotalDuration(previewScript.launchScript)) * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">发射指令列表</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-cyan-400/40 border-b border-cyan-500/10">
                          <th className="text-left py-2 px-3">序号</th>
                          <th className="text-left py-2 px-3">时间</th>
                          <th className="text-left py-2 px-3">烟花</th>
                          <th className="text-left py-2 px-3">发射管</th>
                          <th className="text-left py-2 px-3">角度</th>
                          <th className="text-left py-2 px-3">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewScript.launchScript.map((cmd, i) => {
                          const fw = fireworkMap.get(cmd.fireworkId);
                          const isActive = cmd.time <= playbackTime && cmd.time + 3000 > playbackTime;
                          const isPast = cmd.time < playbackTime;
                          
                          return (
                            <tr 
                              key={i} 
                              className={cn(
                                'border-b border-cyan-500/5 transition-colors',
                                isActive && 'bg-fire-orange/10',
                                !isActive && !isPast && 'text-cyan-400/60',
                                isPast && !isActive && 'text-cyan-400/30'
                              )}
                            >
                              <td className="py-2 px-3 font-mono">#{i + 1}</td>
                              <td className="py-2 px-3 font-mono text-fire-orange">{formatTime(cmd.time)}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: fw?.color }}
                                  />
                                  {fw?.name || '未知'}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-mono text-cyber-cyan">{cmd.tubeNumber}</td>
                              <td className="py-2 px-3 font-mono">{cmd.angle}°</td>
                              <td className="py-2 px-3">
                                {isActive ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-fire-orange/20 text-fire-orange">
                                    绽放中
                                  </span>
                                ) : isPast ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400/40">
                                    已完成
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-night-800 text-cyan-400/60">
                                    等待中
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-cyan-500/10 flex justify-between">
                <div className="text-sm text-cyan-400/60">
                  共 {previewScript.launchScript.length} 条发射指令
                </div>
                <div className="flex gap-3">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExport(previewScript)}
                  >
                    <Download className="w-4 h-4" />
                    导出脚本
                  </button>
                  <button className="btn btn-primary" onClick={handleClosePreview}>
                    关闭
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-fire-gold" />
                导入脚本
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-2">选择JSON文件</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="flex-1 text-sm text-cyan-400/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-night-700 file:text-cyan-400 hover:file:bg-night-600"
                    />
                  </div>
                </div>

                <div className="text-center text-cyan-400/40 text-sm">或</div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-2">粘贴JSON内容</label>
                  <textarea
                    value={importJson}
                    onChange={(e) => { setImportJson(e.target.value); setImportError(''); }}
                    placeholder='{"name": "脚本名称", "theme": "通用", ...}'
                    className="w-full h-40 font-mono text-xs"
                  />
                </div>

                {importError && (
                  <div className="bg-fire-red/10 border border-fire-red/30 p-3 rounded-lg text-sm text-fire-red">
                    {importError}
                  </div>
                )}

                <div className="bg-night-800/50 p-3 rounded-lg">
                  <div className="text-xs text-cyan-400/60 mb-1">导入格式说明</div>
                  <div className="text-[11px] text-cyan-400/40 font-mono">
                    {`{
  "name": "脚本名称",
  "theme": "主题分类",
  "version": "1.0",
  "launchScript": [
    {"time": 0, "fireworkId": "...", "tubeNumber": "T001", "angle": 90}
  ]
}`}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(''); }}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary flex-1" 
                  onClick={handleImport}
                  disabled={!importJson.trim()}
                >
                  <FileJson className="w-4 h-4" />
                  导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
