/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  color: string; // Hex color code
  targetColor: string; // For smooth transition
  vx: number;
  vy: number;
  isMoving: boolean;
  camouflageRate: number; // 0 to 1
  isPainted: boolean; // Has picked a color
  camoTimeLeft?: number; // Camouflage seconds remaining
  camoMaxTime?: number; // Camouflage maximum seconds
}

export type GuardState = 'patrol' | 'suspicious' | 'alert';

export interface Guard {
  id: number;
  x: number;
  y: number;
  radius: number;
  angle: number; // In radians, direction of vision
  speed: number;
  patrolPoints: Position[];
  currentPointIndex: number;
  state: GuardState;
  visionAngle: number; // FOV in radians
  visionRange: number; // Flashlight distance
  alertLevel: number; // 0 to 100, increases when spotting player
  pulseTime: number; // for animations
}

export interface ColorOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  collected: boolean;
  pulseScale: number;
}

export interface ExitGate {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  isDiscovered?: boolean; // Has the player discovered the exit location
}

export type LevelDifficulty = '简单' | '中等' | '困难' | '大师' | '噩梦';

export interface PaintingData {
  id: string;
  name: string;
  nameEn: string;
  artist: string;
  artistEn: string;
  year: string;
  description: string;
  descriptionEn: string;
  url: string;
  difficulty: LevelDifficulty;
  palette: { name: string; nameEn: string; hex: string }[];
  backgroundColor: string; // Card framing color
  guardCount: number;
  guardSpeed: number;
  visionRange: number;
  restorationTargetPercent?: number; // Optional target for mask-restoration levels
  proceduralType: 'monalisa' | 'starrynight' | 'scream' | 'greatwave' | 'pearlearring' | 'sunflowers' | 'waterlilies' | 'thekiss' | 'venus' | 'liberty' | 'persistence' | 'cafeterrace';
}

export interface GameStats {
  score: number;
  levelsCleared: number;
  totalSpottedCount: number;
  secondsPlayed: number;
}
