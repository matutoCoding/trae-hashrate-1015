import type { Firework, LaunchPoint, LaunchCommand, TimelineSegment } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export class TimingEngine {
  static calculateTimingCompensation(
    points: LaunchPoint[],
    fireworks: Map<string, Firework>,
    targetBurstTime: number
  ): Map<string, number> {
    const compensations = new Map<string, number>();

    for (const point of points) {
      const firework = fireworks.get(point.fireworkId);
      if (!firework) continue;

      const ascentTimeMs = firework.ascentTime * 1000;
      const launchTime = targetBurstTime - ascentTimeMs;
      const compensation = launchTime - point.delayTime;

      compensations.set(point.id, compensation);
    }

    return compensations;
  }

  static synchronizeBurstHeight(
    points: LaunchPoint[],
    fireworks: Map<string, Firework>,
    targetHeight: number
  ): LaunchPoint[] {
    return points.map((point) => {
      const firework = fireworks.get(point.fireworkId);
      if (!firework) return point;

      const heightDiff = targetHeight - firework.burstHeight;
      const angleAdjust = heightDiff > 0 ? 2 : -2;
      const newAngle = Math.max(45, Math.min(90, point.launchAngle + angleAdjust));

      const timeAdjust = (heightDiff / firework.burstHeight) * firework.ascentTime * 1000;

      return {
        ...point,
        targetHeight,
        launchAngle: newAngle,
        delayTime: Math.max(0, point.delayTime + timeAdjust),
        status: 'adjusted',
      };
    });
  }

  static generateLaunchScript(
    points: LaunchPoint[],
    segments: TimelineSegment[],
    fireworks: Map<string, Firework>
  ): LaunchCommand[] {
    const commands: LaunchCommand[] = [];
    const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);

    let tubeCounter = 1;
    const tubeMap = new Map<string, string>();

    for (const segment of sortedSegments) {
      const segmentPoints = points.filter((p) =>
        segment.launchPointIds.includes(p.id)
      );

      for (const point of segmentPoints) {
        const firework = fireworks.get(point.fireworkId);
        if (!firework) continue;

        if (!tubeMap.has(point.id)) {
          tubeMap.set(point.id, `T${String(tubeCounter).padStart(3, '0')}`);
          tubeCounter++;
        }

        const launchTime = segment.startTime * 1000 + point.delayTime;

        commands.push({
          time: Math.round(launchTime),
          fireworkId: point.fireworkId,
          tubeNumber: tubeMap.get(point.id)!,
          angle: Math.round(point.launchAngle * 10) / 10,
        });
      }
    }

    return commands.sort((a, b) => a.time - b.time);
  }

  static applyCompensation(
    points: LaunchPoint[],
    compensations: Map<string, number>
  ): LaunchPoint[] {
    return points.map((point) => {
      const compensation = compensations.get(point.id) || 0;
      return {
        ...point,
        delayTime: Math.max(0, point.delayTime + compensation),
        status: 'adjusted' as const,
      };
    });
  }

  static splitIntoSegments(
    points: LaunchPoint[],
    fireworks: Map<string, Firework>,
    segmentDuration: number = 10
  ): TimelineSegment[] {
    const segments: TimelineSegment[] = [];
    const colors = ['#ff6b35', '#ffd700', '#00d4ff', '#ff4757', '#2ed573', '#a55eea'];

    if (points.length === 0) return segments;

    const maxDelay = Math.max(...points.map((p) => p.delayTime));
    const totalDuration = Math.ceil(maxDelay / 1000) + 5;
    const segmentCount = Math.ceil(totalDuration / segmentDuration);

    const pointsByDelay = [...points].sort((a, b) => a.delayTime - b.delayTime);
    const pointsPerSegment = Math.ceil(pointsByDelay.length / segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const segmentPoints = pointsByDelay.slice(
        i * pointsPerSegment,
        (i + 1) * pointsPerSegment
      );

      if (segmentPoints.length === 0) continue;

      segments.push({
        id: generateId(),
        projectId: points[0].projectId,
        name: `齐射段落 ${i + 1}`,
        startTime: i * segmentDuration,
        duration: segmentDuration,
        orderIndex: i,
        color: colors[i % colors.length],
        launchPointIds: segmentPoints.map((p) => p.id),
      });
    }

    return segments;
  }

  static getTotalDuration(commands: LaunchCommand[]): number {
    if (commands.length === 0) return 0;
    return Math.ceil(Math.max(...commands.map((c) => c.time)) / 1000) + 5;
  }
}
