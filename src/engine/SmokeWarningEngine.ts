import type { Firework, LaunchCommand, RiskLevel, SmokeWarning } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export class SmokeWarningEngine {
  static readonly TIME_WINDOW = 200;
  static readonly RISK_THRESHOLDS = {
    low: 5,
    medium: 10,
    high: 20,
    critical: 30,
  };

  static analyzeSmokeRisk(
    script: LaunchCommand[],
    fireworks: Map<string, Firework>
  ): SmokeWarning[] {
    const warnings: SmokeWarning[] = [];

    if (script.length === 0) return warnings;

    const sortedScript = [...script].sort((a, b) => a.time - b.time);
    const maxTime = sortedScript[sortedScript.length - 1].time;

    for (let t = 0; t <= maxTime; t += 100) {
      const simultaneous = this.getSimultaneousCount(sortedScript, t, this.TIME_WINDOW);

      if (simultaneous >= this.RISK_THRESHOLDS.low) {
        const riskLevel = this.getRiskLevel(simultaneous);
        const avgSmokeVolume = this.calculateAvgSmokeVolume(
          this.getCommandsInWindow(sortedScript, t, this.TIME_WINDOW),
          fireworks
        );
        const adjustedRisk = this.adjustRiskBySmokeVolume(riskLevel, avgSmokeVolume);

        const existingWarning = warnings.find(
          (w) => Math.abs(w.timePoint - t) < this.TIME_WINDOW * 2
        );

        if (!existingWarning) {
          warnings.push({
            id: generateId(),
            timePoint: t,
            simultaneousCount: simultaneous,
            riskLevel: adjustedRisk,
            description: this.generateWarningDescription(t, simultaneous, adjustedRisk, avgSmokeVolume),
          });
        } else if (simultaneous > existingWarning.simultaneousCount) {
          existingWarning.simultaneousCount = simultaneous;
          existingWarning.riskLevel = adjustedRisk;
          existingWarning.description = this.generateWarningDescription(t, simultaneous, adjustedRisk, avgSmokeVolume);
        }
      }
    }

    return warnings;
  }

  static getSimultaneousCount(
    script: LaunchCommand[],
    timePoint: number,
    timeWindow: number = this.TIME_WINDOW
  ): number {
    return script.filter(
      (cmd) => Math.abs(cmd.time - timePoint) <= timeWindow / 2
    ).length;
  }

  private static getCommandsInWindow(
    script: LaunchCommand[],
    timePoint: number,
    timeWindow: number
  ): LaunchCommand[] {
    return script.filter(
      (cmd) => Math.abs(cmd.time - timePoint) <= timeWindow / 2
    );
  }

  private static calculateAvgSmokeVolume(
    commands: LaunchCommand[],
    fireworks: Map<string, Firework>
  ): number {
    if (commands.length === 0) return 0;

    const totalSmoke = commands.reduce((sum, cmd) => {
      const fw = fireworks.get(cmd.fireworkId);
      return sum + (fw?.smokeVolume || 0.5);
    }, 0);

    return totalSmoke / commands.length;
  }

  private static getRiskLevel(count: number): RiskLevel {
    if (count >= this.RISK_THRESHOLDS.critical) return 'critical';
    if (count >= this.RISK_THRESHOLDS.high) return 'high';
    if (count >= this.RISK_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  private static adjustRiskBySmokeVolume(
    baseRisk: RiskLevel,
    avgSmokeVolume: number
  ): RiskLevel {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const baseIndex = levels.indexOf(baseRisk);

    if (avgSmokeVolume > 0.8) {
      return levels[Math.min(levels.length - 1, baseIndex + 1)];
    }
    if (avgSmokeVolume < 0.3 && baseIndex > 0) {
      return levels[baseIndex - 1];
    }

    return baseRisk;
  }

  private static generateWarningDescription(
    time: number,
    count: number,
    risk: RiskLevel,
    smokeVolume: number
  ): string {
    const timeStr = this.formatTime(time);
    const riskDescriptions: Record<RiskLevel, string> = {
      low: `在 ${timeStr} 有 ${count} 发同时点火，烟量较少，注意观察`,
      medium: `在 ${timeStr} 有 ${count} 发同时点火，可能产生轻微烟雾遮挡`,
      high: `在 ${timeStr} 有 ${count} 发同时点火，会产生明显烟雾，建议拉开发射间隔`,
      critical: `在 ${timeStr} 有 ${count} 发同时点火，烟雾遮挡风险极高，必须调整时序！`,
    };

    let description = riskDescriptions[risk];
    if (smokeVolume > 0.7) {
      description += '（烟花烟量较大，影响更严重）';
    } else if (smokeVolume < 0.3) {
      description += '（烟花烟量较小，影响有所降低）';
    }

    return description;
  }

  static formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = ms % 1000;

    if (minutes > 0) {
      return `${minutes}:${String(remainingSeconds).padStart(2, '0')}.${String(Math.floor(remainingMs / 100)).padStart(1, '0')}`;
    }
    return `${remainingSeconds}.${String(Math.floor(remainingMs / 100)).padStart(1, '0')}s`;
  }

  static getRiskColor(risk: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
      low: '#2ed573',
      medium: '#ffa502',
      high: '#ff6b35',
      critical: '#ff4757',
    };
    return colors[risk];
  }

  static getOptimizationSuggestions(warnings: SmokeWarning[]): string[] {
    const suggestions: string[] = [];

    if (warnings.length === 0) {
      suggestions.push('烟雾风险检测通过，无需要调整的点位');
      return suggestions;
    }

    const criticalWarnings = warnings.filter((w) => w.riskLevel === 'critical');
    const highWarnings = warnings.filter((w) => w.riskLevel === 'high');

    if (criticalWarnings.length > 0) {
      suggestions.push(`发现 ${criticalWarnings.length} 处严重风险，必须优先处理`);
      suggestions.push('建议：将同时点火数量分散到不同时间窗口，相邻发射间隔不低于 100ms');
    }

    if (highWarnings.length > 0) {
      suggestions.push(`发现 ${highWarnings.length} 处高风险，建议调整`);
      suggestions.push('建议：采用交错发射模式，将单发延时错开 50-100ms');
    }

    const mediumWarnings = warnings.filter((w) => w.riskLevel === 'medium');
    if (mediumWarnings.length > 3) {
      suggestions.push('中等风险较多，考虑减少单段落齐射规模');
    }

    suggestions.push('可使用低烟量烟花型号降低整体烟雾影响');
    suggestions.push('大型齐射建议采用扇形发散布局，减少烟雾叠加');

    return suggestions;
  }
}
