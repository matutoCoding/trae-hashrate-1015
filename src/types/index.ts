export type EffectType = 'peony' | 'chrysanthemum' | 'willow' | 'ring' | 'comet' | 'palm';

export interface Firework {
  id: string;
  name: string;
  model: string;
  ascentTime: number;
  burstHeight: number;
  spreadRadius: number;
  color: string;
  effectType: EffectType;
  smokeVolume: number;
  createdAt: string;
}

export interface LaunchPoint {
  id: string;
  projectId: string;
  fireworkId: string;
  x: number;
  y: number;
  launchAngle: number;
  delayTime: number;
  targetX: number;
  targetY: number;
  targetHeight: number;
  status: 'pending' | 'calculated' | 'adjusted';
}

export interface TimelineSegment {
  id: string;
  projectId: string;
  name: string;
  startTime: number;
  duration: number;
  orderIndex: number;
  color: string;
  launchPointIds: string[];
}

export interface DesignProject {
  id: string;
  name: string;
  theme: string;
  description: string;
  totalDuration: number;
  launchPoints: LaunchPoint[];
  timelineSegments: TimelineSegment[];
  status: 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface WindLayer {
  minHeight: number;
  maxHeight: number;
  speed: number;
  direction: number;
}

export interface WindProfile {
  id: string;
  name: string;
  layers: WindLayer[];
  createdAt: string;
}

export interface LaunchCommand {
  time: number;
  fireworkId: string;
  tubeNumber: string;
  angle: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SmokeWarning {
  id: string;
  timePoint: number;
  simultaneousCount: number;
  riskLevel: RiskLevel;
  description: string;
}

export type SafetyIssueType = 'spacing' | 'fallZone' | 'overlap';
export type SafetySeverity = 'warning' | 'error';

export interface SafetyIssue {
  type: SafetyIssueType;
  severity: SafetySeverity;
  message: string;
  location?: { x: number; y: number };
}

export interface SafetyCheckResult {
  passed: boolean;
  issues: SafetyIssue[];
}

export interface OverlapRegion {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  affectedPointIds: string[];
  suggestion: string;
}

export interface TrajectoryPoint {
  time: number;
  x: number;
  y: number;
  height: number;
}

export interface Script {
  id: string;
  projectId: string;
  name: string;
  theme: string;
  version: string;
  launchScript: LaunchCommand[];
  actualEffect?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface PatternShape {
  id: string;
  type: 'circle' | 'rect' | 'text' | 'path' | 'line' | 'freehand';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export const EFFECT_TYPE_OPTIONS: { value: EffectType; label: string }[] = [
  { value: 'peony', label: '牡丹' },
  { value: 'chrysanthemum', label: '菊花' },
  { value: 'willow', label: '垂柳' },
  { value: 'ring', label: '圆环' },
  { value: 'comet', label: '彗星' },
  { value: 'palm', label: '棕榈' },
];

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#2ed573',
  medium: '#ffa502',
  high: '#ff6b35',
  critical: '#ff4757',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险',
};
