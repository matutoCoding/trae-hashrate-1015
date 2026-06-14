import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Wind, RefreshCw, Play, Pause, Compass, Thermometer, AlertTriangle, CheckCircle, Target, MapPin, Clock } from 'lucide-react';
import { useFireworkStore } from '@/store/useFireworkStore';
import { useProjectStore } from '@/store/useProjectStore';
import { WindPhysicsEngine } from '@/engine/WindPhysicsEngine';
import type { Firework, LaunchPoint, WindProfile, WindLayer, TrajectoryPoint } from '@/types';
import { cn } from '@/lib/utils';

interface TrajectoryLineProps {
  points: TrajectoryPoint[];
  color: string;
  progress: number;
}

function TrajectoryLine({ points, color, progress }: TrajectoryLineProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.height;
      positions[i * 3 + 2] = p.y;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
  }, [color]);

  const line = useMemo(() => {
    return new THREE.Line(geometry, material);
  }, [geometry, material]);

  return <primitive object={line} />;
}

function BurstPoint({ position, color, radius }: { position: [number, number, number]; color: string; radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}

function OffsetLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start[0], start[1], start[2],
      end[0], end[1], end[2]
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [start, end]);

  const material = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: '#ffa502',
      dashSize: 2,
      gapSize: 1,
    });
  }, []);

  const line = useMemo(() => {
    const l = new THREE.Line(geometry, material);
    l.computeLineDistances();
    return l;
  }, [geometry, material]);

  return <primitive object={line} />;
}

function WindArrow({ height, wind }: { height: number; wind: WindLayer }) {
  const direction = (wind.direction * Math.PI) / 180;
  const arrowLength = wind.speed * 2;
  const x = Math.sin(direction) * arrowLength;
  const z = Math.cos(direction) * arrowLength;
  
  return (
    <group position={[0, height, 0]}>
      <arrowHelper
        args={[
          new THREE.Vector3(x, 0, z).normalize(),
          new THREE.Vector3(0, 0, 0),
          arrowLength,
          0x00d4ff,
          0.5,
          0.3
        ]}
      />
    </group>
  );
}

function Scene({ 
  trajectories, 
  burstPoints, 
  windProfile, 
  showWindArrows,
  targetBurstPoint,
  actualBurstPoint
}: { 
  trajectories: { points: TrajectoryPoint[]; color: string; progress: number }[];
  burstPoints: { position: [number, number, number]; color: string; radius: number }[];
  windProfile: WindProfile;
  showWindArrows: boolean;
  targetBurstPoint?: { x: number; y: number; height: number };
  actualBurstPoint?: { x: number; y: number; height: number };
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      
      <Grid 
        infiniteGrid 
        cellSize={10} 
        cellThickness={0.5} 
        cellColor="#1e3a5f" 
        sectionSize={50} 
        sectionThickness={1} 
        sectionColor="#2d5a87"
        fadeDistance={300}
        fadeStrength={1}
      />

      <axesHelper args={[50]} />

      {showWindArrows && windProfile.layers.map((layer, i) => (
        <WindArrow key={i} height={(layer.minHeight + layer.maxHeight) / 2} wind={layer} />
      ))}

      {trajectories.map((traj, i) => (
        <TrajectoryLine key={i} points={traj.points} color={traj.color} progress={traj.progress} />
      ))}

      {burstPoints.map((bp, i) => (
        <BurstPoint key={i} position={bp.position} color={bp.color} radius={bp.radius} />
      ))}

      {targetBurstPoint && (
        <group position={[targetBurstPoint.x, targetBurstPoint.height, targetBurstPoint.y]}>
          <mesh>
            <ringGeometry args={[5, 6, 32]} />
            <meshBasicMaterial color="#2ed573" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 2, 0]} fontSize={2} color="#2ed573" anchorX="center" anchorY="middle">
            目标炸点
          </Text>
        </group>
      )}

      {actualBurstPoint && (
        <group position={[actualBurstPoint.x, actualBurstPoint.height, actualBurstPoint.y]}>
          <mesh>
            <ringGeometry args={[3, 4, 32]} />
            <meshBasicMaterial color="#ff4757" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 2, 0]} fontSize={2} color="#ff4757" anchorX="center" anchorY="middle">
            实际炸点
          </Text>
        </group>
      )}

      {targetBurstPoint && actualBurstPoint && (
        <OffsetLine 
          start={[targetBurstPoint.x, targetBurstPoint.height, targetBurstPoint.y]}
          end={[actualBurstPoint.x, actualBurstPoint.height, actualBurstPoint.y]}
        />
      )}

      <OrbitControls 
        makeDefault 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={20}
        maxDistance={500}
      />
    </>
  );
}

