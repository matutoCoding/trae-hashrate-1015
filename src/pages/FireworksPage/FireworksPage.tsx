import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Download, Upload, Eye, Sparkles, Clock, Mountain, Circle } from 'lucide-react';
import { useFireworkStore } from '@/store/useFireworkStore';
import { EFFECT_TYPE_OPTIONS } from '@/types';
import type { Firework, EffectType } from '@/types';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  model: string;
  ascentTime: number;
  burstHeight: number;
  spreadRadius: number;
  color: string;
  effectType: EffectType;
  smokeVolume: number;
}

const initialFormData: FormData = {
  name: '',
  model: '',
  ascentTime: 4.5,
  burstHeight: 80,
  spreadRadius: 15,
  color: '#ff6b35',
  effectType: 'peony',
  smokeVolume: 0.5,
};

export default function FireworksPage() {
  const { fireworks, addFirework, updateFirework, deleteFirework, selectedFireworkId, selectFirework, getFireworkById } = useFireworkStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [previewFirework, setPreviewFirework] = useState<Firework | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedFireworkId) {
      updateFirework(selectedFireworkId, formData);
    } else {
      addFirework(formData);
    }
    resetForm();
  };

  const handleEdit = (firework: Firework) => {
    selectFirework(firework.id);
    setFormData({
      name: firework.name,
      model: firework.model,
      ascentTime: firework.ascentTime,
      burstHeight: firework.burstHeight,
      spreadRadius: firework.spreadRadius,
      color: firework.color,
      effectType: firework.effectType,
      smokeVolume: firework.smokeVolume,
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个烟花型号吗？')) {
      deleteFirework(id);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    selectFirework(null);
  };

  const handleBulkExport = () => {
    const dataStr = JSON.stringify(fireworks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fireworks-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          data.forEach((fw) => {
            addFirework({
              name: fw.name,
              model: fw.model,
              ascentTime: fw.ascentTime,
              burstHeight: fw.burstHeight,
              spreadRadius: fw.spreadRadius,
              color: fw.color,
              effectType: fw.effectType,
              smokeVolume: fw.smokeVolume,
            });
          });
        }
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

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
              <Sparkles className="w-7 h-7 text-fire-orange" />
              烟花型号库
            </h2>
            <p className="text-sm text-cyan-400/60 mt-1">
              管理烟花型号参数，包括升空时间、炸高、散开半径等关键指标
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="btn btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" />
              批量导入
              <input type="file" accept=".json" className="hidden" onChange={handleBulkImport} />
            </label>
            <button className="btn btn-secondary" onClick={handleBulkExport}>
              <Download className="w-4 h-4" />
              批量导出
            </button>
            <button className="btn btn-primary" onClick={resetForm}>
              <Plus className="w-4 h-4" />
              新增型号
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 overflow-hidden flex gap-6"
        >
          <div className="flex-1 overflow-auto">
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>型号</th>
                    <th>名称</th>
                    <th>效果类型</th>
                    <th>升空时间</th>
                    <th>炸高</th>
                    <th>散开半径</th>
                    <th>烟量</th>
                    <th>颜色</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {fireworks.map((fw, index) => (
                      <motion.tr
                        key={fw.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'transition-all duration-200',
                          selectedFireworkId === fw.id && 'bg-cyan-500/10'
                        )}
                      >
                        <td className="font-mono text-cyan-400">{fw.model}</td>
                        <td className="font-medium text-white">{fw.name}</td>
                        <td>
                          <span className="status-badge bg-cyan-500/20 text-cyan-400">
                            {EFFECT_TYPE_OPTIONS.find((o) => o.value === fw.effectType)?.label}
                          </span>
                        </td>
                        <td className="font-mono">{fw.ascentTime.toFixed(1)}s</td>
                        <td className="font-mono">{fw.burstHeight}m</td>
                        <td className="font-mono">{fw.spreadRadius}m</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-night-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyber-green to-fire-orange"
                                style={{ width: `${fw.smokeVolume * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-cyan-400/60">
                              {(fw.smokeVolume * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            className="w-6 h-6 rounded-lg border-2 border-white/20"
                            style={{ backgroundColor: fw.color, boxShadow: `0 0 10px ${fw.color}40` }}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                              onClick={() => setPreviewFirework(fw)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-fire-gold/20 text-fire-gold transition-colors"
                              onClick={() => handleEdit(fw)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-fire-red/20 text-fire-red transition-colors"
                              onClick={() => handleDelete(fw.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {fireworks.length === 0 && (
                <div className="py-20 text-center text-cyan-400/40">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无烟花型号，点击"新增型号"开始录入</p>
                </div>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-96 flex flex-col gap-6"
          >
            <div className="card p-6">
              <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-fire-orange" />
                {isEditing ? '编辑烟花型号' : '新增烟花型号'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">型号编号</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="如 HW-R001"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">烟花名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="如 红牡丹"
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1.5">效果类型</label>
                  <select
                    value={formData.effectType}
                    onChange={(e) => setFormData({ ...formData, effectType: e.target.value as EffectType })}
                    className="w-full"
                  >
                    {EFFECT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-cyan-400/60">升空时间</label>
                        <span className="text-xs font-mono text-fire-orange">{formData.ascentTime.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={formData.ascentTime}
                        onChange={(e) => setFormData({ ...formData, ascentTime: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mountain className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-cyan-400/60">炸高</label>
                        <span className="text-xs font-mono text-fire-gold">{formData.burstHeight}m</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        step="5"
                        value={formData.burstHeight}
                        onChange={(e) => setFormData({ ...formData, burstHeight: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Circle className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-cyan-400/60">散开半径</label>
                        <span className="text-xs font-mono text-cyber-cyan">{formData.spreadRadius}m</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="1"
                        value={formData.spreadRadius}
                        onChange={(e) => setFormData({ ...formData, spreadRadius: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">烟量系数</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.smokeVolume}
                      onChange={(e) => setFormData({ ...formData, smokeVolume: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cyan-400/60 mb-1.5">主颜色</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-[38px]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {isEditing && (
                    <button type="button" className="btn btn-secondary flex-1" onClick={resetForm}>
                      取消
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary flex-1">
                    {isEditing ? '保存修改' : '添加型号'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {previewFirework && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setPreviewFirework(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold text-white mb-6 text-center">
                {previewFirework.name} 效果预览
              </h3>

              <div className="relative w-full aspect-square bg-night-900 rounded-xl overflow-hidden mb-6">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <motion.div
                  className="absolute left-1/2 bottom-4"
                  style={{ marginLeft: '-2px' }}
                >
                  <motion.div
                    animate={{
                      y: [0, -150],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: previewFirework.ascentTime,
                      ease: 'easeOut',
                    }}
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: previewFirework.color }}
                  />
                </motion.div>
                <motion.div
                  className="absolute left-1/2 top-1/2"
                  style={{ marginLeft: '-50px', marginTop: '-50px' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0.8, 0],
                    scale: [0, 1.2, 1, 0.8],
                  }}
                  transition={{
                    delay: previewFirework.ascentTime,
                    duration: 2,
                    ease: 'easeOut',
                  }}
                >
                  <div
                    className="w-24 h-24 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${previewFirework.color} 0%, transparent 70%)`,
                      boxShadow: `0 0 60px ${previewFirework.color}`,
                    }}
                  />
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="card p-3 text-center">
                  <div className="text-cyan-400/60 text-xs mb-1">升空时间</div>
                  <div className="font-mono text-lg text-fire-orange">{previewFirework.ascentTime}s</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-cyan-400/60 text-xs mb-1">炸高</div>
                  <div className="font-mono text-lg text-fire-gold">{previewFirework.burstHeight}m</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-cyan-400/60 text-xs mb-1">散开半径</div>
                  <div className="font-mono text-lg text-cyber-cyan">{previewFirework.spreadRadius}m</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-cyan-400/60 text-xs mb-1">烟量</div>
                  <div className="font-mono text-lg text-fire-red">{(previewFirework.smokeVolume * 100).toFixed(0)}%</div>
                </div>
              </div>

              <button
                className="btn btn-secondary w-full mt-6"
                onClick={() => setPreviewFirework(null)}
              >
                关闭预览
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
