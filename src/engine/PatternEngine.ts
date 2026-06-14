import type { Firework, LaunchPoint, OverlapRegion, SafetyCheckResult, SafetyIssue } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export class PatternEngine {
  static inferLaunchPoints(
    targetPoints: { x: number; y: number }[],
    fireworks: Firework[],
    targetHeight: number,
    projectId: string
  ): LaunchPoint[] {
    if (fireworks.length === 0 || targetPoints.length === 0) return [];

    const avgSpreadRadius = fireworks.reduce((sum, f) => sum + f.spreadRadius, 0) / fireworks.length;
    const minSpacing = avgSpreadRadius * 1.5;

    const sortedPoints = [...targetPoints].sort((a, b) => {
      const distA = Math.sqrt(a.x * a.x + a.y * a.y);
      const distB = Math.sqrt(b.x * b.x + b.y * b.y);
      return distA - distB;
    });

    const launchPoints: LaunchPoint[] = [];
    let lastX = -Infinity;
    let lastY = -Infinity;

    for (const point of sortedPoints) {
      const dist = Math.sqrt((point.x - lastX) ** 2 + (point.y - lastY) ** 2);
      if (dist < minSpacing && launchPoints.length > 0) continue;

      const firework = fireworks[Math.floor(Math.random() * fireworks.length)];
      const horizontalDist = Math.sqrt(point.x ** 2 + point.y ** 2);
      const launchAngle = Math.atan2(horizontalDist, targetHeight) * (180 / Math.PI);
      const delayTime = firework.ascentTime * 1000;

      launchPoints.push({
        id: generateId(),
        projectId,
        fireworkId: firework.id,
        x: point.x,
        y: point.y,
        launchAngle,
        delayTime,
        targetX: point.x,
        targetY: point.y,
        targetHeight,
        status: 'calculated',
      });

      lastX = point.x;
      lastY = point.y;
    }

    return launchPoints;
  }

  static detectOverlaps(
    points: LaunchPoint[],
    fireworks: Map<string, Firework>
  ): OverlapRegion[] {
    const overlaps: OverlapRegion[] = [];
    const checked = new Set<string>();

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const pairKey = `${points[i].id}-${points[j].id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const p1 = points[i];
        const p2 = points[j];
        const f1 = fireworks.get(p1.fireworkId);
        const f2 = fireworks.get(p2.fireworkId);

        if (!f1 || !f2) continue;

        const distance = Math.sqrt(
          (p1.targetX - p2.targetX) ** 2 + (p1.targetY - p2.targetY) ** 2
        );

        const combinedRadius = (f1.spreadRadius + f2.spreadRadius) * 0.8;

        if (distance < combinedRadius) {
          const overlapAmount = combinedRadius - distance;
          const existingOverlap = overlaps.find((o) =>
            o.affectedPointIds.includes(p1.id) || o.affectedPointIds.includes(p2.id)
          );

          if (existingOverlap) {
            if (!existingOverlap.affectedPointIds.includes(p1.id)) {
              existingOverlap.affectedPointIds.push(p1.id);
            }
            if (!existingOverlap.affectedPointIds.includes(p2.id)) {
              existingOverlap.affectedPointIds.push(p2.id);
            }
            existingOverlap.radius = Math.max(existingOverlap.radius, overlapAmount);
          } else {
            overlaps.push({
              id: generateId(),
              centerX: (p1.targetX + p2.targetX) / 2,
              centerY: (p1.targetY + p2.targetY) / 2,
              radius: overlapAmount,
              affectedPointIds: [p1.id, p2.id],
              suggestion: `建议将两发烟花错开至少 ${(overlapAmount * 1.2).toFixed(1)} 米，或调整发射时间相差 500ms 以上`,
            });
          }
        }
      }
    }

    return overlaps;
  }

  static checkSafetySpacing(
    points: LaunchPoint[],
    minSpacing: number = 3
  ): SafetyCheckResult {
    const issues: SafetyIssue[] = [];

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

        if (distance < minSpacing) {
          issues.push({
            type: 'spacing',
            severity: 'error',
            message: `发射管 ${i + 1} 与 ${j + 1} 间距仅 ${distance.toFixed(2)} 米，低于安全间距 ${minSpacing} 米`,
            location: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          });
        } else if (distance < minSpacing * 1.5) {
          issues.push({
            type: 'spacing',
            severity: 'warning',
            message: `发射管 ${i + 1} 与 ${j + 1} 间距 ${distance.toFixed(2)} 米，建议增加至 ${minSpacing * 1.5} 米以上`,
            location: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          });
        }
      }
    }

    for (const p of points) {
      const fallDistance = p.targetHeight * 0.6;
      if (fallDistance > 20) {
        issues.push({
          type: 'fallZone',
          severity: 'warning',
          message: `炸高 ${p.targetHeight.toFixed(0)} 米，坠落保护区半径需至少 ${fallDistance.toFixed(0)} 米`,
          location: { x: p.targetX, y: p.targetY },
        });
      }
    }

    return {
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }

  static generateSamplePattern(patternType: string, size: number = 50): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    switch (patternType) {
      case 'circle': {
        const radius = size / 2;
        const count = 24;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          });
        }
        break;
      }
      case 'heart': {
        const scale = size / 40;
        for (let t = 0; t < Math.PI * 2; t += 0.2) {
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          points.push({ x: x * scale, y: y * scale });
        }
        break;
      }
      case 'star': {
        const outerRadius = size / 2;
        const innerRadius = size / 4;
        const pointsCount = 10;
        for (let i = 0; i < pointsCount; i++) {
          const angle = (i / pointsCount) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          points.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
          });
        }
        break;
      }
      case 'text': {
        for (let i = 0; i < 15; i++) {
          for (let j = 0; j < 8; j++) {
            if ((i + j) % 3 === 0) {
              points.push({
                x: (i - 7) * (size / 15),
                y: (j - 4) * (size / 8),
              });
            }
          }
        }
        break;
      }
      default: {
        for (let i = 0; i < 20; i++) {
          points.push({
            x: (Math.random() - 0.5) * size,
            y: (Math.random() - 0.5) * size,
          });
        }
      }
    }

    return points;
  }
}