export default function WindSimulationPage() {
  const { fireworks, getFireworkMap } = useFireworkStore();
  const { getActiveProject } = useProjectStore();
  
  const [windProfile, setWindProfile] = useState<WindProfile>(WindPhysicsEngine.createDefaultWindProfile());
  const [selectedFireworkId, setSelectedFireworkId] = useState<string>('');
  const [selectedLaunchPointId, setSelectedLaunchPointId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [showWindArrows, setShowWindArrows] = useState(true);
  const [simulationResults, setSimulationResults] = useState<{
    trajectory: TrajectoryPoint[];
    burstOffset: { offsetX: number; offsetY: number };
    compensation: { angleAdjust: number; delayAdjust: number; positionOffset: { x: number; y: number } };
    windEffect: string;
  } | null>(null);
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  const activeProject = getActiveProject();
  const fireworkMap = getFireworkMap();
  const launchPoints = activeProject?.launchPoints || [];
  
  const selectedFirework = fireworks.find(f => f.id === selectedFireworkId);
  const selectedLaunchPoint = launchPoints.find(lp => lp.id === selectedLaunchPointId);

  useEffect(() => {
    if (fireworks.length > 0 && !selectedFireworkId) {
      setSelectedFireworkId(fireworks[0].id);
    }
  }, [fireworks, selectedFireworkId]);

  useEffect(() => {
    if (launchPoints.length > 0 && !selectedLaunchPointId) {
      setSelectedLaunchPointId(launchPoints[0].id);
    }
  }, [launchPoints, selectedLaunchPointId]);

  useEffect(() => {
    if (isSimulating) {
      startTimeRef.current = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const trajectory = simulationResults?.trajectory || [];
        const totalTime = trajectory.length > 0 ? trajectory[trajectory.length - 1].time * 1000 : 5000;
        
        if (elapsed >= totalTime) {
          setSimulationProgress(1);
          setIsSimulating(false);
          return;
        }
        
        setSimulationProgress(elapsed / totalTime);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, simulationResults?.trajectory]);

  const handleRunSimulation = () => {
    if (!selectedFirework || !selectedLaunchPoint) {
      alert('请选择烟花型号和发射点');
      return;
    }

    const trajectory = WindPhysicsEngine.simulateTrajectory(
      selectedLaunchPoint,
      selectedFirework,
      windProfile
    );

    const burstOffset = WindPhysicsEngine.calculateBurstOffset(
      selectedLaunchPoint,
      selectedFirework,
      windProfile
    );

    const compensation = WindPhysicsEngine.generateCompensation(
      selectedLaunchPoint,
      selectedFirework,
      windProfile
    );

    const avgWindSpeed = windProfile.layers.reduce((sum, l) => sum + l.speed, 0) / windProfile.layers.length;
    const windEffect = WindPhysicsEngine.getWindEffectDescription(avgWindSpeed);

    setSimulationResults({
      trajectory,
      burstOffset,
      compensation,
      windEffect
    });
    setSimulationProgress(0);
    setIsSimulating(true);
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimulationProgress(0);
    setSimulationResults(null);
  };

  const handleApplyCompensation = () => {
    if (!simulationResults || !selectedLaunchPoint) return;

    const { updateLaunchPoint } = useProjectStore.getState();
    const adjusted = WindPhysicsEngine.applyCompensationToPoint(
      selectedLaunchPoint,
      simulationResults.compensation
    );
    updateLaunchPoint(selectedLaunchPoint.id, adjusted);
    alert('补偿已应用到发射点！');
  };

  const handleAddWindLayer = () => {
    const newLayer: WindLayer = {
      minHeight: windProfile.layers.length * 50,
      maxHeight: windProfile.layers.length * 50 + 50,
      speed: 3,
      direction: 90
    };
    setWindProfile({
      ...windProfile,
      layers: [...windProfile.layers, newLayer]
    });
  };

  const handleUpdateWindLayer = (index: number, updates: Partial<WindLayer>) => {
    const newLayers = [...windProfile.layers];
    newLayers[index] = { ...newLayers[index], ...updates };
    setWindProfile({ ...windProfile, layers: newLayers });
  };

  const handleRemoveWindLayer = (index: number) => {
    if (windProfile.layers.length <= 1) return;
    const newLayers = windProfile.layers.filter((_, i) => i !== index);
    setWindProfile({ ...windProfile, layers: newLayers });
  };

  const handleApplyAllCompensations = () => {
    if (launchPoints.length === 0) {
      alert('没有发射点需要补偿');
      return;
    }

    const { updateLaunchPoint } = useProjectStore.getState();
    
    launchPoints.forEach(point => {
      const fw = fireworkMap.get(point.fireworkId);
      if (!fw) return;
      
      const compensation = WindPhysicsEngine.generateCompensation(point, fw, windProfile);
      const adjusted = WindPhysicsEngine.applyCompensationToPoint(point, compensation);
      updateLaunchPoint(point.id, adjusted);
    });

    alert(`已为 ${launchPoints.length} 个发射点应用风偏补偿！`);
  };

  const displayTrajectories = useMemo(() => {
    if (!simulationResults) return [];
    
    const visibleCount = Math.floor(simulationResults.trajectory.length * simulationProgress);
    return [{
      points: simulationResults.trajectory.slice(0, Math.max(1, visibleCount)),
      color: selectedFirework?.color || '#ff6b35',
      progress: simulationProgress
    }];
  }, [simulationResults, simulationProgress, selectedFirework?.color]);

  const displayBurstPoints = useMemo(() => {
    if (!simulationResults || simulationProgress < 1) return [];
    
    const trajectory = simulationResults.trajectory;
    const burstPoint = trajectory[trajectory.length - 1];
    if (!burstPoint || !selectedFirework) return [];
    
    return [{
      position: [burstPoint.x, burstPoint.height, burstPoint.y] as [number, number, number],
      color: selectedFirework.color,
      radius: selectedFirework.spreadRadius / 2
    }];
  }, [simulationResults, simulationProgress, selectedFirework]);

  const targetBurstPoint = useMemo(() => {
    if (!selectedLaunchPoint) return undefined;
    return {
      x: selectedLaunchPoint.targetX,
      y: selectedLaunchPoint.targetY,
      height: selectedLaunchPoint.targetHeight
    };
  }, [selectedLaunchPoint]);

  const actualBurstPoint = useMemo(() => {
    if (!simulationResults || simulationProgress < 1) return undefined;
    const trajectory = simulationResults.trajectory;
    const burstPoint = trajectory[trajectory.length - 1];
    if (!burstPoint) return undefined;
    return {
      x: burstPoint.x,
      y: burstPoint.y,
      height: burstPoint.height
    };
  }, [simulationResults, simulationProgress]);

  const avgWindSpeed = windProfile.layers.reduce((sum, l) => sum + l.speed, 0) / windProfile.layers.length;

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Wind className="w-7 h-7 text-cyber-cyan" />
            风偏模拟
          </h2>
          <p className="text-sm text-cyan-400/60 mt-1">
            模拟风速对升空轨迹与炸点偏移的影响，提供补偿建议
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={cn(
              'btn btn-secondary',
              showWindArrows && 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30'
            )}
            onClick={() => setShowWindArrows(!showWindArrows)}
          >
            <Compass className="w-4 h-4" />
            风场箭头
          </button>
          <button className="btn btn-secondary" onClick={handleResetSimulation}>
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
          <button className="btn btn-secondary" onClick={handleApplyAllCompensations}>
            <CheckCircle className="w-4 h-4" />
            全部补偿
          </button>
          <button className="btn btn-primary" onClick={handleRunSimulation}>
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isSimulating ? '暂停模拟' : '运行模拟'}
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card flex-1 overflow-hidden relative"
          >
            <Canvas
              camera={{ position: [80, 60, 80], fov: 60 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'linear-gradient(to bottom, #0a1628, #0f2744)' }}
            >
              <Scene
                trajectories={displayTrajectories}
                burstPoints={displayBurstPoints}
                windProfile={windProfile}
                showWindArrows={showWindArrows}
                targetBurstPoint={targetBurstPoint}
                actualBurstPoint={actualBurstPoint}
              />
            </Canvas>

            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <div className="bg-night-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20">
                <div className="text-xs text-cyan-400/60">模拟进度</div>
                <div className="font-mono text-lg text-fire-orange">
                  {Math.round(simulationProgress * 100)}%
                </div>
              </div>
              {simulationResults && (
                <div className="bg-night-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20">
                  <div className="text-xs text-cyan-400/60">风场影响</div>
                  <div className="text-sm text-white">{simulationResults.windEffect}</div>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-night-900/80 backdrop-blur-sm p-3 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyber-cyan" />
                    <span className="text-cyan-400/60">X轴 (东)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-fire-red" />
                    <span className="text-cyan-400/60">Y轴 (北)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyber-green" />
                    <span className="text-cyan-400/60">Z轴 (高度)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-fire-orange" />
                    <span className="text-cyan-400/60">烟花轨迹</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-4"
          >
            <h4 className="text-xs text-cyan-400/60 uppercase tracking-wider mb-3">轨迹数据</h4>
            {simulationResults ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-night-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-fire-orange" />
                    <span className="text-xs text-cyan-400/60">升空时间</span>
                  </div>
                  <div className="font-mono text-xl text-white">
                    {simulationResults.trajectory.length > 0 
                      ? simulationResults.trajectory[simulationResults.trajectory.length - 1].time.toFixed(2)
                      : '0.00'}s
                  </div>
                </div>
                <div className="bg-night-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3 h-3 text-fire-orange" />
                    <span className="text-xs text-cyan-400/60">X偏移</span>
                  </div>
                  <div className={cn(
                    'font-mono text-xl',
                    Math.abs(simulationResults.burstOffset.offsetX) > 5 ? 'text-fire-red' : 'text-cyber-green'
                  )}>
                    {simulationResults.burstOffset.offsetX.toFixed(1)}m
                  </div>
                </div>
                <div className="bg-night-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3 h-3 text-fire-orange" />
                    <span className="text-xs text-cyan-400/60">Y偏移</span>
                  </div>
                  <div className={cn(
                    'font-mono text-xl',
                    Math.abs(simulationResults.burstOffset.offsetY) > 5 ? 'text-fire-red' : 'text-cyber-green'
                  )}>
                    {simulationResults.burstOffset.offsetY.toFixed(1)}m
                  </div>
                </div>
                <div className="bg-night-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Thermometer className="w-3 h-3 text-fire-orange" />
                    <span className="text-xs text-cyan-400/60">总偏移量</span>
                  </div>
                  <div className={cn(
                    'font-mono text-xl',
                    Math.sqrt(simulationResults.burstOffset.offsetX ** 2 + simulationResults.burstOffset.offsetY ** 2) > 10 
                      ? 'text-fire-red' 
                      : 'text-cyber-green'
                  )}>
                    {Math.sqrt(simulationResults.burstOffset.offsetX ** 2 + simulationResults.burstOffset.offsetY ** 2).toFixed(1)}m
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-cyan-400/40 py-4">
                点击"运行模拟"按钮开始风偏模拟
              </div>
            )}
          </motion.div>
        </div>

        <div className="w-96 flex flex-col gap-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <h4 className="font-display text-sm font-bold text-white mb-4">模拟对象</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cyan-400/60 mb-2">选择烟花</label>
                <select
                  value={selectedFireworkId}
                  onChange={(e) => setSelectedFireworkId(e.target.value)}
                  className="w-full"
                >
                  {fireworks.map((fw) => (
                    <option key={fw.id} value={fw.id}>
                      {fw.name} ({fw.model})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-cyan-400/60 mb-2">选择发射点</label>
                <select
                  value={selectedLaunchPointId}
                  onChange={(e) => setSelectedLaunchPointId(e.target.value)}
                  className="w-full"
                >
                  {launchPoints.length > 0 ? (
                    launchPoints.map((lp, i) => {
                      const fw = fireworkMap.get(lp.fireworkId);
                      return (
                        <option key={lp.id} value={lp.id}>
                          #{i + 1} - {fw?.name || '未知'} - ({lp.x.toFixed(0)}, {lp.y.toFixed(0)})
                        </option>
                      );
                    })
                  ) : (
                    <option value="">请先在图形反推页生成发射点</option>
                  )}
                </select>
              </div>
              {selectedLaunchPoint && selectedFirework && (
                <div className="bg-night-800/50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-400/60">发射位置</span>
                    <span className="text-white font-mono">({selectedLaunchPoint.x.toFixed(1)}, {selectedLaunchPoint.y.toFixed(1)})</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-400/60">目标炸点</span>
                    <span className="text-white font-mono">({selectedLaunchPoint.targetX.toFixed(1)}, {selectedLaunchPoint.targetY.toFixed(1)}, {selectedLaunchPoint.targetHeight}m)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-400/60">发射角度</span>
                    <span className="text-white font-mono">{selectedLaunchPoint.launchAngle}°</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-400/60">升空时间</span>
                    <span className="text-white font-mono">{selectedFirework.ascentTime}s</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-400/60">炸高</span>
                    <span className="text-white font-mono">{selectedFirework.burstHeight}m</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyber-cyan" />
                风场参数
              </h4>
              <button className="btn btn-secondary text-xs py-1 px-2" onClick={handleAddWindLayer}>
                + 添加层
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {windProfile.layers.map((layer, index) => (
                <div key={index} className="bg-night-800/50 p-3 rounded-lg relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cyan-400/60 font-mono">
                      层 {index + 1}: {layer.minHeight}-{layer.maxHeight}m
                    </span>
                    {windProfile.layers.length > 1 && (
                      <button
                        className="opacity-0 group-hover:opacity-100 text-fire-red hover:bg-fire-red/20 p-1 rounded transition-all"
                        onClick={() => handleRemoveWindLayer(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-cyan-400/40 mb-1">风速 (m/s)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={layer.speed}
                        onChange={(e) => handleUpdateWindLayer(index, { speed: parseFloat(e.target.value) })}
                        className="w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-cyan-400/40 mb-1">风向 (°)</label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="5"
                        value={layer.direction}
                        onChange={(e) => handleUpdateWindLayer(index, { direction: parseFloat(e.target.value) })}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={layer.speed}
                    onChange={(e) => handleUpdateWindLayer(index, { speed: parseFloat(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-cyan-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-400/60">平均风速</span>
                <span className={cn(
                  'font-mono text-sm',
                  avgWindSpeed > 15 ? 'text-fire-red' : avgWindSpeed > 10 ? 'text-fire-orange' : 'text-cyber-green'
                )}>
                  {avgWindSpeed.toFixed(1)} m/s
                </span>
              </div>
              <div className="mt-2 text-xs text-cyan-400/60">
                {WindPhysicsEngine.getWindEffectDescription(avgWindSpeed)}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {simulationResults && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.3 }}
                className="card p-5"
              >
                <h4 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyber-green" />
                  补偿建议
                </h4>
                
                <div className="space-y-3">
                  <div className="bg-night-800/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cyan-400/60">角度调整</span>
                      <span className={cn(
                        'font-mono text-sm',
                        Math.abs(simulationResults.compensation.angleAdjust) > 5 ? 'text-fire-orange' : 'text-cyber-green'
                      )}>
                        {simulationResults.compensation.angleAdjust > 0 ? '+' : ''}{simulationResults.compensation.angleAdjust}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={simulationResults.compensation.angleAdjust}
                      readOnly
                      className="w-full"
                    />
                  </div>

                  <div className="bg-night-800/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cyan-400/60">延时调整</span>
                      <span className="font-mono text-sm text-fire-gold">
                        {simulationResults.compensation.delayAdjust > 0 ? '+' : ''}{simulationResults.compensation.delayAdjust}ms
                      </span>
                    </div>
                  </div>

                  <div className="bg-night-800/50 p-3 rounded-lg">
                    <div className="text-xs text-cyan-400/60 mb-2">位置偏移补偿</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <div className="text-[10px] text-cyan-400/40">X轴</div>
                        <div className="font-mono text-sm text-cyber-cyan">
                          {simulationResults.compensation.positionOffset.x > 0 ? '+' : ''}{simulationResults.compensation.positionOffset.x}m
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-cyan-400/40">Y轴</div>
                        <div className="font-mono text-sm text-cyber-cyan">
                          {simulationResults.compensation.positionOffset.y > 0 ? '+' : ''}{simulationResults.compensation.positionOffset.y}m
                        </div>
                      </div>
                    </div>
                  </div>

                  {Math.abs(simulationResults.burstOffset.offsetX) > 10 || 
                   Math.abs(simulationResults.burstOffset.offsetY) > 10 ? (
                    <div className="bg-fire-red/10 border border-fire-red/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-fire-red" />
                        <span className="text-xs text-fire-red font-bold">严重偏移警告</span>
                      </div>
                      <p className="text-xs text-cyan-400/80">
                        风偏偏移量超过安全阈值，建议调整发射位置或降低燃放高度
                      </p>
                    </div>
                  ) : (
                    <div className="bg-cyber-green/10 border border-cyber-green/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-cyber-green" />
                        <span className="text-xs text-cyber-green font-bold">精度良好</span>
                      </div>
                      <p className="text-xs text-cyan-400/80">
                        应用补偿后可达到预期炸点精度
                      </p>
                    </div>
                  )}

                  <button className="btn btn-primary w-full" onClick={handleApplyCompensation}>
                    <CheckCircle className="w-4 h-4" />
                    应用补偿到此发射点
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-5"
          >
            <h4 className="font-display text-sm font-bold text-white mb-4">风向说明</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                  <span className="text-cyber-cyan">↑</span>
                </div>
                <span className="text-cyan-400/60">0° = 北风</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                  <span className="text-cyber-cyan">→</span>
                </div>
                <span className="text-cyan-400/60">90° = 东风</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                  <span className="text-cyber-cyan">↓</span>
                </div>
                <span className="text-cyan-400/60">180° = 南风</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                  <span className="text-cyber-cyan">←</span>
                </div>
                <span className="text-cyan-400/60">270° = 西风</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
