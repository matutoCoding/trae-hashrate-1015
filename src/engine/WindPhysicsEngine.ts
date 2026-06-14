import type { Firework, LaunchPoint, TrajectoryPoint, WindLayer, WindProfile } from '../types';

export class WindPhysicsEngine {
  static readonly GRAVITY = 9.8;
  static readonly DRAG_COEFFICIENT = 0.47;
  static readonly AIR_DENSITY = 1.225;
  static readonly TIME_STEP = 0.05;

  static simulateTrajectory(
    point: LaunchPoint,
    firework: Firework,
    windProfile: WindProfile
  ): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];

    const angleRad = (point.launchAngle * Math.PI) / 180;
    const targetHeight = point.targetHeight || firework.burstHeight;

    const initialVelocity = this.calculateInitialVelocity(targetHeight, angleRad);

    let vx = initialVelocity * Math.sin(angleRad) * (point.x / Math.max(1, Math.abs(point.x)) || 0);
    let vy = initialVelocity * Math.sin(angleRad) * (point.y / Math.max(1, Math.abs(point.y)) || 0);
    let vz = initialVelocity * Math.cos(angleRad);

    let x = 0;
    let y = 0;
    let z = 0;
    let t = 0;

    const mass = 0.5;
    const crossSectionalArea = 0.01;

    while (z >= 0 && t < firework.ascentTime + 2) {
      trajectory.push({
        time: t,
        x: point.x + x,
        y: point.y + y,
        height: z,
      });

      const wind = this.getWindAtHeight(z, windProfile);
      const windRad = (wind.direction * Math.PI) / 180;

      const windX = Math.sin(windRad) * wind.speed;
      const windY = Math.cos(windRad) * wind.speed;

      const relVx = vx - windX;
      const relVy = vy - windY;
      const relVz = vz;

      const relSpeed = Math.sqrt(relVx ** 2 + relVy ** 2 + relVz ** 2);

      const dragMagnitude =
        0.5 *
        this.DRAG_COEFFICIENT *
        this.AIR_DENSITY *
        crossSectionalArea *
        relSpeed ** 2;

      let dragX = 0;
      let dragY = 0;
      let dragZ = 0;

      if (relSpeed > 0.001) {
        dragX = -(dragMagnitude * relVx) / relSpeed / mass;
        dragY = -(dragMagnitude * relVy) / relSpeed / mass;
        dragZ = -(dragMagnitude * relVz) / relSpeed / mass;
      }

      const windForceX = (windX - vx) * 0.1;
      const windForceY = (windY - vy) * 0.1;

      vx += (dragX + windForceX) * this.TIME_STEP;
      vy += (dragY + windForceY) * this.TIME_STEP;
      vz += (dragZ - this.GRAVITY) * this.TIME_STEP;

      x += vx * this.TIME_STEP;
      y += vy * this.TIME_STEP;
      z += vz * this.TIME_STEP;

      t += this.TIME_STEP;

      if (z <= 0) break;
    }

    return trajectory;
  }

  private static calculateInitialVelocity(targetHeight: number, angleRad: number): number {
    const verticalComponent = Math.sqrt(2 * this.GRAVITY * targetHeight);
    return verticalComponent / Math.cos(angleRad);
  }

  private static getWindAtHeight(height: number, windProfile: WindProfile): WindLayer {
    const defaultWind: WindLayer = {
      minHeight: 0,
      maxHeight: 1000,
      speed: 0,
      direction: 0,
    };

    for (const layer of windProfile.layers) {
      if (height >= layer.minHeight && height <= layer.maxHeight) {
        return layer;
      }
    }

    if (windProfile.layers.length > 0) {
      if (height < windProfile.layers[0].minHeight) {
        return windProfile.layers[0];
      }
      if (height > windProfile.layers[windProfile.layers.length - 1].maxHeight) {
        return windProfile.layers[windProfile.layers.length - 1];
      }
    }

    return defaultWind;
  }

  static calculateBurstOffset(
    point: LaunchPoint,
    firework: Firework,
    windProfile: WindProfile
  ): { offsetX: number; offsetY: number } {
    const trajectory = this.simulateTrajectory(point, firework, windProfile);

    if (trajectory.length === 0) {
      return { offsetX: 0, offsetY: 0 };
    }

    const ascentTime = firework.ascentTime;
    const burstIndex = Math.min(
      trajectory.length - 1,
      Math.floor(ascentTime / this.TIME_STEP)
    );

    const burstPoint = trajectory[burstIndex] || trajectory[trajectory.length - 1];

    return {
      offsetX: burstPoint.x - point.targetX,
      offsetY: burstPoint.y - point.targetY,
    };
  }

  static generateCompensation(
    point: LaunchPoint,
    firework: Firework,
    windProfile: WindProfile
  ): { angleAdjust: number; delayAdjust: number; positionOffset: { x: number; y: number } } {
    const offset = this.calculateBurstOffset(point, firework, windProfile);

    const angleAdjust = Math.atan2(offset.offsetY, offset.offsetX) * (180 / Math.PI) * -0.3;

    const avgWindSpeed =
      windProfile.layers.reduce((sum, l) => sum + l.speed, 0) / Math.max(1, windProfile.layers.length);

    const delayAdjust = avgWindSpeed * 50;

    return {
      angleAdjust: Math.round(angleAdjust * 10) / 10,
      delayAdjust: Math.round(delayAdjust),
      positionOffset: {
        x: Math.round(-offset.offsetX * 10) / 10,
        y: Math.round(-offset.offsetY * 10) / 10,
      },
    };
  }

  static applyCompensationToPoint(
    point: LaunchPoint,
    compensation: { angleAdjust: number; delayAdjust: number; positionOffset: { x: number; y: number } }
  ): LaunchPoint {
    return {
      ...point,
      x: point.x + compensation.positionOffset.x,
      y: point.y + compensation.positionOffset.y,
      launchAngle: Math.max(45, Math.min(90, point.launchAngle + compensation.angleAdjust)),
      delayTime: Math.max(0, point.delayTime + compensation.delayAdjust),
      status: 'adjusted',
    };
  }

  static getWindEffectDescription(speed: number): string {
    if (speed < 2) return '微风，几乎无影响';
    if (speed < 5) return '轻风，轻微轨迹偏移';
    if (speed < 10) return '和风，明显偏移，建议补偿';
    if (speed < 15) return '强风，严重偏移，必须补偿';
    return '狂风，不建议燃放';
  }

  static createDefaultWindProfile(): WindProfile {
    return {
      id: 'default',
      name: '默认风场',
      createdAt: new Date().toISOString(),
      layers: [
        { minHeight: 0, maxHeight: 50, speed: 2, direction: 90 },
        { minHeight: 50, maxHeight: 100, speed: 4, direction: 90 },
        { minHeight: 100, maxHeight: 200, speed: 6, direction: 135 },
        { minHeight: 200, maxHeight: 500, speed: 8, direction: 180 },
      ],
    };
  }
}
