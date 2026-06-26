/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameMode, GuardType, Player, Guard, ColorOrb, ExitGate, PaintingData, Position } from '../types';
import { audio } from './AudioEngine';
import { RotateCcw, Play, Pause, Volume2, VolumeX, Eye, HelpCircle, Award, CheckCircle } from 'lucide-react';

interface GameCanvasProps {
  painting: PaintingData;
  mode?: GameMode;
  onLevelCleared: (summary?: string) => void;
  onGameOver: (reason: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  lang?: 'zh' | 'en';
}

// Fixed game canvas virtual resolution
const WIDTH = 1100;
const HEIGHT = 700;

const CANVAS_TRANSLATIONS = {
  zh: {
    exitOpenLabel: '🚪 出口已开启!',
    locked: '🔒 未解锁',
    collect3Orbs: '收集3个能量球',
    restoreArtwork: '复苏画作',
    exploreGuide: '🔍 探索画廊，寻找隐藏的出口门！(收集3个能量球解锁)',
    exploreGuideRestore: '🔍 复苏画作并寻找隐藏出口门！达到目标后出口会开启',
    orbsGoalReached: '⚡ 已发现出口门！现在收集 3 个能量球来开启它',
    restorationGoalReached: '⚡ 画作复苏完成！现在寻找出口门并逃离',
    escapedOpen: '🎉 出口已解锁！快穿过传送门逃离！',
    movingWarning: '⚠️ 移动中',
    camouflageText: ' 伪装',
    pressSpaceToCamo: '按空格吸取背景色',
    fragments: 'FRAGMENTS / 碎片',
    restoration: 'RESTORATION / 复苏',
    extraction: 'EXTRACTION / 门状态',
    riskAlert: 'RISK ALERT / 警惕度',
    paused: 'PAUSED / 计划暂停',
    pausedTip: '抓紧时间喘息一下吧！守卫正停在原地不动。',
    resume: 'Resume Challenging / 继续',
    colorSpectrum: '🎨 COLOR SPECTRUM / 专属色域',
    colorSpectrumTip: 'CLICK TO SINK / 快速染色',
    activeColor: 'ACTIVE / 现色',
    controlsMute: '静音',
    controlsUnmute: '取消静音',
    controlsPause: '暂停游戏',
    controlsResume: '继续游戏',
    moveTip: '或 方向键 移动小人',
    camoTip: '吸取背景色 (持续 6 秒)',
    generalTip: '💡 提示：在画面点击可吸色；走近隐藏出口门会触发“发现”；静止伪装能避开视线！',
    spottedMove: '被巡逻守卫发现！隐藏时绝对不能乱动哦！',
    spottedColor: '伪装颜色与背景不符，穿帮啦！',
    failPrefix: '被巡逻守卫发现！'
  },
  en: {
    exitOpenLabel: '🚪 Exit portal is OPEN!',
    locked: '🔒 Locked',
    collect3Orbs: 'Collect 3 Orbs',
    restoreArtwork: 'Restore Artwork',
    exploreGuide: '🔍 Explore and find the hidden exit! (Collect 3 orbs to unlock)',
    exploreGuideRestore: '🔍 Restore the artwork. The portal opens at target progress',
    orbsGoalReached: '⚡ Exit door discovered! Collect 3 orbs to power it up',
    restorationGoalReached: '⚡ Artwork restored! Find the exit portal and escape',
    escapedOpen: '🎉 Exit unlocked! Step into the portal to escape!',
    movingWarning: '⚠️ Moving',
    camouflageText: '% Camo',
    pressSpaceToCamo: 'Press Space to Blend',
    fragments: 'FRAGMENTS',
    restoration: 'RESTORATION',
    extraction: 'EXTRACTION STATUS',
    riskAlert: 'RISK ALERT LEVEL',
    paused: 'PAUSED',
    pausedTip: 'Take a breath! The patrol guards are frozen in place.',
    resume: 'Resume Mission',
    colorSpectrum: '🎨 COLOR SPECTRUM',
    colorSpectrumTip: 'CLICK TO SELECT',
    activeColor: 'ACTIVE COLOR',
    controlsMute: 'Mute',
    controlsUnmute: 'Unmute',
    controlsPause: 'Pause Game',
    controlsResume: 'Resume Game',
    moveTip: 'or arrow keys to move',
    camoTip: 'to blend into background (6s)',
    generalTip: '💡 Tip: Click anywhere to absorb; approach the exit door to reveal it; freeze to hide!',
    spottedMove: 'Spotted by patrol guards! You must not move while scanned!',
    spottedColor: 'Your camouflage color did not match the floor! Busted!',
    failPrefix: 'Spotted by patrol guards! '
  }
};

interface ClonePlayer {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  targetColor: string;
  vx: number;
  vy: number;
  isMoving: boolean;
  angle: number;
  timeLeft: number; // in seconds
}

interface SunflowerPowerup {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  timeLeft: number; // in seconds, disappears after 6 seconds
}

// New powerup interfaces
interface TimeFreezePowerup {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  timeLeft: number; // disappears after 8 seconds
  cooldownLeft: number; // cooldown before next spawn
}

interface DecoyFrogPowerup {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  timeLeft: number; // disappears after 8 seconds
  cooldownLeft: number;
}

interface PalettePowerup {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  timeLeft: number; // disappears after 10 seconds
  cooldownLeft: number;
}

interface DecoyEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  timeLeft: number; // lasts 5 seconds
  pulseTime: number; // animation
}

// Mask restoration levels. Level 7 (waterlilies) intentionally stays on the classic orb loop.
const MASK_LEVELS = ['sunflowers', 'thekiss', 'venus', 'liberty', 'persistence', 'cafeterrace', 'earthlydelights', 'temeraire', 'grandjatte', 'composition8', 'boogiewoogie', 'redstudio'] as const;
const DEFAULT_RESTORATION_TARGET_PERCENT = 98;
const DUEL_DURATION_SECONDS = 90;
const DUEL_TRAP_SECONDS = 0.75;
const DUEL_RESPAWN_SECONDS = 2.0;
const DUEL_GHOST_SECONDS = 2.0;
const DUEL_GRID_COLUMNS = 80;
const DUEL_GRID_ROWS = 50;
type DuelPlayerId = 1 | 2;

interface DuelPlayer extends Player {
  id: DuelPlayerId;
  label: string;
  scorePixels: number;
  deaths: number;
  trappedTime: number;
  eliminated: boolean;
  respawnTimer: number;
  ghostTime: number;
  lastScoreAt: number;
  trailColor: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  painting,
  mode = 'solo',
  onLevelCleared,
  onGameOver,
  isMuted,
  onToggleMute,
  lang = 'en',
}) => {
  const isRestorationLevel = MASK_LEVELS.includes(painting.proceduralType as (typeof MASK_LEVELS)[number]);
  const isLocalDuel = mode === 'local-duel' && isRestorationLevel;
  const restorationTargetPercent = painting.restorationTargetPercent ?? DEFAULT_RESTORATION_TARGET_PERCENT;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ownerOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game state refs (to avoid closure issues in requestAnimationFrame)
  const playerRef = useRef<Player>({
    x: 80,
    y: 350,
    radius: 16,
    color: '#ffffff',
    targetColor: '#ffffff',
    vx: 0,
    vy: 0,
    isMoving: false,
    camouflageRate: 0,
    isPainted: false,
    camoTimeLeft: 6.0,
    camoMaxTime: 6.0,
  });

  const [activeColor, setActiveColor] = useState('#ffffff');
  const [matchRate, setMatchRate] = useState(0);
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isExitDiscovered, setIsExitDiscovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [alertLevel, setAlertLevel] = useState(0); // Max among all guards for UI feedback
  const [duelTimeLeft, setDuelTimeLeft] = useState(DUEL_DURATION_SECONDS);
  const [duelScores, setDuelScores] = useState({ p1: 0, p2: 0 });
  const [duelDeaths, setDuelDeaths] = useState({ p1: 0, p2: 0 });
  const [duelMessage, setDuelMessage] = useState('');

  // Keyboard controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Elements
  const guardsRef = useRef<Guard[]>([]);
  const orbsRef = useRef<ColorOrb[]>([]);
  const duelPlayersRef = useRef<DuelPlayer[]>([]);
  const restorationOwnerRef = useRef<Uint8Array>(new Uint8Array(WIDTH * HEIGHT));
  const duelElapsedRef = useRef<number>(0);
  const exitGateRef = useRef<ExitGate>({
    x: WIDTH - 60,
    y: HEIGHT / 2 - 40,
    width: 40,
    height: 80,
    isOpen: false,
    isDiscovered: false,
  });

  // Particles
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; radius: number; alpha: number }[]>([]);

  // Sunflowers Level State
  const [sunflowerRevealRate, setSunflowerRevealRate] = useState(0);
  const clonesRef = useRef<ClonePlayer[]>([]);
  const sunflowerPowerupRef = useRef<SunflowerPowerup | null>(null);
  const powerupRespawnTimerRef = useRef<number>(0); // timer to spawn next powerup
  const frameCountRef = useRef<number>(0);

  // Universal Powerup System - All levels
  const timeFreezePowerupRef = useRef<TimeFreezePowerup | null>(null);
  const decoyFrogPowerupRef = useRef<DecoyFrogPowerup | null>(null);
  const palettePowerupRef = useRef<PalettePowerup | null>(null);
  const decoyEntitiesRef = useRef<DecoyEntity[]>([]);
  const timeFreezeActiveRef = useRef<boolean>(false);
  const timeFreezeTimeLeftRef = useRef<number>(0);
  const [hasPaletteUpgrade, setHasPaletteUpgrade] = useState(false);

  // Mask level reveal rate (reused for all mask levels)
  const [maskRevealRate, setMaskRevealRate] = useState(0);
  const restorationRateRef = useRef<number>(0);

  // Track if game is active
  const isGameRunning = useRef<boolean>(true);

  const createDuelPlayers = (): DuelPlayer[] => ([
    {
      id: 1,
      label: 'P1',
      x: 90,
      y: HEIGHT / 2,
      radius: 15,
      color: '#ffffff',
      targetColor: '#ffffff',
      vx: 0,
      vy: 0,
      isMoving: false,
      camouflageRate: 0,
      isPainted: false,
      camoTimeLeft: 6.0,
      camoMaxTime: 6.0,
      scorePixels: 0,
      deaths: 0,
      trappedTime: 0,
      eliminated: false,
      respawnTimer: 0,
      ghostTime: 0,
      lastScoreAt: 0,
      trailColor: '#fbbf24',
    },
    {
      id: 2,
      label: 'P2',
      x: WIDTH - 90,
      y: HEIGHT / 2,
      radius: 15,
      color: '#ffffff',
      targetColor: '#ffffff',
      vx: 0,
      vy: 0,
      isMoving: false,
      camouflageRate: 0,
      isPainted: false,
      camoTimeLeft: 6.0,
      camoMaxTime: 6.0,
      scorePixels: 0,
      deaths: 0,
      trappedTime: 0,
      eliminated: false,
      respawnTimer: 0,
      ghostTime: 0,
      lastScoreAt: 0,
      trailColor: '#22d3ee',
    },
  ]);

  // Reset level state
  useEffect(() => {
    isGameRunning.current = true;
    setIsPaused(false);
    setOrbsCollected(0);
    setIsExitOpen(false);
    setIsExitDiscovered(false);
    setAlertLevel(0);
    setDuelTimeLeft(DUEL_DURATION_SECONDS);
    setDuelScores({ p1: 0, p2: 0 });
    setDuelDeaths({ p1: 0, p2: 0 });
    setDuelMessage('');
    duelElapsedRef.current = 0;
    duelPlayersRef.current = createDuelPlayers();
    restorationOwnerRef.current = new Uint8Array(WIDTH * HEIGHT);
    ownerOverlayCanvasRef.current = null;

    // Initialize player
    playerRef.current = {
      x: 70,
      y: HEIGHT / 2,
      radius: 16,
      color: '#ffffff',
      targetColor: '#ffffff',
      vx: 0,
      vy: 0,
      isMoving: false,
      camouflageRate: 0.0,
      isPainted: false,
      camoTimeLeft: 6.0,
      camoMaxTime: 6.0,
    };
    setActiveColor('#ffffff');
    setMatchRate(0);

    // Initialize Orbs (3 scattered randomly on the canvas but spaced out)
    const orbs: ColorOrb[] = [];
    const orbColors = painting.palette.map(p => p.hex).slice(1, 4);
    const sectors = [
      { minX: 180, maxX: 400, minY: 100, maxY: 600 },
      { minX: 450, maxX: 700, minY: 100, maxY: 600 },
      { minX: 750, maxX: 950, minY: 100, maxY: 600 }
    ];

    for (let i = 0; i < 3; i++) {
      const sector = sectors[i];
      const rx = sector.minX + Math.random() * (sector.maxX - sector.minX);
      const ry = sector.minY + Math.random() * (sector.maxY - sector.minY);
      orbs.push({
        id: i,
        x: rx,
        y: ry,
        radius: 10,
        color: orbColors[i % orbColors.length] || '#ff0000',
        collected: false,
        pulseScale: 1.0,
      });
    }
    orbsRef.current = isRestorationLevel ? [] : orbs;

    // Initialize exit gate - Pick one perimeter/corner location at random
    const exitLocations = [
      { x: WIDTH - 50, y: 80, w: 30, h: 80 }, // Top-Right Corner
      { x: WIDTH - 50, y: HEIGHT - 160, w: 30, h: 80 }, // Bottom-Right Corner
      { x: 500, y: 30, w: 80, h: 30 }, // Top-Middle
      { x: 800, y: 30, w: 80, h: 30 }, // Top-Right Middle
      { x: 500, y: HEIGHT - 60, w: 80, h: 30 }, // Bottom-Middle
      { x: 800, y: HEIGHT - 60, w: 80, h: 30 } // Bottom-Right Middle
    ];
    const selectedExit = exitLocations[Math.floor(Math.random() * exitLocations.length)];
    exitGateRef.current = {
      x: selectedExit.x,
      y: selectedExit.y,
      width: selectedExit.w,
      height: selectedExit.h,
      isOpen: false,
      isDiscovered: false,
    };

    // Initialize Guards based on difficulty
    const guards: Guard[] = [];
    const speedMultiplier = painting.guardSpeed;
    
    if (painting.guardCount >= 1) {
      // Guard 1: Patrols vertically in the left-center column
      guards.push({
        id: 1,
        x: 320,
        y: 100,
        radius: 20,
        angle: Math.PI / 2,
        speed: 1.4 * speedMultiplier,
        patrolPoints: [
          { x: 320, y: 100 },
          { x: 320, y: 600 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 3, // 60 deg
        visionRange: painting.visionRange,
        alertLevel: 0,
        pulseTime: 0,
      });
    }

    if (painting.guardCount >= 2) {
      // Guard 2: Patrols horizontally in upper half
      guards.push({
        id: 2,
        x: 550,
        y: 180,
        radius: 20,
        angle: 0,
        speed: 1.8 * speedMultiplier,
        patrolPoints: [
          { x: 250, y: 180 },
          { x: 850, y: 180 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 3.5, // slightly narrower
        visionRange: painting.visionRange * 1.1,
        alertLevel: 0,
        pulseTime: Math.PI, // staggered animation
      });
    }

    if (painting.guardCount >= 3) {
      // Guard 3: Patrols lower area dynamically
      guards.push({
        id: 3,
        x: 550,
        y: 520,
        radius: 20,
        angle: Math.PI,
        speed: 1.6 * speedMultiplier,
        patrolPoints: [
          { x: 850, y: 520 },
          { x: 250, y: 520 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 3,
        visionRange: painting.visionRange * 0.95,
        alertLevel: 0,
        pulseTime: Math.PI / 2,
      });
    }

    if (painting.guardCount >= 4) {
      // Guard 4: Patrols vertically in the right-center column
      guards.push({
        id: 4,
        x: 780,
        y: 600,
        radius: 20,
        angle: -Math.PI / 2,
        speed: 1.5 * speedMultiplier,
        patrolPoints: [
          { x: 780, y: 600 },
          { x: 780, y: 100 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 3.2,
        visionRange: painting.visionRange * 1.05,
        alertLevel: 0,
        pulseTime: Math.PI * 1.5,
      });
    }

    if (painting.guardCount >= 5) {
      // Guard 5: Diamond loop patrol path in the central area
      guards.push({
        id: 5,
        x: 550,
        y: 350,
        radius: 20,
        angle: 0,
        speed: 1.3 * speedMultiplier,
        patrolPoints: [
          { x: 550, y: 250 },
          { x: 700, y: 350 },
          { x: 550, y: 450 },
          { x: 400, y: 350 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 3,
        visionRange: painting.visionRange * 0.9,
        alertLevel: 0,
        pulseTime: Math.PI / 4,
      });
    }

    if (painting.guardCount >= 6) {
      // Guard 6: Sweeps the outer perimeter of the room dynamically (Clockwise)
      guards.push({
        id: 6,
        x: 120,
        y: 100,
        radius: 20,
        angle: 0,
        speed: 1.45 * speedMultiplier,
        patrolPoints: [
          { x: 120, y: 100 },
          { x: 880, y: 100 },
          { x: 880, y: 550 },
          { x: 120, y: 550 }
        ],
        currentPointIndex: 0,
        state: 'patrol',
        visionAngle: Math.PI / 2.8, // wide field of view
        visionRange: painting.visionRange * 0.95,
        alertLevel: 0,
        pulseTime: Math.PI / 6,
      });
    }

    guards.forEach((guard, index) => {
      const guardType = painting.guardMix?.[index] ?? 'inspector';
      guard.type = guardType;
      guard.abilityCooldown = 1.5 + index * 0.45;
      guard.rotateDirection = index % 2 === 0 ? 1 : -1;

      if (guardType === 'sweeper') {
        guard.speed *= 1.16;
        guard.visionAngle = Math.PI / 2.25;
        guard.visionRange *= 0.82;
      } else if (guardType === 'curator') {
        guard.speed *= 0.94;
        guard.visionRange *= 0.9;
      } else if (guardType === 'drone') {
        guard.radius = 15;
        guard.speed *= 0.92;
        guard.visionAngle = Math.PI / 3.8;
        guard.visionRange *= 0.82;
      } else if (guardType === 'sentinel') {
        guard.speed *= 0.62;
        guard.visionAngle = Math.PI / 7;
        guard.visionRange *= 1.38;
      }
    });

    guardsRef.current = guards;
    particlesRef.current = [];

    // Reset Mask Level State
    setMaskRevealRate(0);
    setSunflowerRevealRate(0);
    restorationRateRef.current = 0;
    clonesRef.current = [];
    frameCountRef.current = 0;

    // Reset Powerup State
    timeFreezePowerupRef.current = {
      x: 200 + Math.random() * (WIDTH - 400),
      y: 100 + Math.random() * (HEIGHT - 200),
      radius: 16,
      active: true,
      timeLeft: 8.0,
      cooldownLeft: 0,
    };
    decoyFrogPowerupRef.current = {
      x: 400 + Math.random() * (WIDTH - 500),
      y: 150 + Math.random() * (HEIGHT - 300),
      radius: 16,
      active: true,
      timeLeft: 8.0,
      cooldownLeft: 0,
    };
    palettePowerupRef.current = {
      x: 600 + Math.random() * (WIDTH - 600),
      y: 200 + Math.random() * (HEIGHT - 400),
      radius: 16,
      active: true,
      timeLeft: 10.0,
      cooldownLeft: 0,
    };
    decoyEntitiesRef.current = [];
    timeFreezeActiveRef.current = false;
    timeFreezeTimeLeftRef.current = 0;
    setHasPaletteUpgrade(false);

    // Sunflower-specific powerup
    if (painting.proceduralType === 'sunflowers') {
      sunflowerPowerupRef.current = {
        x: 200 + Math.random() * (WIDTH - 400),
        y: 100 + Math.random() * (HEIGHT - 200),
        radius: 18,
        active: true,
        timeLeft: 6.0
      };
      powerupRespawnTimerRef.current = 0;
    } else {
      sunflowerPowerupRef.current = null;
      powerupRespawnTimerRef.current = 0;
    }

    // Initialize reveal canvas for mask levels
    if (isRestorationLevel) {
      const rCanvas = document.createElement('canvas');
      rCanvas.width = WIDTH;
      rCanvas.height = HEIGHT;
      const rCtx = rCanvas.getContext('2d');
      if (rCtx) {
        rCtx.fillStyle = '#ffffff';
        rCtx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      revealCanvasRef.current = rCanvas;
      if (isLocalDuel) {
        const ownerCanvas = document.createElement('canvas');
        ownerCanvas.width = WIDTH;
        ownerCanvas.height = HEIGHT;
        ownerOverlayCanvasRef.current = ownerCanvas;
      }
    } else {
      revealCanvasRef.current = null;
      ownerOverlayCanvasRef.current = null;
    }

    // Instantly draw our gorgeous procedural masterpiece
    drawOffscreen();

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'f', 'enter', 'shift'].includes(k) || e.key === ' ') {
        // Prevent browser scrolling
        if (e.key === ' ' || e.key.startsWith('Arrow')) {
          e.preventDefault();
        }
      }
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[code] = true;

      // Quick hotkey to paint (Space or F)
      if (!e.repeat) {
        if (isLocalDuel) {
          if (e.key === ' ' || k === 'f') {
            absorbColorForDuelPlayer(1);
          } else if (k === 'enter' || code === 'shiftright') {
            absorbColorForDuelPlayer(2);
          }
        } else if (e.key === ' ' || k === 'f') {
          absorbColorUnderPlayer();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.code.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      isGameRunning.current = false;
    };
  }, [painting, mode]);

  const resetCamouflageTimer = (player: Player) => {
    player.camoMaxTime = player.camoMaxTime ?? 6.0;
    player.camoTimeLeft = player.camoMaxTime;
  };

  // Handle color absorption at player's current coordinate
  const absorbColorUnderPlayer = () => {
    if (isPaused || !isGameRunning.current) return;
    
    const player = playerRef.current;
    const color = getPixelColor(Math.round(player.x), Math.round(player.y));
    
    player.targetColor = color;
    player.isPainted = true;
    resetCamouflageTimer(player);
    setActiveColor(color);

    // Play splat sound
    audio.playSplat();

    // Spawn painting splat particles
    spawnSplatParticles(player.x, player.y, color);
  };

  const absorbColorForDuelPlayer = (id: DuelPlayerId) => {
    if (isPaused || !isGameRunning.current || !isLocalDuel) return;
    const player = getDuelPlayer(id);
    if (!player || player.eliminated) return;

    const color = getPixelColor(Math.round(player.x), Math.round(player.y));
    player.targetColor = color;
    player.isPainted = true;
    resetCamouflageTimer(player);
    audio.playSplat();
    spawnSplatParticles(player.x, player.y, player.trailColor);
  };

  // Helper to spawn paint splatter particles
  const spawnSplatParticles = (x: number, y: number, color: string) => {
    const particles = [];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        radius: 2 + Math.random() * 5,
        alpha: 1.0,
      });
    }
    particlesRef.current = [...particlesRef.current, ...particles];
  };

  const getDuelPlayer = (id: DuelPlayerId): DuelPlayer | undefined => (
    duelPlayersRef.current.find(player => player.id === id)
  );

  const paintOwnerOverlay = (x: number, y: number, radius: number, ownerId: DuelPlayerId) => {
    const overlay = ownerOverlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const color = ownerId === 1 ? 'rgba(251, 191, 36, 0.28)' : 'rgba(34, 211, 238, 0.28)';
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Helper to reveal painting at coordinate. In duel mode it also claims newly restored pixels.
  const revealPaintingAt = (x: number, y: number, radius: number, ownerId?: DuelPlayerId): number => {
    const canvas = revealCanvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    let whiteCleared = 0;
    const ownerMap = restorationOwnerRef.current;
    const shouldClaim = ownerId !== undefined && ownerMap.length === WIDTH * HEIGHT;

    try {
      if (shouldClaim) {
        const left = Math.max(0, Math.floor(x - radius));
        const top = Math.max(0, Math.floor(y - radius));
        const right = Math.min(WIDTH - 1, Math.ceil(x + radius));
        const bottom = Math.min(HEIGHT - 1, Math.ceil(y + radius));
        const boxWidth = right - left + 1;
        const boxHeight = bottom - top + 1;
        const imageData = ctx.getImageData(left, top, boxWidth, boxHeight);
        const data = imageData.data;
        const radiusSq = radius * radius;

        for (let py = top; py <= bottom; py++) {
          for (let px = left; px <= right; px++) {
            const dx = px - x;
            const dy = py - y;
            if (dx * dx + dy * dy > radiusSq) continue;
            const localIdx = ((py - top) * boxWidth + (px - left)) * 4;
            const ownerIdx = py * WIDTH + px;
            if (data[localIdx + 3] > 10 && ownerMap[ownerIdx] === 0) {
              ownerMap[ownerIdx] = ownerId;
              whiteCleared++;
            }
          }
        }
        if (whiteCleared > 0) {
          paintOwnerOverlay(x, y, radius, ownerId);
        }
      } else {
        // Fast sampling inside radius to check if there is white
        const samplePoints = [
          { dx: 0, dy: 0 },
          { dx: -radius * 0.5, dy: -radius * 0.5 },
          { dx: radius * 0.5, dy: -radius * 0.5 },
          { dx: -radius * 0.5, dy: radius * 0.5 },
          { dx: radius * 0.5, dy: radius * 0.5 },
        ];
        for (const p of samplePoints) {
          const sx = Math.max(0, Math.min(WIDTH - 1, Math.round(x + p.dx)));
          const sy = Math.max(0, Math.min(HEIGHT - 1, Math.round(y + p.dy)));
          const pixel = ctx.getImageData(sx, sy, 1, 1).data;
          if (pixel[3] > 10) {
            whiteCleared++;
          }
        }
      }
    } catch (e) {
      // Safe guard
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    return whiteCleared;
  };

  const eraseRestorationAt = (x: number, y: number, radius: number) => {
    const canvas = revealCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const ownerMap = restorationOwnerRef.current;
    if (ownerMap.length === WIDTH * HEIGHT) {
      const left = Math.max(0, Math.floor(x - radius));
      const top = Math.max(0, Math.floor(y - radius));
      const right = Math.min(WIDTH - 1, Math.ceil(x + radius));
      const bottom = Math.min(HEIGHT - 1, Math.ceil(y + radius));
      const radiusSq = radius * radius;
      for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
          const dx = px - x;
          const dy = py - y;
          if (dx * dx + dy * dy <= radiusSq) {
            ownerMap[py * WIDTH + px] = 0;
          }
        }
      }
    }

    const overlay = ownerOverlayCanvasRef.current;
    const overlayCtx = overlay?.getContext('2d');
    if (overlayCtx) {
      overlayCtx.save();
      overlayCtx.globalCompositeOperation = 'destination-out';
      overlayCtx.beginPath();
      overlayCtx.arc(x, y, radius + 4, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
    }
  };

  // Helper to get pixel color from offscreen canvas
  const getPixelColor = (x: number, y: number): string => {
    const cx = Math.max(0, Math.min(WIDTH - 1, x));
    const cy = Math.max(0, Math.min(HEIGHT - 1, y));

    // Covered mask pixels behave like a white canvas until restored.
    if (isRestorationLevel && revealCanvasRef.current) {
      try {
        const revealCtx = revealCanvasRef.current.getContext('2d', { willReadFrequently: true });
        if (revealCtx) {
          const pixel = revealCtx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data;
          // If alpha channel is > 10, it is still covered by the white mask
          if (pixel[3] > 10) {
            return '#ffffff';
          }
        }
      } catch (e) {
        // Fallback or ignore
      }
    }

    const canvas = offscreenCanvasRef.current;
    if (!canvas) return '#ffffff';
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#ffffff';

    try {
      const pixel = ctx.getImageData(cx, cy, 1, 1).data;
      // Convert to hex
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      return rgbToHex(r, g, b);
    } catch (e) {
      // In case of security/CORS issue, fallback to painting palette color based on location
      const normalizedX = cx / WIDTH;
      const colorIdx = Math.floor(normalizedX * painting.palette.length);
      return painting.palette[colorIdx % painting.palette.length].hex;
    }
  };

  const getWhiteMaskPercentage = (): number => {
    const canvas = revealCanvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    try {
      const imgData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
      const data = imgData.data;
      let whiteCount = 0;
      const step = 20; // sample every 20th pixel in both dimensions to be lightning fast!
      let totalSampled = 0;

      for (let y = 0; y < HEIGHT; y += step) {
        for (let x = 0; x < WIDTH; x += step) {
          const idx = (y * WIDTH + x) * 4;
          if (data[idx + 3] > 10) {
            whiteCount++;
          }
          totalSampled++;
        }
      }
      return (whiteCount / totalSampled) * 100;
    } catch (e) {
      return 0;
    }
  };

  const isRestoredPixel = (x: number, y: number): boolean => {
    if (!isRestorationLevel) return false;
    const canvas = revealCanvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    const cx = Math.max(0, Math.min(WIDTH - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(HEIGHT - 1, Math.round(y)));

    try {
      const pixel = ctx.getImageData(cx, cy, 1, 1).data;
      return pixel[3] <= 10;
    } catch (error) {
      return false;
    }
  };

  const wouldGuardEnterRestoredArea = (x: number, y: number, radius: number): boolean => {
    if (!isRestorationLevel) return false;

    const sampleRadius = Math.max(8, radius * 0.75);
    const samples = [
      { dx: 0, dy: 0 },
      { dx: sampleRadius, dy: 0 },
      { dx: -sampleRadius, dy: 0 },
      { dx: 0, dy: sampleRadius },
      { dx: 0, dy: -sampleRadius },
    ];

    return samples.some(point => isRestoredPixel(x + point.dx, y + point.dy));
  };

  const getOwnerAt = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(WIDTH - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(HEIGHT - 1, Math.round(y)));
    return restorationOwnerRef.current[cy * WIDTH + cx] ?? 0;
  };

  const wouldDuelPlayerEnterOpponentArea = (player: DuelPlayer, x: number, y: number, radius: number): boolean => {
    if (!isLocalDuel || player.ghostTime > 0) return false;
    const opponentId = player.id === 1 ? 2 : 1;
    const sampleRadius = Math.max(7, radius * 0.82);
    const samples = [
      { dx: 0, dy: 0 },
      { dx: sampleRadius, dy: 0 },
      { dx: -sampleRadius, dy: 0 },
      { dx: 0, dy: sampleRadius },
      { dx: 0, dy: -sampleRadius },
      { dx: sampleRadius * 0.7, dy: sampleRadius * 0.7 },
      { dx: -sampleRadius * 0.7, dy: sampleRadius * 0.7 },
      { dx: sampleRadius * 0.7, dy: -sampleRadius * 0.7 },
      { dx: -sampleRadius * 0.7, dy: -sampleRadius * 0.7 },
    ];

    return samples.some(point => getOwnerAt(x + point.dx, y + point.dy) === opponentId);
  };

  const calculateOwnerCounts = () => {
    const ownerMap = restorationOwnerRef.current;
    let p1 = 0;
    let p2 = 0;
    for (let i = 0; i < ownerMap.length; i += 4) {
      if (ownerMap[i] === 1) p1 += 4;
      else if (ownerMap[i] === 2) p2 += 4;
    }
    return { p1, p2 };
  };

  const cellBlockedForPlayer = (cellX: number, cellY: number, playerId: DuelPlayerId): boolean => {
    const opponentId = playerId === 1 ? 2 : 1;
    const sampleX = (cellX + 0.5) * (WIDTH / DUEL_GRID_COLUMNS);
    const sampleY = (cellY + 0.5) * (HEIGHT / DUEL_GRID_ROWS);
    return getOwnerAt(sampleX, sampleY) === opponentId;
  };

  const hasDuelEscapePath = (player: DuelPlayer): boolean => {
    if (!isLocalDuel || player.ghostTime > 0 || player.eliminated) return true;

    const startX = Math.max(0, Math.min(DUEL_GRID_COLUMNS - 1, Math.floor(player.x / (WIDTH / DUEL_GRID_COLUMNS))));
    const startY = Math.max(0, Math.min(DUEL_GRID_ROWS - 1, Math.floor(player.y / (HEIGHT / DUEL_GRID_ROWS))));
    if (cellBlockedForPlayer(startX, startY, player.id)) return false;

    const visited = new Uint8Array(DUEL_GRID_COLUMNS * DUEL_GRID_ROWS);
    const queue: Array<[number, number]> = [[startX, startY]];
    visited[startY * DUEL_GRID_COLUMNS + startX] = 1;

    for (let i = 0; i < queue.length; i++) {
      const [cx, cy] = queue[i];
      if (cx === 0 || cy === 0 || cx === DUEL_GRID_COLUMNS - 1 || cy === DUEL_GRID_ROWS - 1) {
        return true;
      }

      const neighbors = [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= DUEL_GRID_COLUMNS || ny >= DUEL_GRID_ROWS) continue;
        const idx = ny * DUEL_GRID_COLUMNS + nx;
        if (visited[idx] || cellBlockedForPlayer(nx, ny, player.id)) continue;
        visited[idx] = 1;
        queue.push([nx, ny]);
      }
    }

    return false;
  };

  // Hex conversion helpers
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  // Draw procedural artwork on offscreen canvas
  const drawOffscreen = () => {
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Procedural Fallback Graphics - Gorgeous and highly stylized!
    const type = painting.proceduralType;

    if (type === 'monalisa') {
      // Background gradient (Forest and muddy tones)
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#151e12');
      grad.addColorStop(0.5, '#2e381f');
      grad.addColorStop(1, '#1b120c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Rocks and river path in background
      ctx.fillStyle = '#514532';
      ctx.beginPath();
      ctx.moveTo(100, HEIGHT);
      ctx.quadraticCurveTo(200, 300, 250, HEIGHT);
      ctx.fill();

      ctx.fillStyle = '#3f4f34';
      ctx.beginPath();
      ctx.moveTo(WIDTH - 150, HEIGHT);
      ctx.quadraticCurveTo(WIDTH - 250, 250, WIDTH - 50, HEIGHT);
      ctx.fill();

      // Portrait silhouette
      ctx.fillStyle = '#100c0a'; // Dark dress
      ctx.beginPath();
      ctx.moveTo(300, HEIGHT);
      ctx.lineTo(340, 280);
      ctx.quadraticCurveTo(400, 250, 460, 280);
      ctx.lineTo(500, HEIGHT);
      ctx.fill();

      // Face
      ctx.fillStyle = '#dfba9d'; // Flesh tone
      ctx.beginPath();
      ctx.arc(400, 200, 45, 0, Math.PI * 2);
      ctx.fill();

      // Hair draping
      ctx.fillStyle = '#1c1510';
      ctx.beginPath();
      ctx.moveTo(350, 200);
      ctx.quadraticCurveTo(390, 140, 450, 200);
      ctx.quadraticCurveTo(455, 300, 460, 350);
      ctx.lineTo(340, 350);
      ctx.quadraticCurveTo(345, 300, 350, 200);
      ctx.fill();

      // Veil overlay
      ctx.fillStyle = 'rgba(40, 30, 20, 0.4)';
      ctx.beginPath();
      ctx.arc(400, 200, 48, 0, Math.PI, true);
      ctx.fill();

      // Chest golden lining
      ctx.strokeStyle = '#8f6e3c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(355, 300);
      ctx.quadraticCurveTo(400, 330, 445, 300);
      ctx.stroke();

    } else if (type === 'starrynight') {
      // Starry Night falling back
      ctx.fillStyle = '#0f1736'; // Dark indigo
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Swirling winds
      ctx.strokeStyle = 'rgba(94, 139, 196, 0.5)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      
      // Swirl 1
      ctx.beginPath();
      ctx.moveTo(150, 250);
      ctx.bezierCurveTo(250, 180, 450, 320, 550, 220);
      ctx.stroke();

      // Swirl 2
      ctx.strokeStyle = 'rgba(237, 219, 138, 0.4)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(100, 200);
      ctx.bezierCurveTo(280, 120, 380, 280, 600, 160);
      ctx.stroke();

      // Stars
      const stars = [
        { x: 120, y: 100, r: 25 },
        { x: 280, y: 70, r: 18 },
        { x: 420, y: 130, r: 22 },
        { x: 560, y: 90, r: 20 },
        { x: 720, y: 120, r: 35 },
      ];

      stars.forEach(s => {
        // Star outer glow
        const radGrad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, '#fada43');
        radGrad.addColorStop(0.7, 'rgba(240, 210, 60, 0.3)');
        radGrad.addColorStop(1, 'rgba(15, 23, 54, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Giant Crescent Moon (Top Right)
      ctx.fillStyle = '#fce46c';
      ctx.shadowColor = '#e39d24';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(720, 80, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Blue crescent shadow to make it crescent
      ctx.fillStyle = '#0f1736';
      ctx.beginPath();
      ctx.arc(705, 80, 30, 0, Math.PI * 2);
      ctx.fill();

      // Cypress tree (Blackish green silhouette on Left)
      ctx.fillStyle = '#0d1610';
      ctx.beginPath();
      ctx.moveTo(30, HEIGHT);
      ctx.quadraticCurveTo(80, 300, 60, 200);
      ctx.quadraticCurveTo(50, 120, 75, 80);
      ctx.quadraticCurveTo(90, 140, 95, 220);
      ctx.quadraticCurveTo(120, 320, 150, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Village silhouettes at bottom
      ctx.fillStyle = '#090a14';
      ctx.fillRect(200, HEIGHT - 40, 450, 40);
      // Church spire
      ctx.beginPath();
      ctx.moveTo(450, HEIGHT - 40);
      ctx.lineTo(465, HEIGHT - 110);
      ctx.lineTo(480, HEIGHT - 40);
      ctx.fill();

    } else if (type === 'scream') {
      // Scream background
      // Wavy sky
      const colors = ['#e65429', '#f08628', '#ebd444', '#2a446c', '#152140'];
      const sliceH = HEIGHT / 5;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.moveTo(0, i * sliceH);
        for (let x = 0; x <= WIDTH; x += 40) {
          const y = i * sliceH + Math.sin(x * 0.01 + i) * 30;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(WIDTH, HEIGHT);
        ctx.lineTo(0, HEIGHT);
        ctx.closePath();
        ctx.fill();
      }

      // Blue fjord water
      ctx.fillStyle = '#161a36';
      ctx.beginPath();
      ctx.moveTo(0, 250);
      ctx.bezierCurveTo(300, 200, 500, 350, WIDTH, 280);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.fill();

      // Dynamic orange brush strokes on water
      ctx.strokeStyle = '#c9512c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, 310);
      ctx.quadraticCurveTo(400, 290, 600, 330);
      ctx.stroke();

      // Diagonal Bridge on the left
      ctx.fillStyle = '#8f7756';
      ctx.beginPath();
      ctx.moveTo(0, 350);
      ctx.lineTo(350, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.fill();

      // Handrails
      ctx.strokeStyle = '#524330';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 350);
      ctx.lineTo(350, HEIGHT);
      ctx.stroke();

      // Ghostly figure sketch on bridge
      ctx.fillStyle = '#dad8c4'; // head
      ctx.beginPath();
      ctx.arc(120, 380, 18, 0, Math.PI * 2);
      ctx.fill();
      // Eyes/mouth holes
      ctx.fillStyle = '#161a36';
      ctx.beginPath();
      ctx.arc(114, 376, 3, 0, Math.PI * 2);
      ctx.arc(126, 376, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(120, 388, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.fillStyle = '#1b1c2b';
      ctx.beginPath();
      ctx.moveTo(105, 398);
      ctx.quadraticCurveTo(120, 410, 135, 398);
      ctx.lineTo(150, HEIGHT);
      ctx.lineTo(90, HEIGHT);
      ctx.fill();

    } else if (type === 'greatwave') {
      // Beige sky
      ctx.fillStyle = '#ebdcc1';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Distant Mount Fuji
      ctx.fillStyle = '#52617a'; // Mountain base
      ctx.beginPath();
      ctx.moveTo(350, 360);
      ctx.lineTo(400, 270);
      // Crater tip flat
      ctx.lineTo(415, 270);
      ctx.lineTo(465, 360);
      ctx.fill();

      // Fuji snow cap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(389, 290);
      ctx.lineTo(400, 270);
      ctx.lineTo(415, 270);
      ctx.lineTo(426, 290);
      ctx.quadraticCurveTo(407, 300, 389, 290);
      ctx.fill();

      // Layered background wave (medium blue)
      ctx.fillStyle = '#1c456e';
      ctx.beginPath();
      ctx.moveTo(0, 380);
      ctx.bezierCurveTo(200, 320, 500, 480, WIDTH, 360);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.fill();

      // Foreground main huge wave (Prussian blue)
      ctx.fillStyle = '#0c2242';
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT);
      ctx.lineTo(0, 220);
      ctx.bezierCurveTo(150, 100, 380, 250, 500, 350);
      ctx.bezierCurveTo(620, 420, 720, 340, WIDTH, 410);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Wave crest white foam (curled claws)
      ctx.fillStyle = '#f7f6f0';
      ctx.beginPath();
      ctx.arc(100, 180, 25, 0, Math.PI * 2);
      ctx.arc(140, 160, 20, 0, Math.PI * 2);
      ctx.arc(60, 210, 22, 0, Math.PI * 2);
      ctx.fill();

      // Spray details
      ctx.fillStyle = '#f7f6f0';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.arc(120 + Math.random() * 80, 140 + Math.random() * 100, 3 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Foam lines along wave curves
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 230);
      ctx.quadraticCurveTo(150, 130, 350, 270);
      ctx.stroke();

    } else if (type === 'pearlearring') {
      // Jet Black background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Golden shoulders / robe
      ctx.fillStyle = '#bfa14c';
      ctx.beginPath();
      ctx.moveTo(320, HEIGHT);
      ctx.quadraticCurveTo(400, 360, 480, HEIGHT);
      ctx.fill();

      // Face (pale peach)
      ctx.fillStyle = '#ebd6be';
      ctx.beginPath();
      ctx.arc(400, 220, 55, 0, Math.PI * 2);
      ctx.fill();

      // Royal Blue headscarf
      ctx.fillStyle = '#16358c';
      ctx.beginPath();
      // Scarf top
      ctx.arc(400, 175, 58, Math.PI, Math.PI * 1.9);
      ctx.quadraticCurveTo(460, 170, 465, 230);
      ctx.quadraticCurveTo(440, 240, 400, 230);
      ctx.fill();

      // Hanging tail of scarf (yellow/gold)
      ctx.fillStyle = '#d9bf34';
      ctx.beginPath();
      ctx.moveTo(435, 230);
      ctx.quadraticCurveTo(470, 260, 460, 370);
      ctx.lineTo(415, 350);
      ctx.quadraticCurveTo(430, 260, 435, 230);
      ctx.fill();

      // Pearl earring (gleaming silver & white)
      const pearlX = 360;
      const pearlY = 250;
      const radGrad = ctx.createRadialGradient(pearlX - 3, pearlY - 3, 1, pearlX, pearlY, 12);
      radGrad.addColorStop(0, '#ffffff');
      radGrad.addColorStop(0.5, '#c7ced4');
      radGrad.addColorStop(1, '#3b434a');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(pearlX, pearlY, 11, 0, Math.PI * 2);
      ctx.fill();

      // Eyes & red lips minimal highlights
      ctx.fillStyle = '#120f1c';
      ctx.beginPath();
      ctx.arc(385, 210, 4, 0, Math.PI * 2);
      ctx.arc(415, 215, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b03323';
      ctx.beginPath();
      ctx.ellipse(395, 252, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'sunflowers') {
      // Background gradient (Warm yellow and cream tones)
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#fff59d');
      grad.addColorStop(1, '#bcaaa4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Rustic table/shelf at bottom
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);

      // Amber/Gold rustic vase
      ctx.fillStyle = '#bfa14c';
      ctx.beginPath();
      ctx.moveTo(350, HEIGHT - 80);
      ctx.lineTo(320, HEIGHT - 200);
      ctx.lineTo(480, HEIGHT - 200);
      ctx.lineTo(450, HEIGHT - 80);
      ctx.closePath();
      ctx.fill();

      // Green Stems
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 5;
      const sunflowers = [
        { x: 300, y: 160, r: 35 },
        { x: 400, y: 110, r: 45 },
        { x: 500, y: 170, r: 40 },
        { x: 230, y: 230, r: 32 },
        { x: 570, y: 240, r: 32 }
      ];
      sunflowers.forEach(f => {
        ctx.beginPath();
        ctx.moveTo(400, HEIGHT - 200);
        ctx.quadraticCurveTo(f.x, (HEIGHT - 200 + f.y) / 2, f.x, f.y);
        ctx.stroke();
      });

      // Blossoming Sunflowers
      sunflowers.forEach(f => {
        // Outer rays
        ctx.fillStyle = '#fbc02d';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();

        // Petal spokes
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x + Math.cos(angle) * (f.r + 10), f.y + Math.sin(angle) * (f.r + 10));
          ctx.stroke();
        }

        // Dark seed disc
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Yellow pollen seed dots
        ctx.fillStyle = '#ffb300';
        for (let j = 0; j < 6; j++) {
          ctx.beginPath();
          ctx.arc(f.x + (Math.sin(j * 4.3) * f.r * 0.35), f.y + (Math.cos(j * 2.7) * f.r * 0.35), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

    } else if (type === 'waterlilies') {
      // Serene deep purple-indigo-blue water background
      const waterGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      waterGrad.addColorStop(0, '#0f172a');
      waterGrad.addColorStop(0.5, '#1e1b4b');
      waterGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Ripple lines for water flow (purple and soft cyan currents)
      ctx.strokeStyle = 'rgba(74, 20, 140, 0.3)';
      ctx.lineWidth = 14;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 100 + i * 80);
        ctx.bezierCurveTo(WIDTH * 0.3, 100 + i * 80 - 15, WIDTH * 0.7, 100 + i * 80 + 15, WIDTH, 100 + i * 80);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(128, 222, 234, 0.12)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 150 + i * 110);
        ctx.bezierCurveTo(WIDTH * 0.3, 150 + i * 110 + 10, WIDTH * 0.7, 150 + i * 110 - 10, WIDTH, 150 + i * 110);
        ctx.stroke();
      }

      // Flat green lily pads (ellipses)
      const pads = [
        { x: 180, y: 150, rx: 42, ry: 14 },
        { x: 420, y: 220, rx: 55, ry: 18 },
        { x: 680, y: 180, rx: 48, ry: 16 },
        { x: 250, y: 420, rx: 70, ry: 22 },
        { x: 550, y: 320, rx: 50, ry: 16 },
        { x: 750, y: 480, rx: 75, ry: 25 },
        { x: 480, y: 550, rx: 60, ry: 20 }
      ];
      pads.forEach(p => {
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 1.85);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Pink & White blooming Water Lilies
      const flowersWater = [
        { x: 180, y: 140 },
        { x: 420, y: 205 },
        { x: 250, y: 405 },
        { x: 750, y: 460 }
      ];
      flowersWater.forEach(f => {
        ctx.save();
        // Pink outer petals
        ctx.fillStyle = '#f8bbd0';
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 11, 4, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        // White inner petals
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + 0.2;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 7, 2.5, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        // Gold core
        ctx.fillStyle = '#fce46c';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (type === 'thekiss') {
      // Gustav Klimt's The Kiss - Golden geometric abstraction
      // Rich gold background with geometric mosaic pattern
      const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      bgGrad.addColorStop(0, '#d4af37');
      bgGrad.addColorStop(0.3, '#e5a93b');
      bgGrad.addColorStop(0.6, '#b8860b');
      bgGrad.addColorStop(1, '#8b6914');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Geometric mosaic tiles background
      const mosaicColors = ['#c9a227', '#8b7355', '#6b4423', '#f48fb1', '#26a69a', '#ef5350', '#cfd8dc'];
      for (let y = 0; y < HEIGHT; y += 18) {
        for (let x = 0; x < WIDTH; x += 18) {
          if (Math.random() > 0.4) {
            const colorIdx = Math.floor(Math.random() * mosaicColors.length);
            ctx.fillStyle = mosaicColors[colorIdx];
            const size = 8 + Math.random() * 8;
            ctx.fillRect(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, size, size);
          }
        }
      }

      // The embracing figures silhouette in center
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      // Male figure (left)
      ctx.moveTo(450, 700);
      ctx.lineTo(420, 350);
      ctx.quadraticCurveTo(400, 280, 430, 220);
      ctx.arc(455, 200, 45, 0, Math.PI * 2); // Head
      ctx.quadraticCurveTo(500, 220, 520, 280);
      ctx.lineTo(550, 350);
      ctx.lineTo(520, 700);
      ctx.fill();

      // Female figure (right, kneeling)
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(550, 700);
      ctx.lineTo(580, 400);
      ctx.quadraticCurveTo(600, 320, 620, 280);
      ctx.arc(645, 260, 40, 0, Math.PI * 2); // Head
      ctx.quadraticCurveTo(670, 300, 680, 380);
      ctx.lineTo(690, 700);
      ctx.fill();

      // Gold leaf overlay patterns (spiral shapes)
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = 200 + i * 120;
        const cy = 100 + (i % 3) * 250;
        for (let angle = 0; angle < Math.PI * 6; angle += 0.2) {
          const r = 30 + angle * 8;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Decorative gold frame elements
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(50, 100 + i * 120);
        ctx.lineTo(100, 150 + i * 120);
        ctx.lineTo(80, 200 + i * 120);
        ctx.stroke();
      }

    } else if (type === 'venus') {
      // Botticelli's The Birth of Venus - Renaissance elegance
      // Serene sea background
      const seaGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      seaGrad.addColorStop(0, '#87ceeb');
      seaGrad.addColorStop(0.3, '#add8e6');
      seaGrad.addColorStop(0.7, '#40e0d0');
      seaGrad.addColorStop(1, '#20b2aa');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Wind zephyrs (left side)
      ctx.fillStyle = 'rgba(255, 248, 220, 0.8)';
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.translate(100 + i * 80, 300 + i * 50);
        // Flowing robes
        ctx.beginPath();
        ctx.moveTo(-30, 50);
        ctx.quadraticCurveTo(-60, 100, -30, 200);
        ctx.quadraticCurveTo(0, 250, 30, 200);
        ctx.quadraticCurveTo(60, 100, 30, 50);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = '#ffebcd';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        // Hair
        ctx.fillStyle = '#fada43';
        ctx.beginPath();
        ctx.arc(0, -5, 22, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }

      // Giant scallop shell (center)
      ctx.fillStyle = '#ffcdd2';
      ctx.beginPath();
      ctx.ellipse(550, 450, 120, 80, 0, 0, Math.PI * 1.8);
      ctx.lineTo(550, 450);
      ctx.closePath();
      ctx.fill();

      // Shell ridges
      ctx.strokeStyle = '#f48fb1';
      ctx.lineWidth = 2;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.ellipse(550, 450, 120 - i * 20, 80 - i * 13, 0, 0, Math.PI * 1.8);
        ctx.stroke();
      }

      // Venus figure (emerging from shell)
      ctx.save();
      ctx.translate(550, 350);
      // Body
      ctx.fillStyle = '#ffebee';
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 50, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(0, -60, 25, 0, Math.PI * 2);
      ctx.fill();
      // Golden hair
      ctx.fillStyle = '#fada43';
      ctx.beginPath();
      ctx.moveTo(-25, -75);
      ctx.quadraticCurveTo(-35, -120, 0, -100);
      ctx.quadraticCurveTo(35, -120, 25, -75);
      ctx.quadraticCurveTo(20, -60, 0, -50);
      ctx.quadraticCurveTo(-20, -60, -25, -75);
      ctx.fill();
      ctx.restore();

      // Falling rose petals
      const petalPositions = [
        { x: 300, y: 200 }, { x: 350, y: 280 }, { x: 400, y: 350 },
        { x: 600, y: 220 }, { x: 650, y: 300 }, { x: 700, y: 380 },
        { x: 450, y: 180 }, { x: 500, y: 250 }, { x: 550, y: 320 },
        { x: 250, y: 400 }, { x: 750, y: 450 }
      ];
      petalPositions.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillStyle = '#ff80ab';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Right side figure (offering cloak)
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.moveTo(850, 700);
      ctx.lineTo(830, 400);
      ctx.quadraticCurveTo(850, 350, 820, 300);
      ctx.quadraticCurveTo(790, 350, 800, 400);
      ctx.lineTo(820, 700);
      ctx.fill();

    } else if (type === 'liberty') {
      // Delacroix's Liberty Leading the People - Romantic revolution
      // Sky with dramatic clouds
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      skyGrad.addColorStop(0, '#4a5568');
      skyGrad.addColorStop(0.3, '#718096');
      skyGrad.addColorStop(0.6, '#c53030'); // Red sky tone
      skyGrad.addColorStop(1, '#2d3748');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Smoke clouds (battle scene)
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(138, 112, 86, ${0.3 + Math.random() * 0.4})`;
        ctx.beginPath();
        const cx = 100 + Math.random() * (WIDTH - 200);
        const cy = 100 + Math.random() * 300;
        ctx.arc(cx, cy, 40 + Math.random() * 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tricolor flag (Blue-White-Red) flowing
      ctx.save();
      ctx.translate(400, 200);
      ctx.rotate(-0.2);
      // Blue stripe
      ctx.fillStyle = '#0f4c81';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(50, 50, 30, 150);
      ctx.lineTo(10, 0);
      ctx.quadraticCurveTo(-30, 50, -20, 150);
      ctx.closePath();
      ctx.fill();
      // White stripe
      ctx.fillStyle = '#f7fafc';
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.quadraticCurveTo(80, 50, 60, 150);
      ctx.lineTo(30, 150);
      ctx.quadraticCurveTo(20, 50, 0, 0);
      ctx.closePath();
      ctx.fill();
      // Red stripe
      ctx.fillStyle = '#c53030';
      ctx.beginPath();
      ctx.moveTo(60, 0);
      ctx.quadraticCurveTo(110, 50, 90, 150);
      ctx.lineTo(60, 150);
      ctx.quadraticCurveTo(50, 50, 30, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Liberty figure silhouette
      ctx.fillStyle = '#1a202c';
      ctx.beginPath();
      // Dress body
      ctx.moveTo(420, 700);
      ctx.lineTo(400, 450);
      ctx.quadraticCurveTo(420, 400, 450, 380);
      ctx.arc(460, 360, 25, 0, Math.PI * 2); // Head
      ctx.quadraticCurveTo(500, 400, 520, 450);
      ctx.lineTo(540, 700);
      ctx.fill();

      // Raised arm with Phrygian cap
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(500, 380);
      ctx.lineTo(530, 320);
      ctx.stroke();
      // Cap
      ctx.fillStyle = '#c53030';
      ctx.beginPath();
      ctx.moveTo(530, 320);
      ctx.lineTo(520, 290);
      ctx.lineTo(540, 295);
      ctx.closePath();
      ctx.fill();

      // Rifle/musket
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(480, 420);
      ctx.lineTo(430, 380);
      ctx.stroke();

      // Barricade and fallen figures
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(100, 550, 200, 150);
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(800, 580, 150, 120);

      // Cobblestones texture (ground)
      for (let y = 550; y < HEIGHT; y += 20) {
        for (let x = 0; x < WIDTH; x += 25) {
          ctx.fillStyle = Math.random() > 0.5 ? '#4a5568' : '#2d3748';
          ctx.beginPath();
          ctx.ellipse(x + (y % 40) * 10, y, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (type === 'persistence') {
      // Dali's The Persistence of Memory - Surreal melting dreams
      // Desert landscape with surreal blue sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      skyGrad.addColorStop(0, '#0f3c5f');
      skyGrad.addColorStop(0.4, '#1e5a7a');
      skyGrad.addColorStop(0.7, '#e2b36e');
      skyGrad.addColorStop(1, '#df8f3d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Distant mountains/horizon
      ctx.fillStyle = '#0f3c5f';
      ctx.beginPath();
      ctx.moveTo(0, 450);
      ctx.quadraticCurveTo(300, 400, 600, 430);
      ctx.quadraticCurveTo(850, 400, WIDTH, 450);
      ctx.lineTo(WIDTH, 700);
      ctx.lineTo(0, 700);
      ctx.fill();

      // Withered olive tree (left)
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(150, 700);
      ctx.lineTo(140, 500);
      ctx.quadraticCurveTo(150, 350, 200, 250);
      ctx.stroke();
      // Dead branches
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(160, 450);
      ctx.quadraticCurveTo(200, 400, 250, 380);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(155, 400);
      ctx.quadraticCurveTo(120, 300, 100, 250);
      ctx.stroke();

      // Melting pocket watches
      const watches = [
        { x: 400, y: 350, rx: 60, ry: 30, rotation: 0.3 },
        { x: 650, y: 280, rx: 50, ry: 25, rotation: -0.4 },
        { x: 300, y: 500, rx: 40, ry: 20, rotation: 0.8 }
      ];
      watches.forEach(w => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rotation);
        // Watch face (distorted oval)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, w.rx, w.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Clock hands
        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -w.rx * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w.rx * 0.4, 0);
        ctx.stroke();
        // Ants on watch (surreal element)
        ctx.fillStyle = '#1a202c';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-w.rx * 0.6 + i * 8, w.ry * 0.3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Strange creature (sleeping face-like blob)
      ctx.fillStyle = '#e2b36e';
      ctx.beginPath();
      ctx.moveTo(750, 500);
      ctx.quadraticCurveTo(720, 420, 780, 380);
      ctx.quadraticCurveTo(850, 420, 880, 500);
      ctx.quadraticCurveTo(860, 580, 750, 580);
      ctx.closePath();
      ctx.fill();
      // Closed eye lines
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(770, 450);
      ctx.quadraticCurveTo(800, 440, 830, 450);
      ctx.stroke();

      // Plate with ant-covered object
      ctx.fillStyle = '#8b7355';
      ctx.beginPath();
      ctx.ellipse(500, 600, 60, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Object on plate
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.ellipse(500, 580, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // More ants
      ctx.fillStyle = '#1a202c';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(480 + i * 10 + Math.random() * 10, 595 + Math.random() * 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (type === 'cafeterrace') {
      // Van Gogh's Café Terrace at Night - Impressionist night scene
      // Deep cobalt night sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.6);
      skyGrad.addColorStop(0, '#0c1446');
      skyGrad.addColorStop(0.5, '#1e3a8a');
      skyGrad.addColorStop(1, '#1e40af');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Starry night sky with rotating brushstrokes
      const stars = [
        { x: 150, y: 80 }, { x: 300, y: 120 }, { x: 450, y: 60 },
        { x: 600, y: 100 }, { x: 750, y: 70 }, { x: 900, y: 110 },
        { x: 200, y: 180 }, { x: 800, y: 160 }
      ];
      stars.forEach(star => {
        // Star glow
        const radGrad = ctx.createRadialGradient(star.x, star.y, 1, star.x, star.y, 25);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, '#fada43');
        radGrad.addColorStop(0.7, 'rgba(240, 210, 60, 0.3)');
        radGrad.addColorStop(1, 'rgba(12, 20, 70, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 25, 0, Math.PI * 2);
        ctx.fill();
        // Star core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Large crescent moon
      ctx.fillStyle = '#fada43';
      ctx.shadowColor = '#e39d24';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(850, 80, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0c1446';
      ctx.beginPath();
      ctx.arc(835, 80, 30, 0, Math.PI * 2);
      ctx.fill();

      // Swirling night sky brushstrokes (Van Gogh style)
      ctx.strokeStyle = 'rgba(94, 139, 196, 0.4)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(50 + i * 150, 200);
        ctx.bezierCurveTo(150 + i * 100, 150, 250 + i * 80, 220, 350 + i * 120, 200);
        ctx.stroke();
      }

      // Café terrace floor (cobblestones)
      ctx.fillStyle = '#00796b';
      ctx.fillRect(0, HEIGHT * 0.5, WIDTH, HEIGHT * 0.5);
      // Cobblestone pattern
      ctx.fillStyle = '#00695c';
      for (let y = HEIGHT * 0.5; y < HEIGHT; y += 25) {
        for (let x = 0; x < WIDTH; x += 25) {
          ctx.beginPath();
          ctx.ellipse(x + (y % 50) * 10, y, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Café building facades
      // Left building
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(50, HEIGHT * 0.5 - 180, 200, 180);
      // Windows with warm light
      ctx.fillStyle = '#ffc107';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(80, HEIGHT * 0.5 - 150 + i * 40, 40, 30);
        ctx.fillRect(150, HEIGHT * 0.5 - 150 + i * 40, 40, 30);
      }
      // Window shutters
      ctx.fillStyle = '#bf360c';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(75, HEIGHT * 0.5 - 150 + i * 40, 5, 30);
        ctx.fillRect(120, HEIGHT * 0.5 - 150 + i * 40, 5, 30);
        ctx.fillRect(145, HEIGHT * 0.5 - 150 + i * 40, 5, 30);
        ctx.fillRect(190, HEIGHT * 0.5 - 150 + i * 40, 5, 30);
      }

      // Main café (center)
      ctx.fillStyle = '#3b4f5e';
      ctx.fillRect(250, HEIGHT * 0.5 - 200, 400, 200);
      // Large windows with golden light
      ctx.fillStyle = '#ffc107';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(270, HEIGHT * 0.5 - 170 + i * 40, 80, 35);
        ctx.fillRect(370, HEIGHT * 0.5 - 170 + i * 40, 80, 35);
      }
      // Café awning/stripe pattern
      ctx.fillStyle = '#ffc107';
      ctx.fillRect(250, HEIGHT * 0.5 - 200, 400, 20);
      ctx.fillStyle = '#0c1446';
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(250 + i * 20, HEIGHT * 0.5 - 200, 10, 20);
      }

      // Right building
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(650, HEIGHT * 0.5 - 160, 180, 160);
      // Windows
      ctx.fillStyle = '#ffc107';
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(670, HEIGHT * 0.5 - 130 + i * 50, 50, 40);
        ctx.fillRect(750, HEIGHT * 0.5 - 130 + i * 50, 50, 40);
      }

      // Terrace tables and chairs
      const tablePositions = [
        { x: 300, y: HEIGHT * 0.5 + 50 }, { x: 400, y: HEIGHT * 0.5 + 80 },
        { x: 500, y: HEIGHT * 0.5 + 40 }, { x: 600, y: HEIGHT * 0.5 + 70 }
      ];
      tablePositions.forEach(pos => {
        // Table top
        ctx.fillStyle = '#bf360c';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Table legs
        ctx.fillStyle = '#3b4f5e';
        ctx.fillRect(pos.x - 3, pos.y, 6, 30);
        // Chairs (simplified)
        ctx.fillStyle = '#bf360c';
        ctx.fillRect(pos.x - 40, pos.y + 10, 10, 25);
        ctx.fillRect(pos.x + 30, pos.y + 10, 10, 25);
      });

      // People silhouettes at tables
      ctx.fillStyle = '#0c1446';
      tablePositions.slice(0, 2).forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 20, 12, 0, Math.PI * 2); // Head
        ctx.fill();
      });
    } else if (type === 'earthlydelights') {
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#12041d');
      grad.addColorStop(0.36, '#0f2f35');
      grad.addColorStop(0.72, '#3b0f35');
      grad.addColorStop(1, '#f472b6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = 'rgba(20, 184, 166, 0.65)';
      ctx.beginPath();
      ctx.ellipse(WIDTH * 0.5, HEIGHT * 0.65, 420, 130, -0.08, 0, Math.PI * 2);
      ctx.fill();

      const fruit = [
        { x: 180, y: 150, r: 58, c: '#f472b6' },
        { x: 390, y: 105, r: 72, c: '#fff7ed' },
        { x: 620, y: 185, r: 54, c: '#a3e635' },
        { x: 850, y: 120, r: 66, c: '#fb7185' },
        { x: 510, y: 330, r: 42, c: '#14b8a6' },
      ];
      fruit.forEach(item => {
        const fruitGrad = ctx.createRadialGradient(item.x - item.r * 0.35, item.y - item.r * 0.35, 3, item.x, item.y, item.r);
        fruitGrad.addColorStop(0, '#ffffff');
        fruitGrad.addColorStop(0.28, item.c);
        fruitGrad.addColorStop(1, '#1e1033');
        ctx.fillStyle = fruitGrad;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 6;
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(255, 247, 237, 0.76)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const x = 80 + i * 88;
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT - 95);
        ctx.bezierCurveTo(x + 45, 500, x - 70, 330, x + 55, 210);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(70 + i * 70, 500 + (i % 3) * 20);
        ctx.lineTo(95 + i * 70, 410 - (i % 4) * 18);
        ctx.lineTo(125 + i * 70, 500 + (i % 2) * 24);
        ctx.closePath();
        ctx.fill();
      }
    } else if (type === 'temeraire') {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, '#1d4ed8');
      sky.addColorStop(0.38, '#fb7185');
      sky.addColorStop(0.68, '#f59e0b');
      sky.addColorStop(1, '#111827');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.beginPath();
      ctx.arc(WIDTH * 0.75, HEIGHT * 0.34, 145, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(229, 231, 235, 0.2)';
      for (let y = 390; y < HEIGHT; y += 34) {
        ctx.fillRect(0, y, WIDTH, 9);
      }

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(135, 425);
      ctx.lineTo(710, 360);
      ctx.lineTo(625, 475);
      ctx.lineTo(210, 512);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const x = 250 + i * 90;
        ctx.beginPath();
        ctx.moveTo(x, 380);
        ctx.lineTo(x + 15, 160);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(120, 500 + i * 16);
        ctx.bezierCurveTo(360, 455 + i * 10, 720, 550 - i * 8, 1040, 490 + i * 14);
        ctx.stroke();
      }
    } else if (type === 'grandjatte') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const dotColors = ['#38bdf8', '#22c55e', '#ef4444', '#fde68a', '#f8fafc', '#f472b6'];
      for (let y = 18; y < HEIGHT; y += 18) {
        for (let x = 16; x < WIDTH; x += 20) {
          const idx = Math.floor((x * 3 + y * 7) / 20) % dotColors.length;
          ctx.globalAlpha = 0.35 + ((x + y) % 60) / 120;
          ctx.fillStyle = dotColors[idx];
          ctx.beginPath();
          ctx.arc(x, y, 3 + ((x + y) % 5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#111827';
      const figures = [
        { x: 205, y: 390, h: 185 },
        { x: 460, y: 355, h: 230 },
        { x: 735, y: 380, h: 190 },
        { x: 910, y: 420, h: 140 },
      ];
      figures.forEach((figure, index) => {
        ctx.beginPath();
        ctx.arc(figure.x, figure.y - figure.h * 0.45, 30 + index * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(figure.x - 13, figure.y - figure.h * 0.35, 26, figure.h);
      });

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(80, 560);
      ctx.bezierCurveTo(320, 450, 660, 610, 1030, 470);
      ctx.stroke();
    } else if (type === 'composition8') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(40 + i * 72, 35 + (i % 5) * 32);
        ctx.lineTo(20 + i * 62, HEIGHT - 45 - (i % 6) * 34);
        ctx.stroke();
      }

      const circles = [
        { x: 220, y: 210, r: 92, c: '#ef4444' },
        { x: 560, y: 160, r: 62, c: '#facc15' },
        { x: 870, y: 355, r: 110, c: '#2563eb' },
        { x: 420, y: 455, r: 55, c: '#020617' },
      ];
      circles.forEach(item => {
        ctx.fillStyle = item.c;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 5;
        ctx.stroke();
      });

      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.moveTo(700, 520);
      ctx.lineTo(1010, 590);
      ctx.lineTo(870, 310);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(520, 350, 60 + i * 35, 0.25, Math.PI * 1.55);
        ctx.stroke();
      }
    } else if (type === 'boogiewoogie') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#020617';
      for (let x = 95; x < WIDTH; x += 135) ctx.fillRect(x, 0, 18, HEIGHT);
      for (let y = 78; y < HEIGHT; y += 112) ctx.fillRect(0, y, WIDTH, 18);

      ctx.fillStyle = '#fde047';
      for (let x = 0; x < WIDTH; x += 44) {
        ctx.fillRect(x, 78, 24, 18);
        ctx.fillRect(x + 20, 414, 24, 18);
      }
      for (let y = 0; y < HEIGHT; y += 44) {
        ctx.fillRect(365, y, 18, 24);
        ctx.fillRect(770, y + 20, 18, 24);
      }

      const blocks = [
        { x: 120, y: 155, c: '#dc2626' }, { x: 285, y: 288, c: '#2563eb' },
        { x: 620, y: 160, c: '#dc2626' }, { x: 735, y: 500, c: '#2563eb' },
        { x: 925, y: 320, c: '#fde047' }, { x: 445, y: 560, c: '#dc2626' },
        { x: 1000, y: 90, c: '#2563eb' },
      ];
      blocks.forEach(block => {
        ctx.fillStyle = block.c;
        ctx.fillRect(block.x, block.y, 56, 56);
      });
    } else if (type === 'redstudio') {
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#7f1d1d');
      grad.addColorStop(0.55, '#b91c1c');
      grad.addColorStop(1, '#292524');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 7;
      const frames = [
        { x: 95, y: 90, w: 190, h: 150 },
        { x: 390, y: 70, w: 170, h: 215 },
        { x: 690, y: 105, w: 230, h: 155 },
        { x: 220, y: 430, w: 250, h: 135 },
        { x: 715, y: 430, w: 180, h: 145 },
      ];
      frames.forEach(frame => {
        ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
        ctx.beginPath();
        ctx.moveTo(frame.x + 25, frame.y + frame.h - 30);
        ctx.lineTo(frame.x + frame.w * 0.5, frame.y + 35);
        ctx.lineTo(frame.x + frame.w - 28, frame.y + frame.h - 42);
        ctx.stroke();
      });

      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(610, 555);
      ctx.lineTo(870, 470);
      ctx.lineTo(940, 585);
      ctx.stroke();

      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(610, 390, 120, 32, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 5;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(50 + i * 90, HEIGHT);
        ctx.lineTo(120 + i * 76, 310);
        ctx.stroke();
      }
    }
  };

  const getDuelMovement = (playerId: DuelPlayerId) => {
    let dx = 0;
    let dy = 0;
    if (playerId === 1) {
      if (keysPressed.current['w']) dy -= 1;
      if (keysPressed.current['s']) dy += 1;
      if (keysPressed.current['a']) dx -= 1;
      if (keysPressed.current['d']) dx += 1;
    } else {
      if (keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current['arrowright']) dx += 1;
    }
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }
    return { dx, dy };
  };

  const syncDuelScores = () => {
    const counts = calculateOwnerCounts();
    const p1 = getDuelPlayer(1);
    const p2 = getDuelPlayer(2);
    if (p1) p1.scorePixels = counts.p1;
    if (p2) p2.scorePixels = counts.p2;
    setDuelScores(counts);
    setDuelDeaths({
      p1: p1?.deaths ?? 0,
      p2: p2?.deaths ?? 0,
    });
  };

  const findSafeDuelSpawn = (player: DuelPlayer): Position => {
    const fixedSpawns: Position[] = [
      { x: 90, y: HEIGHT / 2 },
      { x: WIDTH - 90, y: HEIGHT / 2 },
      { x: WIDTH / 2, y: 90 },
      { x: WIDTH / 2, y: HEIGHT - 90 },
      { x: 150, y: 120 },
      { x: WIDTH - 150, y: HEIGHT - 120 },
    ];

    const candidates = [...fixedSpawns];
    for (let i = 0; i < 18; i++) {
      candidates.push({
        x: 80 + Math.random() * (WIDTH - 160),
        y: 80 + Math.random() * (HEIGHT - 160),
      });
    }

    const other = duelPlayersRef.current.find(p => p.id !== player.id && !p.eliminated);
    const guards = guardsRef.current;
    const candidate = candidates.find(point => {
      if (wouldDuelPlayerEnterOpponentArea(player, point.x, point.y, player.radius + 8)) return false;
      if (other && Math.hypot(other.x - point.x, other.y - point.y) < 180) return false;
      if (guards.some(guard => Math.hypot(guard.x - point.x, guard.y - point.y) < 130)) return false;
      return true;
    });

    return candidate ?? fixedSpawns[player.id - 1];
  };

  const eliminateDuelPlayer = (player: DuelPlayer, reason: 'trap' | 'guard') => {
    if (player.eliminated) return;
    player.eliminated = true;
    player.respawnTimer = DUEL_RESPAWN_SECONDS;
    player.ghostTime = 0;
    player.trappedTime = 0;
    player.vx = 0;
    player.vy = 0;
    player.isMoving = false;
    player.deaths += 1;
    const message = lang === 'en'
      ? `${player.label} vanished by ${reason === 'trap' ? 'paint enclosure' : 'guard scan'}`
      : `${player.label} ${reason === 'trap' ? '被复苏屏障围困消失' : '被巡逻兵扫描消失'}`;
    setDuelMessage(message);
    setDuelDeaths({
      p1: getDuelPlayer(1)?.deaths ?? 0,
      p2: getDuelPlayer(2)?.deaths ?? 0,
    });
    spawnSplatParticles(player.x, player.y, player.trailColor);
    audio.playSpotted();
  };

  const respawnDuelPlayer = (player: DuelPlayer) => {
    const spawn = findSafeDuelSpawn(player);
    player.x = spawn.x;
    player.y = spawn.y;
    player.color = '#ffffff';
    player.targetColor = '#ffffff';
    player.isPainted = false;
    player.camoTimeLeft = 0;
    player.eliminated = false;
    player.respawnTimer = 0;
    player.ghostTime = DUEL_GHOST_SECONDS;
    player.trappedTime = 0;
    setDuelMessage(lang === 'en' ? `${player.label} respawned` : `${player.label} 已随机复活`);
    spawnSplatParticles(player.x, player.y, player.trailColor);
  };

  const updateDuelPlayerCamouflage = (player: DuelPlayer) => {
    const bgHexColor = getPixelColor(Math.round(player.x), Math.round(player.y));
    let camRate = 0.05;

    if (player.isPainted) {
      const c1 = hexToRgb(player.color);
      const c2 = hexToRgb(bgHexColor);
      const dist = Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
      );

      if (dist <= 40) {
        camRate = 1.0;
      } else if (dist >= 210) {
        camRate = 0.0;
      } else {
        camRate = 1.0 - (dist - 40) / (210 - 40);
      }

      player.camoTimeLeft = (player.camoTimeLeft ?? 6.0) - 1 / 60;
      if (player.camoTimeLeft <= 0) {
        player.isPainted = false;
        player.camoTimeLeft = 0;
        player.targetColor = '#ffffff';
      }
    }

    player.camouflageRate = player.isMoving ? Math.min(0.15, camRate) : camRate;
  };

  const finishDuel = (trigger: 'time' | 'restored') => {
    if (!isGameRunning.current) return;
    syncDuelScores();
    const p1 = getDuelPlayer(1);
    const p2 = getDuelPlayer(2);
    if (!p1 || !p2) return;

    const p1Pct = (p1.scorePixels / (WIDTH * HEIGHT)) * 100;
    const p2Pct = (p2.scorePixels / (WIDTH * HEIGHT)) * 100;
    let winner = 'DRAW';
    if (p1.scorePixels !== p2.scorePixels) {
      winner = p1.scorePixels > p2.scorePixels ? 'P1' : 'P2';
    } else if (p1.deaths !== p2.deaths) {
      winner = p1.deaths < p2.deaths ? 'P1' : 'P2';
    } else if (p1.lastScoreAt !== p2.lastScoreAt) {
      winner = p1.lastScoreAt > p2.lastScoreAt ? 'P1' : 'P2';
    }

    const summary = lang === 'en'
      ? `Local Duel ${trigger === 'restored' ? 'ended by restoration target' : 'ended by timer'}: ${winner === 'DRAW' ? 'draw' : `${winner} wins`} | P1 ${p1Pct.toFixed(1)}% (${p1.deaths} KO) vs P2 ${p2Pct.toFixed(1)}% (${p2.deaths} KO).`
      : `本地双人${trigger === 'restored' ? '达到复苏目标提前结算' : '计时结束'}：${winner === 'DRAW' ? '平局' : `${winner} 获胜`} | P1 ${p1Pct.toFixed(1)}%（${p1.deaths}次消失） vs P2 ${p2Pct.toFixed(1)}%（${p2.deaths}次消失）。`;

    isGameRunning.current = false;
    audio.playWin();
    onLevelCleared(summary);
  };

  const updateDuelGuardLogic = (guard: Guard) => {
    guard.pulseTime += 0.05;

    const target = guard.patrolPoints[guard.currentPointIndex];
    const distToTarget = Math.hypot(target.x - guard.x, target.y - guard.y);
    if (distToTarget < 6) {
      guard.currentPointIndex = (guard.currentPointIndex + 1) % guard.patrolPoints.length;
    } else {
      const angleToTarget = Math.atan2(target.y - guard.y, target.x - guard.x);
      let angleDiff = angleToTarget - guard.angle;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const nextAngle = guard.angle + angleDiff * (guard.type === 'drone' ? 0.08 : 0.15);
      const nextX = guard.x + Math.cos(nextAngle) * guard.speed;
      const nextY = guard.y + Math.sin(nextAngle) * guard.speed;

      if (guard.type !== 'drone' && wouldGuardEnterRestoredArea(nextX, nextY, guard.radius)) {
        guard.currentPointIndex = (guard.currentPointIndex + 1) % guard.patrolPoints.length;
        guard.angle = Math.atan2(Math.sin(guard.angle + Math.PI * 0.75), Math.cos(guard.angle + Math.PI * 0.75));
      } else {
        guard.angle = nextAngle;
        guard.x = nextX;
        guard.y = nextY;
      }
    }

    if (guard.type === 'sentinel') {
      guard.angle += (guard.rotateDirection ?? 1) * 0.028;
    }

    if (guard.type === 'curator') {
      guard.abilityCooldown = (guard.abilityCooldown ?? 0) - 1 / 60;
      if (guard.abilityCooldown <= 0) {
        const eraseX = guard.x + Math.cos(guard.angle) * 34;
        const eraseY = guard.y + Math.sin(guard.angle) * 34;
        eraseRestorationAt(eraseX, eraseY, 34);
        spawnSplatParticles(eraseX, eraseY, '#f8fafc');
        guard.abilityCooldown = 3.6;
      }
    }

    let seenPlayer: DuelPlayer | null = null;
    let closestDistance = Infinity;
    duelPlayersRef.current.forEach(player => {
      if (player.eliminated || player.ghostTime > 0) return;
      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const distToPlayer = Math.hypot(dx, dy);
      if (distToPlayer >= guard.visionRange || distToPlayer >= closestDistance) return;
      const angleToPlayer = Math.atan2(dy, dx);
      let diffAngle = angleToPlayer - guard.angle;
      diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));
      if (Math.abs(diffAngle) < guard.visionAngle / 2) {
        seenPlayer = player;
        closestDistance = distToPlayer;
      }
    });

    if (seenPlayer) {
      guard.state = 'suspicious';
      const targetPlayer = seenPlayer;
      const camoGap = Math.max(0, 0.85 - targetPlayer.camouflageRate);
      const alertDelta = targetPlayer.isMoving ? 4.6 : camoGap * 2.4;
      if (alertDelta > 0) {
        guard.alertLevel = Math.min(100, guard.alertLevel + alertDelta);
        audio.playAlert(guard.alertLevel / 100);
      } else {
        guard.alertLevel = Math.max(0, guard.alertLevel - 0.3);
      }

      if (guard.alertLevel >= 100) {
        eliminateDuelPlayer(targetPlayer, 'guard');
        guard.alertLevel = 0;
        guard.state = 'patrol';
      }
    } else {
      guard.alertLevel = Math.max(0, guard.alertLevel - 0.8);
      if (guard.alertLevel === 0) guard.state = 'patrol';
    }

    if (guard.alertLevel > 80) {
      guard.state = 'alert';
    }
  };

  const updateDuelGame = () => {
    duelElapsedRef.current += 1 / 60;
    const remaining = Math.max(0, DUEL_DURATION_SECONDS - duelElapsedRef.current);
    if (frameCountRef.current % 15 === 0) {
      setDuelTimeLeft(Math.ceil(remaining));
    }
    if (remaining <= 0) {
      finishDuel('time');
      return;
    }

    duelPlayersRef.current.forEach(player => {
      if (player.eliminated) {
        player.respawnTimer -= 1 / 60;
        if (player.respawnTimer <= 0) {
          respawnDuelPlayer(player);
        }
        return;
      }

      if (player.ghostTime > 0) {
        player.ghostTime = Math.max(0, player.ghostTime - 1 / 60);
      }

      const { dx, dy } = getDuelMovement(player.id);
      const speed = player.ghostTime > 0 ? 4.5 : 4.0;
      player.vx = dx * speed;
      player.vy = dy * speed;
      player.isMoving = dx !== 0 || dy !== 0;

      const nextX = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x + player.vx));
      const nextY = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y + player.vy));
      if (!wouldDuelPlayerEnterOpponentArea(player, nextX, nextY, player.radius)) {
        player.x = nextX;
        player.y = nextY;
      } else {
        player.vx = 0;
        player.vy = 0;
        player.isMoving = false;
      }

      if (player.color !== player.targetColor) {
        player.color = lerpColor(player.color, player.targetColor, 0.12);
      }
      updateDuelPlayerCamouflage(player);

      if (player.ghostTime <= 0) {
        const gained = revealPaintingAt(player.x, player.y, player.radius + 7, player.id);
        if (gained > 0) {
          player.lastScoreAt = duelElapsedRef.current;
        }

        if (hasDuelEscapePath(player)) {
          player.trappedTime = 0;
        } else {
          player.trappedTime += 1 / 60;
          if (player.trappedTime >= DUEL_TRAP_SECONDS) {
            eliminateDuelPlayer(player, 'trap');
          }
        }
      }
    });

    frameCountRef.current++;
    if (frameCountRef.current % 10 === 0) {
      const pct = 100 - getWhiteMaskPercentage();
      restorationRateRef.current = pct;
      setMaskRevealRate(Math.min(100, Math.round(pct)));
      syncDuelScores();
      if (pct >= restorationTargetPercent) {
        finishDuel('restored');
        return;
      }
    }

    let maxAlert = 0;
    guardsRef.current.forEach(guard => {
      updateDuelGuardLogic(guard);
      maxAlert = Math.max(maxAlert, guard.alertLevel);
    });
    setAlertLevel(Math.round(maxAlert));
  };

  // Live game loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateGame = () => {
      if (isPaused || !isGameRunning.current) return;

      if (isLocalDuel) {
        updateDuelGame();
        return;
      }

      const player = playerRef.current;

      // 1. Move Player
      let dx = 0;
      let dy = 0;
      const speed = 4.2;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

      // Normalize diagonal speed
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      player.vx = dx * speed;
      player.vy = dy * speed;
      player.isMoving = (dx !== 0 || dy !== 0);

      player.x += player.vx;
      player.y += player.vy;

      // Bound checks
      if (player.x < player.radius) player.x = player.radius;
      if (player.x > WIDTH - player.radius) player.x = WIDTH - player.radius;
      if (player.y < player.radius) player.y = player.radius;
      if (player.y > HEIGHT - player.radius) player.y = HEIGHT - player.radius;

      // If sunflowers level, handle custom gameplay elements (revealing, clones, powerup)
      if (painting.proceduralType === 'sunflowers') {
        // A. Reveal paint under player
        revealPaintingAt(player.x, player.y, player.radius + 6);

        // B. Powerup update, countdown & collision
        const powerup = sunflowerPowerupRef.current;
        if (powerup && powerup.active) {
          // Timer countdown (disappears after 6 seconds)
          powerup.timeLeft -= 1 / 60;
          if (powerup.timeLeft <= 0) {
            powerup.active = false;
            powerupRespawnTimerRef.current = 6.0 + Math.random() * 4.0; // schedule next respawn
            spawnSplatParticles(powerup.x, powerup.y, '#9ca3af'); // gray puff
          } else {
            // Player collision check
            const distToPowerup = Math.hypot(player.x - powerup.x, player.y - powerup.y);
            if (distToPowerup < player.radius + powerup.radius) {
              powerup.active = false;
              powerupRespawnTimerRef.current = 6.0 + Math.random() * 4.0; // delay next spawn
              audio.playCollect();
              spawnSplatParticles(powerup.x, powerup.y, '#fbc02d');
              
              // Spawn 2 clones to help absorb, lasting 6 seconds
              clonesRef.current = [
                {
                  id: 1,
                  x: Math.max(50, Math.min(WIDTH - 50, player.x - 60)),
                  y: Math.max(50, Math.min(HEIGHT - 50, player.y + (Math.random() - 0.5) * 80)),
                  radius: player.radius,
                  color: player.color,
                  targetColor: player.targetColor,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  isMoving: true,
                  angle: Math.random() * Math.PI * 2,
                  timeLeft: 6.0
                },
                {
                  id: 2,
                  x: Math.max(50, Math.min(WIDTH - 50, player.x + 60)),
                  y: Math.max(50, Math.min(HEIGHT - 50, player.y + (Math.random() - 0.5) * 80)),
                  radius: player.radius,
                  color: player.color,
                  targetColor: player.targetColor,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  isMoving: true,
                  angle: Math.random() * Math.PI * 2,
                  timeLeft: 6.0
                }
              ];
            }
          }
        } else {
          // If no active powerup exists, count down the respawn timer
          if (powerupRespawnTimerRef.current > 0) {
            powerupRespawnTimerRef.current -= 1 / 60;
          } else {
            // Respawn!
            sunflowerPowerupRef.current = {
              x: 200 + Math.random() * (WIDTH - 400),
              y: 100 + Math.random() * (HEIGHT - 200),
              radius: 18,
              active: true,
              timeLeft: 6.0
            };
          }
        }

        // C. Update Clones
        clonesRef.current = clonesRef.current.filter(clone => {
          // Clones disappear after 6 seconds
          clone.timeLeft -= 1 / 60;
          if (clone.timeLeft <= 0) {
            spawnSplatParticles(clone.x, clone.y, clone.color); // vanish effect
            return false;
          }

          clone.x += clone.vx;
          clone.y += clone.vy;
          clone.radius = player.radius; // match player size

          // Bounce off boundary
          if (clone.x < clone.radius || clone.x > WIDTH - clone.radius) {
            clone.vx *= -1;
            clone.x = Math.max(clone.radius, Math.min(WIDTH - clone.radius, clone.x));
          }
          if (clone.y < clone.radius || clone.y > HEIGHT - clone.radius) {
            clone.vy *= -1;
            clone.y = Math.max(clone.radius, Math.min(HEIGHT - clone.radius, clone.y));
          }

          // Random wandering movement adjustment
          if (Math.random() < 0.02) {
            const angle = Math.atan2(clone.vy, clone.vx) + (Math.random() - 0.5) * 1.5;
            const speed = 4 + Math.random() * 2.5;
            clone.vx = Math.cos(angle) * speed;
            clone.vy = Math.sin(angle) * speed;
          }

          // Let clones reveal the white mask as well!
          revealPaintingAt(clone.x, clone.y, clone.radius + 6);

          // Clones blend to the painting colors under them
          if (frameCountRef.current % 12 === 0) {
            clone.targetColor = getPixelColor(Math.round(clone.x), Math.round(clone.y));
          }
          if (clone.color !== clone.targetColor) {
            clone.color = lerpColor(clone.color, clone.targetColor, 0.12);
          }

          return true;
        });

        // D. Throttled reveal calculations
        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0) {
          const pct = 100 - getWhiteMaskPercentage();
          restorationRateRef.current = pct;
          setSunflowerRevealRate(Math.min(100, Math.round(pct)));
          setMaskRevealRate(Math.min(100, Math.round(pct)));

          // Size scaling: radius goes from 16 up to 34
          player.radius = 16 + (pct / 100) * 18;

          // Restoration target opens the exit; entering the gate still clears the level.
          if (pct >= restorationTargetPercent && !exitGateRef.current.isOpen) {
            const gate = exitGateRef.current;
            gate.isOpen = true;
            setIsExitOpen(true);
            audio.playCollect();
            spawnSplatParticles(gate.x + gate.width / 2, gate.y + gate.height / 2, '#fbbf24');
          }
        }
      }

      // Handle mask levels (universal)
      if (isRestorationLevel && painting.proceduralType !== 'sunflowers') {
        // Reveal paint under player
        revealPaintingAt(player.x, player.y, player.radius + 6);

        // Reveal calculations
        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0) {
          const pct = 100 - getWhiteMaskPercentage();
          restorationRateRef.current = pct;
          setMaskRevealRate(Math.min(100, Math.round(pct)));

          // Size scaling: radius goes from 16 up to 34
          player.radius = 16 + (pct / 100) * 18;

          // Restoration target opens the exit; entering the gate still clears the level.
          if (pct >= restorationTargetPercent && !exitGateRef.current.isOpen) {
            const gate = exitGateRef.current;
            gate.isOpen = true;
            setIsExitOpen(true);
            audio.playCollect();
            spawnSplatParticles(gate.x + gate.width / 2, gate.y + gate.height / 2, '#fbbf24');
          }
        }
      }

      // ===== UNIVERSAL POWERUP SYSTEM =====
      const handlePowerupCollision = (powerup: TimeFreezePowerup | DecoyFrogPowerup | PalettePowerup | null, type: 'freeze' | 'decoy' | 'palette') => {
        if (!powerup || !powerup.active) return;
        const distToPowerup = Math.hypot(player.x - powerup.x, player.y - powerup.y);
        if (distToPowerup < player.radius + powerup.radius) {
          powerup.active = false;
          audio.playCollect();
          const powerupColor = type === 'freeze' ? '#3b82f6' : type === 'decoy' ? '#22c55e' : '#f59e0b';
          spawnSplatParticles(powerup.x, powerup.y, powerupColor);

          if (type === 'freeze') {
            // Time freeze: stops guards for 3 seconds
            timeFreezeActiveRef.current = true;
            timeFreezeTimeLeftRef.current = 3.0;
            powerup.cooldownLeft = 15.0; // 15 second cooldown
          } else if (type === 'decoy') {
            // Decoy frog: place a decoy entity at player position
            decoyEntitiesRef.current.push({
              id: Date.now(),
              x: player.x,
              y: player.y,
              radius: 14,
              color: '#22c55e',
              timeLeft: 5.0, // lasts 5 seconds
              pulseTime: 0,
            });
            powerup.cooldownLeft = 12.0; // 12 second cooldown
          } else if (type === 'palette') {
            // Palette upgrade: extends camouflage time from 6s to 10s (one-time)
            if (!hasPaletteUpgrade) {
              player.camoMaxTime = 10.0;
              player.camoTimeLeft = 10.0;
              setHasPaletteUpgrade(true);
              powerup.cooldownLeft = 99999; // permanent once used
            }
          }
        }
      };

      // Update Time Freeze Powerup
      const tfPowerup = timeFreezePowerupRef.current;
      if (tfPowerup) {
        if (tfPowerup.active) {
          tfPowerup.timeLeft -= 1 / 60;
          if (tfPowerup.timeLeft <= 0) {
            tfPowerup.active = false;
          }
          handlePowerupCollision(tfPowerup, 'freeze');
        } else if (tfPowerup.cooldownLeft > 0) {
          tfPowerup.cooldownLeft -= 1 / 60;
          if (tfPowerup.cooldownLeft <= 0) {
            tfPowerup.active = true;
            tfPowerup.timeLeft = 8.0;
            tfPowerup.x = 200 + Math.random() * (WIDTH - 400);
            tfPowerup.y = 100 + Math.random() * (HEIGHT - 200);
          }
        }
      }

      // Update Decoy Frog Powerup
      const dfPowerup = decoyFrogPowerupRef.current;
      if (dfPowerup) {
        if (dfPowerup.active) {
          dfPowerup.timeLeft -= 1 / 60;
          if (dfPowerup.timeLeft <= 0) {
            dfPowerup.active = false;
          }
          handlePowerupCollision(dfPowerup, 'decoy');
        } else if (dfPowerup.cooldownLeft > 0) {
          dfPowerup.cooldownLeft -= 1 / 60;
          if (dfPowerup.cooldownLeft <= 0) {
            dfPowerup.active = true;
            dfPowerup.timeLeft = 8.0;
            dfPowerup.x = 400 + Math.random() * (WIDTH - 500);
            dfPowerup.y = 150 + Math.random() * (HEIGHT - 300);
          }
        }
      }

      // Update Palette Powerup (only active if not collected yet)
      const palPowerup = palettePowerupRef.current;
      if (palPowerup) {
        if (palPowerup.active && !hasPaletteUpgrade) {
          palPowerup.timeLeft -= 1 / 60;
          if (palPowerup.timeLeft <= 0) {
            palPowerup.active = false;
          }
          handlePowerupCollision(palPowerup, 'palette');
        } else if (palPowerup.cooldownLeft > 0) {
          palPowerup.cooldownLeft -= 1 / 60;
          if (palPowerup.cooldownLeft <= 0 && !hasPaletteUpgrade) {
            palPowerup.active = true;
            palPowerup.timeLeft = 10.0;
            palPowerup.x = 600 + Math.random() * (WIDTH - 600);
            palPowerup.y = 200 + Math.random() * (HEIGHT - 400);
          }
        }
      }

      // Update Time Freeze Timer
      if (timeFreezeActiveRef.current) {
        timeFreezeTimeLeftRef.current -= 1 / 60;
        if (timeFreezeTimeLeftRef.current <= 0) {
          timeFreezeActiveRef.current = false;
        }
      }

      // Update Decoy Entities
      decoyEntitiesRef.current = decoyEntitiesRef.current.filter(decoy => {
        decoy.timeLeft -= 1 / 60;
        decoy.pulseTime += 0.1;
        if (decoy.timeLeft <= 0) {
          spawnSplatParticles(decoy.x, decoy.y, decoy.color);
          return false;
        }
        return true;
      });

      // Smooth color transition
      if (player.color !== player.targetColor) {
        player.color = lerpColor(player.color, player.targetColor, 0.12);
      }

      // 2. Update Splat Particles
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.alpha -= 0.025;
      });
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);

      // 3. Calculate Camouflage Rate at current player position
      const bgHexColor = getPixelColor(Math.round(player.x), Math.round(player.y));
      
      let camRate = 0;
      if (!player.isPainted) {
        // White player on white is safe, but on colored backgrounds has high visibility
        camRate = 0.05; 
      } else {
        const c1 = hexToRgb(player.color);
        const c2 = hexToRgb(bgHexColor);
        const dist = Math.sqrt(
          Math.pow(c1.r - c2.r, 2) +
          Math.pow(c1.g - c2.g, 2) +
          Math.pow(c1.b - c2.b, 2)
        );
        
        // Tolerance threshold: distance under 45 is basically perfect
        if (dist <= 40) {
          camRate = 1.0;
        } else if (dist >= 210) {
          camRate = 0.0;
        } else {
          camRate = 1.0 - (dist - 40) / (210 - 40);
        }

        // Tick down Camouflage Timer
        if (player.camoTimeLeft === undefined) {
          player.camoTimeLeft = 6.0;
          player.camoMaxTime = 6.0;
        }
        player.camoTimeLeft -= 0.0166; // roughly 1 frame time at 60fps
        if (player.camoTimeLeft <= 0) {
          // Camouflage washed off!
          player.isPainted = false;
          player.camoTimeLeft = 0;
          player.targetColor = '#ffffff';
          setActiveColor('#ffffff');
          spawnSplatParticles(player.x, player.y, '#ffffff');
          audio.playAlert(0.4);
        }
      }

      // IMPORTANT: Motion breaks camouflage!
      // If moving, camouflage is capped at 15% (very visible)
      if (player.isMoving) {
        player.camouflageRate = Math.min(0.15, camRate);
      } else {
        player.camouflageRate = camRate;
      }

      setMatchRate(Math.round(player.camouflageRate * 100));

      // Check Exit Gate discovery distance (within 180 pixels of gate center)
      const gate = exitGateRef.current;
      const gateCenterX = gate.x + gate.width / 2;
      const gateCenterY = gate.y + gate.height / 2;
      const distToGate = Math.hypot(player.x - gateCenterX, player.y - gateCenterY);
      
      if (!gate.isDiscovered && distToGate < 180) {
        gate.isDiscovered = true;
        setIsExitDiscovered(true);
        audio.playCollect();
        spawnSplatParticles(gateCenterX, gateCenterY, '#fbbf24');
      }

      // 4. Update Orbs. Restoration levels open the exit through artwork progress instead.
      if (!isRestorationLevel) {
        orbsRef.current.forEach(orb => {
          if (!orb.collected) {
            // Check collision
            const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
            if (dist < player.radius + orb.radius) {
              orb.collected = true;
              audio.playCollect();
              // Spawn splash in orb color
              spawnSplatParticles(orb.x, orb.y, orb.color);

              const newlyCollectedCount = orbsRef.current.filter(o => o.collected).length;
              setOrbsCollected(newlyCollectedCount);

              // If all 3 collected, open exit gate!
              if (newlyCollectedCount === 3) {
                exitGateRef.current.isOpen = true;
                setIsExitOpen(true);
                audio.playWin();
              }
            }
            // Pulse scale anim
            orb.pulseScale = 1.0 + Math.sin(Date.now() * 0.006) * 0.15;
          }
        });
      }

      // 5. Check Exit Goal Collision (only if open and discovered)
      if (gate.isOpen && gate.isDiscovered) {
        if (
          player.x + player.radius > gate.x &&
          player.x - player.radius < gate.x + gate.width &&
          player.y + player.radius > gate.y &&
          player.y - player.radius < gate.y + gate.height
        ) {
          // Cleared Level!
          isGameRunning.current = false;
          audio.playWin();
          onLevelCleared();
          return;
        }
      }

      // 6. Update Guards & Vision Logic
      const guards = guardsRef.current;
      let maxAlert = 0;
      const isFrozen = timeFreezeActiveRef.current;

      guards.forEach(guard => {
        // Skip guard updates if time freeze is active
        if (isFrozen) {
          guard.pulseTime += 0.05;
          maxAlert = Math.max(maxAlert, guard.alertLevel);
          return;
        }
        guard.pulseTime += 0.05;

        // A. Handle guard movement / patrol pathing
        const target = guard.patrolPoints[guard.currentPointIndex];
        const distToTarget = Math.hypot(target.x - guard.x, target.y - guard.y);

        if (distToTarget < 6) {
          // Switch to next point
          guard.currentPointIndex = (guard.currentPointIndex + 1) % guard.patrolPoints.length;
        } else {
          // Move towards target
          const angleToTarget = Math.atan2(target.y - guard.y, target.x - guard.x);
          
          // Smoothly rotate guard facing angle towards movement direction
          let angleDiff = angleToTarget - guard.angle;
          // Normalize to -PI to PI
          angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
          const nextAngle = guard.angle + angleDiff * 0.15;
          const nextX = guard.x + Math.cos(nextAngle) * guard.speed;
          const nextY = guard.y + Math.sin(nextAngle) * guard.speed;

          if (guard.type !== 'drone' && wouldGuardEnterRestoredArea(nextX, nextY, guard.radius)) {
            guard.currentPointIndex = (guard.currentPointIndex + 1) % guard.patrolPoints.length;
            guard.angle = Math.atan2(Math.sin(guard.angle + Math.PI * 0.75), Math.cos(guard.angle + Math.PI * 0.75));
          } else {
            guard.angle = nextAngle;
            guard.x = nextX;
            guard.y = nextY;
          }
        }

        if (guard.type === 'sentinel') {
          guard.angle += (guard.rotateDirection ?? 1) * 0.028;
        }

        if (guard.type === 'curator') {
          guard.abilityCooldown = (guard.abilityCooldown ?? 0) - 1 / 60;
          if (guard.abilityCooldown <= 0) {
            const eraseX = guard.x + Math.cos(guard.angle) * 34;
            const eraseY = guard.y + Math.sin(guard.angle) * 34;
            eraseRestorationAt(eraseX, eraseY, 34);
            spawnSplatParticles(eraseX, eraseY, '#f8fafc');
            guard.abilityCooldown = 3.6;
          }
        }

        // B. Vision Cone Detection Checks
        // Check decoys first - they attract guard attention
        const decoys = decoyEntitiesRef.current;
        let targetX = player.x;
        let targetY = player.y;
        let isDecoyTarget = false;

        for (const decoy of decoys) {
          const distToDecoy = Math.hypot(decoy.x - guard.x, decoy.y - guard.y);
          if (distToDecoy < guard.visionRange) {
            const angleToDecoy = Math.atan2(decoy.y - guard.y, decoy.x - guard.x);
            let diffAngle = angleToDecoy - guard.angle;
            diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));
            if (Math.abs(diffAngle) < guard.visionAngle / 2) {
              targetX = decoy.x;
              targetY = decoy.y;
              isDecoyTarget = true;
              break; // Found closest decoy in vision
            }
          }
        }

        const dx = targetX - guard.x;
        const dy = targetY - guard.y;
        const distToPlayer = Math.hypot(dx, dy);

        let isInsideVision = false;

        if (distToPlayer < guard.visionRange) {
          // Calculate angle from guard to target
          const angleToPlayer = Math.atan2(dy, dx);
          let diffAngle = angleToPlayer - guard.angle;
          // Normalize
          diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));

          if (Math.abs(diffAngle) < guard.visionAngle / 2) {
            isInsideVision = true;
          }
        }

        // C. Alert accumulation logic
        // Only check player if not decoy target
        if (isInsideVision && !isDecoyTarget) {
          guard.state = 'suspicious';

          // Alert rate increases.
          // If player is moving: instant detection!
          // If still, rate depends on camouflage mismatch.
          let alertDelta = 0;
          if (player.isMoving) {
            alertDelta = 5.0; // High instant threat
          } else {
            // Below 85% match triggers alert. Below that, fills faster.
            const camoGap = Math.max(0, 0.85 - player.camouflageRate);
            alertDelta = camoGap * 2.8;
          }

          if (alertDelta > 0) {
            guard.alertLevel = Math.min(100, guard.alertLevel + alertDelta);
            audio.playAlert(guard.alertLevel / 100);
          } else {
            // Very slowly decay alert level if they are perfectly camouflaged
            guard.alertLevel = Math.max(0, guard.alertLevel - 0.2);
          }
        } else if (isInsideVision && isDecoyTarget) {
          // Guard is looking at decoy - reset alert
          guard.alertLevel = Math.max(0, guard.alertLevel - 1.0);
          if (guard.alertLevel === 0) {
            guard.state = 'patrol';
          }
        } else {
          // Guard slowly calms down if player is not in sight
          guard.alertLevel = Math.max(0, guard.alertLevel - 0.8);
          if (guard.alertLevel === 0) {
            guard.state = 'patrol';
          }
        }

        if (guard.alertLevel > 80) {
          guard.state = 'alert';
        }

        maxAlert = Math.max(maxAlert, guard.alertLevel);

        // Fail criteria: Alert level reached 100!
        if (guard.alertLevel >= 100) {
          isGameRunning.current = false;
          audio.playSpotted();
          const reason = lang === 'en'
            ? `${CANVAS_TRANSLATIONS.en.failPrefix}${player.isMoving ? CANVAS_TRANSLATIONS.en.spottedMove : CANVAS_TRANSLATIONS.en.spottedColor}`
            : `${CANVAS_TRANSLATIONS.zh.failPrefix}${player.isMoving ? CANVAS_TRANSLATIONS.zh.spottedMove : CANVAS_TRANSLATIONS.zh.spottedColor}`;
          onGameOver(reason);
          return;
        }
      });

      setAlertLevel(Math.round(maxAlert));
    };

    // Render Canvas Frame
    const render = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw background masterpiece from offscreen
      const offscreen = offscreenCanvasRef.current;
      if (offscreen) {
        ctx.drawImage(offscreen, 0, 0);
        // If mask level, draw the reveal mask on top of the masterpiece!
        if (isRestorationLevel && revealCanvasRef.current) {
          ctx.drawImage(revealCanvasRef.current, 0, 0);
        }
        if (isLocalDuel && ownerOverlayCanvasRef.current) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(ownerOverlayCanvasRef.current, 0, 0);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // Draw Exit Gate (Only if discovered!)
      const gate = exitGateRef.current;
      const currentRestorationPct = Math.min(100, Math.round(restorationRateRef.current));
      const restorationStatusText = lang === 'en'
        ? `${isLocalDuel ? 'Duel restoration' : 'Restore artwork'}: ${currentRestorationPct}% / ${restorationTargetPercent}%`
        : `${isLocalDuel ? '双人复苏' : '画作复苏'}：${currentRestorationPct}% / ${restorationTargetPercent}%`;
      const lockedObjectiveText = isRestorationLevel
        ? `${CANVAS_TRANSLATIONS[lang].restoreArtwork} ${restorationTargetPercent}%`
        : CANVAS_TRANSLATIONS[lang].collect3Orbs;
      if (gate.isDiscovered) {
        if (gate.isOpen) {
          // Glowing portal frame
          const pulse = Math.sin(Date.now() * 0.01) * 6;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 15 + pulse;
          
          ctx.fillStyle = '#fbbf24'; // Golden gate
          ctx.fillRect(gate.x - 3, gate.y - 3, gate.width + 6, gate.height + 6);
          
          // Portal center
          ctx.fillStyle = '#1e1b4b'; // Deep void
          ctx.fillRect(gate.x, gate.y, gate.width, gate.height);

          // Animated swirling stars in exit portal
          ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
          const starY = gate.y + (gate.height > gate.width ? 15 + (Date.now() * 0.05) % (gate.height - 30) : gate.height / 2);
          const starX = gate.x + (gate.width > gate.height ? 15 + (Date.now() * 0.05) % (gate.width - 30) : gate.width / 2);
          ctx.beginPath();
          ctx.arc(starX, starY, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0; // reset
          
          // Label
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(CANVAS_TRANSLATIONS[lang].exitOpenLabel, gate.x + gate.width / 2, gate.y - 8);
        } else {
          // Locked gate silhouette (translucent wood frame outline)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.lineWidth = 3;
          ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
          
          // Locked lock icon
          ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          if (gate.height > gate.width) {
            ctx.fillText(CANVAS_TRANSLATIONS[lang].locked, gate.x + gate.width / 2, gate.y + gate.height / 2 + 3);
            ctx.fillText(lockedObjectiveText, gate.x + gate.width / 2, gate.y + gate.height / 2 + 18);
          } else {
            ctx.fillText(`${CANVAS_TRANSLATIONS[lang].locked} (${lockedObjectiveText})`, gate.x + gate.width / 2, gate.y + gate.height / 2 + 4);
          }
        }
      }

      // Draw Top Mission Guide Panel on Canvas
      if (!gate.isDiscovered) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(WIDTH / 2 - 380, 15, 760, 48, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          isLocalDuel
            ? (lang === 'en' ? '⚔️ Local Duel: restore more canvas, trap your rival, 90 seconds!' : '⚔️ 本地双人：复苏更多画布，围困对手，90秒结算！')
            : (isRestorationLevel ? CANVAS_TRANSLATIONS[lang].exploreGuideRestore : CANVAS_TRANSLATIONS[lang].exploreGuide),
          WIDTH / 2,
          15 + 48 / 2
        );
        ctx.restore();
      } else if (!gate.isOpen) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(WIDTH / 2 - 380, 15, 760, 48, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isRestorationLevel ? restorationStatusText : CANVAS_TRANSLATIONS[lang].orbsGoalReached, WIDTH / 2, 15 + 48 / 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 83, 45, 0.95)';
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(WIDTH / 2 - 380, 15, 760, 48, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CANVAS_TRANSLATIONS[lang].escapedOpen, WIDTH / 2, 15 + 48 / 2);
        ctx.restore();
      }

      // Draw Splat Particles
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset

      // Draw Orbs
      if (!isRestorationLevel) {
        orbsRef.current.forEach(orb => {
          if (!orb.collected) {
            ctx.save();
            ctx.shadowColor = orb.color;
            ctx.shadowBlur = 12;

            // Animated pulse ring
            ctx.strokeStyle = orb.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius * orb.pulseScale * 1.3, 0, Math.PI * 2);
            ctx.stroke();

            // Central colored glass bead
            const grad = ctx.createRadialGradient(
              orb.x - orb.radius/3,
              orb.y - orb.radius/3,
              1,
              orb.x,
              orb.y,
              orb.radius
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, orb.color);
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // Draw Guards & Vision Flashlights
      guardsRef.current.forEach(guard => {
        const guardType = guard.type ?? 'inspector';
        const guardStyle: Record<GuardType, { body: string; accent: string; beam: string; label: string }> = {
          inspector: { body: '#1e293b', accent: '#eab308', beam: 'rgba(253, 224, 71, 0.35)', label: 'I' },
          sweeper: { body: '#7c2d12', accent: '#fb923c', beam: 'rgba(251, 146, 60, 0.38)', label: 'S' },
          curator: { body: '#3b0764', accent: '#f8fafc', beam: 'rgba(216, 180, 254, 0.34)', label: 'C' },
          drone: { body: '#083344', accent: '#22d3ee', beam: 'rgba(34, 211, 238, 0.28)', label: 'D' },
          sentinel: { body: '#312e81', accent: '#c084fc', beam: 'rgba(192, 132, 252, 0.34)', label: 'T' },
        };
        const style = guardStyle[guardType];

        // A. Draw Vision Cone (Flashlight Beam)
        ctx.save();
        const startAngle = guard.angle - guard.visionAngle / 2;
        const endAngle = guard.angle + guard.visionAngle / 2;

        // Flashlight beam color based on alert state
        let beamColorStart = style.beam;
        let beamColorEnd = style.beam.replace(/0\.\d+\)/, '0.0)');
        
        if (guard.state === 'suspicious') {
          beamColorStart = 'rgba(249, 115, 22, 0.5)'; // bright orange
        } else if (guard.state === 'alert') {
          // Flashing red
          const flash = Math.sin(Date.now() * 0.01) > 0;
          beamColorStart = flash ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.3)';
        }

        const beamGrad = ctx.createRadialGradient(
          guard.x, guard.y, 5,
          guard.x, guard.y, guard.visionRange
        );
        beamGrad.addColorStop(0, beamColorStart);
        beamGrad.addColorStop(0.6, beamColorStart.replace('0.35', '0.15').replace('0.5', '0.2').replace('0.7', '0.3'));
        beamGrad.addColorStop(1, beamColorEnd);

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.arc(guard.x, guard.y, guard.visionRange, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // B. Draw Guard Character with type-specific silhouettes
        ctx.save();
        ctx.translate(guard.x, guard.y);
        ctx.rotate(guard.angle);

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;

        if (guardType === 'drone') {
          ctx.fillStyle = style.body;
          ctx.beginPath();
          ctx.moveTo(0, -guard.radius);
          ctx.lineTo(guard.radius, 0);
          ctx.lineTo(0, guard.radius);
          ctx.lineTo(-guard.radius, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = style.accent;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-guard.radius - 8, -guard.radius - 8);
          ctx.lineTo(guard.radius + 8, guard.radius + 8);
          ctx.moveTo(guard.radius + 8, -guard.radius - 8);
          ctx.lineTo(-guard.radius - 8, guard.radius + 8);
          ctx.stroke();

          ctx.fillStyle = style.accent;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = style.body;
          ctx.beginPath();
          if (guardType === 'sentinel') {
            ctx.roundRect(-guard.radius, -guard.radius, guard.radius * 2, guard.radius * 2, 5);
          } else {
            ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
          }
          ctx.fill();

          ctx.fillStyle = style.accent;
          ctx.beginPath();
          ctx.arc(8, -6, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(8, -guard.radius / 2, 6, guard.radius);

          ctx.fillStyle = guardType === 'curator' ? '#581c87' : '#334155';
          ctx.beginPath();
          ctx.arc(-2, 0, guard.radius - 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#64748b';
          ctx.fillRect(6, 6, 8, 4);
          ctx.fillStyle = style.accent;
          ctx.fillRect(14, 6, 2, 4);

          if (guardType === 'sweeper') {
            ctx.strokeStyle = style.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, guard.radius + 5, -0.7, 0.7);
            ctx.stroke();
          } else if (guardType === 'curator') {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-10, 8, 14, 5);
          } else if (guardType === 'sentinel') {
            ctx.strokeStyle = style.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, -8);
            ctx.lineTo(8, 8);
            ctx.moveTo(8, -8);
            ctx.lineTo(-8, 8);
            ctx.stroke();
          }
        }

        ctx.shadowBlur = 0;
        ctx.rotate(-guard.angle);
        ctx.fillStyle = style.accent;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.label, 0, 0);

        ctx.restore();

        // C. Draw Alert Warning Icon over Guard's head if suspicious/alert
        if (guard.alertLevel > 0) {
          ctx.save();
          const alertY = guard.y - guard.radius - 18;
          
          // Small speech bubble/box
          ctx.fillStyle = guard.alertLevel > 80 ? '#ef4444' : '#f97316';
          ctx.beginPath();
          ctx.roundRect(guard.x - 16, alertY - 14, 32, 18, 4);
          ctx.fill();

          // Text '!' or '?' or '!!'
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          const txt = guard.alertLevel > 80 ? '!!' : '?';
          ctx.fillText(txt, guard.x, alertY - 1);
          
          // Little pointer under the box
          ctx.beginPath();
          ctx.moveTo(guard.x - 4, alertY + 4);
          ctx.lineTo(guard.x + 4, alertY + 4);
          ctx.lineTo(guard.x, alertY + 8);
          ctx.closePath();
          ctx.fillStyle = guard.alertLevel > 80 ? '#ef4444' : '#f97316';
          ctx.fill();

          // Radial progress ring around the box representing alert progress
          ctx.strokeStyle = guard.alertLevel > 80 ? '#ef4444' : '#fbbf24';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(guard.x, guard.y, guard.radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.alertLevel / 100));
          ctx.stroke();

          ctx.restore();
        }
      });

      if (isLocalDuel) {
        duelPlayersRef.current.forEach(duelPlayer => {
          if (duelPlayer.eliminated) {
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = duelPlayer.trailColor;
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${duelPlayer.label} ${duelPlayer.respawnTimer.toFixed(1)}s`, duelPlayer.x, duelPlayer.y - 28);
            ctx.strokeStyle = duelPlayer.trailColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(duelPlayer.x, duelPlayer.y, duelPlayer.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (duelPlayer.respawnTimer / DUEL_RESPAWN_SECONDS));
            ctx.stroke();
            ctx.restore();
            return;
          }

          ctx.save();
          ctx.translate(duelPlayer.x, duelPlayer.y);
          ctx.globalAlpha = duelPlayer.ghostTime > 0 ? 0.45 : 1;
          ctx.shadowColor = duelPlayer.trailColor;
          ctx.shadowBlur = duelPlayer.ghostTime > 0 ? 18 : 8;
          ctx.fillStyle = duelPlayer.color;
          ctx.beginPath();
          ctx.arc(0, 0, duelPlayer.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = duelPlayer.trailColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, duelPlayer.radius + 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          const lookX = duelPlayer.vx !== 0 ? Math.sign(duelPlayer.vx) * 3 : 0;
          const lookY = duelPlayer.vy !== 0 ? Math.sign(duelPlayer.vy) * 2 : -1;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-5, -2, 5, 0, Math.PI * 2);
          ctx.arc(5, -2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(-5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
          ctx.arc(5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.beginPath();
          ctx.roundRect(duelPlayer.x - 42, duelPlayer.y - duelPlayer.radius - 40, 84, 26, 4);
          ctx.fill();
          ctx.fillStyle = duelPlayer.trailColor;
          const status = duelPlayer.ghostTime > 0
            ? `${duelPlayer.label} GHOST`
            : `${duelPlayer.label} ${Math.round(duelPlayer.camouflageRate * 100)}%`;
          ctx.fillText(status, duelPlayer.x, duelPlayer.y - duelPlayer.radius - 25);
          if (duelPlayer.trappedTime > 0) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(duelPlayer.x, duelPlayer.y, duelPlayer.radius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (duelPlayer.trappedTime / DUEL_TRAP_SECONDS));
            ctx.stroke();
          }
          ctx.restore();
        });

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(WIDTH / 2 - 245, HEIGHT - 58, 490, 38, 8);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(
          duelMessage || (lang === 'en' ? 'Local Duel: restore more canvas, trap your rival, survive the guards.' : '本地双人：复苏更多画布，围困对手，躲开巡逻兵。'),
          WIDTH / 2,
          HEIGHT - 35
        );
        ctx.restore();
      } else {
      // Draw Player Character (A highly animated stickman / cute blob)
      const player = playerRef.current;
      ctx.save();
      ctx.translate(player.x, player.y);

      // Player drop shadow (dark transparent)
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;

      // Draw Body - Painted color!
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border outline so they remain subtly visible even when perfectly blended!
      // This is crucial so the player doesn't literally lose their character on screen!
      ctx.strokeStyle = player.camouflageRate > 0.9 ? 'rgba(255, 255, 255, 0.45)' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Anxious Wide Eyes that look towards movement direction!
      // If blended rate > 85% and STANDING STILL, they happily shut their eyes to hide!
      const closedEyes = player.camouflageRate > 0.85 && !player.isMoving;

      ctx.shadowBlur = 0; // turn off shadow for eyes

      if (closedEyes) {
        // Cute sleeping/hidden curved eyes '^ ^'
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        // Left eye curve
        ctx.beginPath();
        ctx.arc(-5, -2, 3, Math.PI, 0);
        ctx.stroke();
        // Right eye curve
        ctx.beginPath();
        ctx.arc(5, -2, 3, Math.PI, 0);
        ctx.stroke();
      } else {
        // Wide alert cartoon eyes!
        const lookX = player.vx !== 0 ? Math.sign(player.vx) * 3 : 0;
        const lookY = player.vy !== 0 ? Math.sign(player.vy) * 2 : -1;

        // Eye White Left
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Eye White Right
        ctx.beginPath();
        ctx.arc(5, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil Left
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(-5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil Right
        ctx.beginPath();
        ctx.arc(5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small cute chameleon/stickman hands
      ctx.fillStyle = player.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      // Draw tiny left and right hand circles hugging body
      ctx.beginPath();
      ctx.arc(-13, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(13, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Draw Helper Clones for Sunflowers Level
      if (painting.proceduralType === 'sunflowers') {
        clonesRef.current.forEach(clone => {
          ctx.save();
          ctx.translate(clone.x, clone.y);

          // Shadow
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 6;

          // Body
          ctx.fillStyle = clone.color;
          ctx.beginPath();
          ctx.arc(0, 0, clone.radius, 0, Math.PI * 2);
          ctx.fill();

          // Border outline
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, clone.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;

          // Cartoon Eyes look towards movement direction
          const lookX = clone.vx !== 0 ? Math.sign(clone.vx) * 3 : 0;
          const lookY = clone.vy !== 0 ? Math.sign(clone.vy) * 2 : -1;

          // Eye Left
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-5, -2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Eye Right
          ctx.beginPath();
          ctx.arc(5, -2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Pupil Left
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(-5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Pupil Right
          ctx.beginPath();
          ctx.arc(5 + lookX, -2 + lookY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Tiny cute hands
          ctx.fillStyle = clone.color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(-13, 6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(13, 6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw time limit countdown ring around the clone
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, clone.radius + 3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#fbc02d'; // golden color for the active helper time
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, clone.radius + 3, -Math.PI / 2, -Math.PI / 2 + (clone.timeLeft / 6.0) * Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        });
      }

      // Draw X2 Avatar Powerup for Sunflowers Level
      if (painting.proceduralType === 'sunflowers') {
        const powerup = sunflowerPowerupRef.current;
        if (powerup && powerup.active) {
          ctx.save();
          ctx.translate(powerup.x, powerup.y);

          // Pulsate scale over time
          const pulse = 1.0 + Math.sin(Date.now() * 0.007) * 0.15;
          ctx.scale(pulse, pulse);

          // Glow shadow
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 12;

          // Golden-yellow circle base
          ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.shadowBlur = 0;

          // Draw progress countdown ring around the powerup
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, powerup.radius + 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, powerup.radius + 4, -Math.PI / 2, -Math.PI / 2 + (powerup.timeLeft / 6.0) * Math.PI * 2);
          ctx.stroke();

          // Draw a small cute player-like silhouette in the center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 2, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Mini cute eyes
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(-2.5, 0, 1.2, 0, Math.PI * 2);
          ctx.arc(2.5, 0, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // X2 label overlay with robust black stroke
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3.5;
          ctx.strokeText('x2', 0, -8);
          ctx.fillText('x2', 0, -8);

          ctx.restore();
        }
      }

      // ===== UNIVERSAL POWERUP DRAWING =====
      // Draw Time Freeze Powerup
      const tfPowerup = timeFreezePowerupRef.current;
      if (tfPowerup && tfPowerup.active) {
        ctx.save();
        ctx.translate(tfPowerup.x, tfPowerup.y);

        const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.12;
        ctx.scale(pulse, pulse);

        // Blue glow for time freeze
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, tfPowerup.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Clock icon
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Clock hands
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();

        // Timer ring
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, tfPowerup.radius + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, tfPowerup.radius + 3, -Math.PI / 2, -Math.PI / 2 + (tfPowerup.timeLeft / 8.0) * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Decoy Frog Powerup
      const dfPowerup = decoyFrogPowerupRef.current;
      if (dfPowerup && dfPowerup.active) {
        ctx.save();
        ctx.translate(dfPowerup.x, dfPowerup.y);

        const pulse = 1.0 + Math.sin(Date.now() * 0.009) * 0.14;
        ctx.scale(pulse, pulse);

        // Green glow for decoy frog
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;

        ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, dfPowerup.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Frog icon
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Frog eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-3, -1, 3, 0, Math.PI * 2);
        ctx.arc(3, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.5, 0, Math.PI * 2);
        ctx.arc(3, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Timer ring
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, dfPowerup.radius + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, dfPowerup.radius + 3, -Math.PI / 2, -Math.PI / 2 + (dfPowerup.timeLeft / 8.0) * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Palette Powerup
      const palPowerup = palettePowerupRef.current;
      if (palPowerup && palPowerup.active && !hasPaletteUpgrade) {
        ctx.save();
        ctx.translate(palPowerup.x, palPowerup.y);

        const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.12;
        ctx.scale(pulse, pulse);

        // Orange glow for palette
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, palPowerup.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Palette icon - colored circles
        const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];
        colors.forEach((c, i) => {
          const angle = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
          const r = 4;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Center circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Timer ring
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, palPowerup.radius + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, palPowerup.radius + 3, -Math.PI / 2, -Math.PI / 2 + (palPowerup.timeLeft / 10.0) * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Decoy Entities
      decoyEntitiesRef.current.forEach(decoy => {
        ctx.save();
        ctx.translate(decoy.x, decoy.y);

        const pulse = 1.0 + Math.sin(decoy.pulseTime) * 0.15;
        ctx.scale(pulse, pulse);

        // Glow
        ctx.shadowColor = decoy.color;
        ctx.shadowBlur = 15;

        // Frog body
        ctx.fillStyle = decoy.color;
        ctx.beginPath();
        ctx.arc(0, 2, decoy.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5, -3, 5, 0, Math.PI * 2);
        ctx.arc(5, -3, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (look around randomly)
        const lookX = Math.sin(decoy.pulseTime * 0.7) * 2;
        const lookY = Math.cos(decoy.pulseTime * 0.5) * 2;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-5 + lookX, -3 + lookY, 2.5, 0, Math.PI * 2);
        ctx.arc(5 + lookX, -3 + lookY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Time ring
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, decoy.radius + 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, decoy.radius + 4, -Math.PI / 2, -Math.PI / 2 + (decoy.timeLeft / 5.0) * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });

      // Draw Time Freeze Indicator
      if (timeFreezeActiveRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⏱️ ${timeFreezeTimeLeftRef.current.toFixed(1)}s`, WIDTH / 2, 60);
        ctx.restore();
      }

      // UI HUD Overlay inside the canvas:
      // Real-time Camouflage Gauge directly over player's head
      if (player.isPainted) {
        ctx.save();
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        
        let textCol = '#ef4444';
        if (player.camouflageRate > 0.85) textCol = '#22c55e'; // Green
        else if (player.camouflageRate > 0.5) textCol = '#eab308'; // Orange/Yellow

        // Draw camouflage percentage background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(player.x - 45, player.y - player.radius - 38, 90, 26, 4);
        ctx.fill();

        // Camouflage Text
        ctx.fillStyle = textCol;
        const statText = player.isMoving
          ? CANVAS_TRANSLATIONS[lang].movingWarning
          : `${Math.round(player.camouflageRate * 100)}${CANVAS_TRANSLATIONS[lang].camouflageText}`;
        ctx.fillText(statText, player.x, player.y - player.radius - 27);

        // Timer Bar
        const timeLeft = player.camoTimeLeft ?? 6.0;
        const maxTime = player.camoMaxTime ?? 6.0;
        const barWidth = 70;
        const barHeight = 4;
        const fillWidth = Math.max(0, Math.min(barWidth, (timeLeft / maxTime) * barWidth));
        
        // Bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(player.x - barWidth / 2, player.y - player.radius - 20, barWidth, barHeight);

        // Bar fill (Color-coded based on remaining time: green -> orange -> red)
        let timerColor = '#4ade80'; // Green
        if (timeLeft < 2.0) timerColor = '#ef4444'; // Red
        else if (timeLeft < 4.0) timerColor = '#f97316'; // Orange
        
        ctx.fillStyle = timerColor;
        ctx.fillRect(player.x - barWidth / 2, player.y - player.radius - 20, fillWidth, barHeight);

        // Draw small numeric countdown text
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(`${timeLeft.toFixed(1)}s`, player.x, player.y - player.radius - 10);

        ctx.restore();
      } else {
        // Floating prompt to paint
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(player.x - 45, player.y - player.radius - 24, 90, 15, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CANVAS_TRANSLATIONS[lang].pressSpaceToCamo, player.x, player.y - player.radius - 13);
        ctx.restore();
      }
      }
    };

    // Main Loop caller
    const loop = () => {
      updateGame();
      render();
      if (isGameRunning.current) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [painting, isPaused, mode]);

  // Color blending helper
  const lerpColor = (a: string, b: string, amount: number): string => {
    const c1 = hexToRgb(a);
    const c2 = hexToRgb(b);
    const r = Math.round(c1.r + (c2.r - c1.r) * amount);
    const g = Math.round(c1.g + (c2.g - c1.g) * amount);
    const bColor = Math.round(c1.b + (c2.b - c1.b) * amount);
    return rgbToHex(r, g, bColor);
  };

  // Click on canvas to absorb color at coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused || !isGameRunning.current) return;
    if (isLocalDuel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Scale click to canvas coordinate resolution (800x500)
    const clickX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * HEIGHT;

    // Get color at clicked pixel
    const color = getPixelColor(Math.round(clickX), Math.round(clickY));

    // Set target color
    const player = playerRef.current;
    player.targetColor = color;
    player.isPainted = true;
    resetCamouflageTimer(player);
    setActiveColor(color);

    audio.playSplat();
    spawnSplatParticles(player.x, player.y, color);
  };

  // Quick select color from custom palette
  const handleSelectPaletteColor = (hex: string) => {
    if (isPaused || !isGameRunning.current) return;
    if (isLocalDuel) return;
    const player = playerRef.current;
    player.targetColor = hex;
    player.isPainted = true;
    resetCamouflageTimer(player);
    setActiveColor(hex);

    audio.playSplat();
    spawnSplatParticles(player.x, player.y, hex);
  };

  const displayedRestorationRate = painting.proceduralType === 'sunflowers' ? sunflowerRevealRate : maskRevealRate;
  const restorationProgressWidth = Math.min(100, (displayedRestorationRate / restorationTargetPercent) * 100);
  const duelP1Percent = (duelScores.p1 / (WIDTH * HEIGHT)) * 100;
  const duelP2Percent = (duelScores.p2 / (WIDTH * HEIGHT)) * 100;

  return (
    <div className="flex flex-col items-center w-full">
      {/* HUD status bars */}
      <div className="w-full flex flex-wrap gap-4 items-center justify-between mb-4 bg-[#151515] text-[#f2f2f2] p-4 rounded-lg border border-white/10 shadow-lg">
        {/* Camouflage meter / Duel score */}
        {isLocalDuel ? (
          <div className="flex flex-col gap-1 min-w-[260px]">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-amber-300 font-bold">P1 {duelP1Percent.toFixed(1)}%</span>
              <span className="text-white/55">{lang === 'en' ? 'LOCAL DUEL' : '本地双人'}</span>
              <span className="text-cyan-300 font-bold">P2 {duelP2Percent.toFixed(1)}%</span>
            </div>
            <div className="relative h-4 bg-black rounded overflow-hidden border border-white/10">
              <div
                className="absolute left-0 top-0 h-full bg-amber-400/80 transition-all duration-200"
                style={{ width: `${Math.min(100, duelP1Percent)}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full bg-cyan-400/80 transition-all duration-200"
                style={{ width: `${Math.min(100, duelP2Percent)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm font-mono">
                {duelTimeLeft}s · KO {duelDeaths.p1}:{duelDeaths.p2}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 tracking-wider font-serif">
              {lang === 'en' ? 'MUTATION INTEGRITY' : 'MUTATION INTEGRITY / 伪装度'}
            </span>
            <div className="relative w-32 h-4 bg-black rounded overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-150 ${
                  matchRate > 85 ? 'bg-emerald-500' : matchRate > 50 ? 'bg-[#c5a059]' : 'bg-red-500'
                }`}
                style={{ width: `${matchRate}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm font-mono">
                {matchRate}%
              </span>
            </div>
          </div>
        )}

        {/* Level Objectives: Orbs/Restoration & Exit Status */}
        <div className="flex items-center gap-5">
          {isRestorationLevel ? (
            <div className="flex items-center gap-2 min-w-[230px]">
              <span className="text-xs text-white/50 tracking-wider font-serif">
                {CANVAS_TRANSLATIONS[lang].restoration}
              </span>
              <div className="relative w-28 h-4 bg-black rounded overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-[#c5a059] transition-all duration-300"
                  style={{ width: `${restorationProgressWidth}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm font-mono">
                  {displayedRestorationRate}%/{restorationTargetPercent}%
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 tracking-wider font-serif">
                {lang === 'en' ? 'COLOR FRAGMENTS' : 'FRAGMENTS / 碎片'}
              </span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(idx => (
                  <div
                    key={idx}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      idx < orbsCollected
                        ? 'bg-[#c5a059] border-[#c5a059] text-black font-bold shadow-[0_0_8px_rgba(197,160,89,0.4)] scale-105'
                        : 'bg-black/60 border-white/10 text-white/20'
                    }`}
                  >
                    <span className="text-[10px] font-serif">{idx < orbsCollected ? '✦' : '✧'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 tracking-wider font-serif">
              {lang === 'en' ? 'EXTRACTION GATE' : 'EXTRACTION / 门状态'}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest ${
              isExitOpen ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 animate-pulse' : 'bg-black/60 text-white/30 border border-white/5'
            }`}>
              {isExitOpen
                ? (lang === 'en' ? 'OPENED' : 'OPENED / 已开启')
                : (lang === 'en' ? 'LOCKED' : 'LOCKED / 锁闭中')}
            </span>
          </div>
        </div>

        {/* Patrol Guard Alert Level (Global threat) */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 tracking-wider font-serif">
            {lang === 'en' ? 'RISK ALERT' : 'RISK ALERT / 警惕度'}
          </span>
          <div className="relative w-32 h-4 bg-black rounded overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-150 ${
                alertLevel > 75 ? 'bg-red-500 animate-pulse' : alertLevel > 35 ? 'bg-orange-500' : 'bg-[#c5a059]'
              }`}
              style={{ width: `${alertLevel}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm font-mono">
              {alertLevel}%
            </span>
          </div>
        </div>
      </div>

      {/* Special mask level explanation banner */}
      {isRestorationLevel && (
        <div className="w-full mb-4 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] px-4 py-3 rounded-lg text-xs font-mono leading-relaxed flex items-start gap-3">
          <span className="text-base flex-shrink-0">{painting.proceduralType === 'sunflowers' ? '🌻' : '🎨'}</span>
          <div>
            <strong className="block text-[#c5a059] mb-0.5 uppercase tracking-wider font-bold">
              {isLocalDuel
                ? (lang === 'en' ? 'LOCAL DUEL: RESTORE, TRAP, RESPAWN' : '【本地双人：复苏、围困、复活】')
                : painting.proceduralType === 'sunflowers'
                ? (lang === 'en' ? 'SPECIAL MASTERPIECE MECHANIC: VAN GOGH REVEAL' : '【向日葵关卡专属特殊机制：色彩复苏】')
                : (lang === 'en' ? 'SPECIAL MASTERPIECE MECHANIC: ARTWORK RESTORATION' : '【特殊机制：画作复苏】')
              }
            </strong>
            <span>
              {isLocalDuel
                ? (lang === 'en'
                  ? `P1 uses WASD + Space/F. P2 uses Arrow Keys + Enter/Right Shift. Restore more canvas in 90 seconds; enclosing a rival removes them for 2 seconds. Total restoration at ${restorationTargetPercent}% ends the duel early.`
                  : `P1 使用 WASD + 空格/F，P2 使用方向键 + Enter/右Shift。90秒内复苏更多画布；围住对手会让其消失2秒后随机复活。总复苏达到 ${restorationTargetPercent}% 会提前结算。`)
                : painting.proceduralType === 'sunflowers'
                ? (lang === 'en'
                  ? `The masterpiece starts covered in a white canvas! Move around or press Space / F (or click) to scratch it off. Reach ${restorationTargetPercent}% restoration to open the exit; restored paint also blocks guard movement.`
                  : `向日葵画作开始时被白色画布完全遮挡！移动小人或按空格键/F键（或点击画面）可以吸走白底。复苏达到 ${restorationTargetPercent}% 后出口开启；已复苏区域也会阻挡守卫移动。`)
                : (lang === 'en'
                  ? `The masterpiece starts covered in a white canvas! Restore ${restorationTargetPercent}% to open the exit. Restored paint becomes a guard barrier. Collect power-ups: ⏱️ Time Freeze, 🐸 Decoy Frog, 🎨 Palette Upgrade!`
                  : `画作开始时被白色画布完全遮挡！复苏 ${restorationTargetPercent}% 后出口开启。已复苏区域会成为守卫无法穿过的屏障。收集道具：⏱️ 时间冻结、🐸 迷惑蛙、🎨 调色盘升级！`)
              }
            </span>
          </div>
        </div>
      )}

      {/* Mask Level Real-time HUD Status */}
      {isRestorationLevel && (
        <div className="w-full mb-4 bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5">
          {/* Reveal rate */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold tracking-wider text-[#c5a059] flex items-center gap-2">
                {painting.proceduralType === 'sunflowers' ? '🌻 ' : '🎨 '}
                {lang === 'en' ? 'ARTWORK RESTORATION' : '画作复苏率'}
              </span>
              <span className="font-mono font-bold text-[#c5a059]">
                {displayedRestorationRate}% / {restorationTargetPercent}%
              </span>
            </div>
            <div className="relative w-full h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-[#c5a059] transition-all duration-300"
                style={{ width: `${restorationProgressWidth}%` }}
              />
            </div>
            <p className="text-[10px] text-white/50 italic font-sans">
              {isLocalDuel
                ? (lang === 'en'
                  ? `⚔️ Timer duel: highest owned restoration wins. Reaching ${restorationTargetPercent}% total restoration ends the duel early.`
                  : `⚔️ 双人计时赛：归属复苏更多者获胜。总复苏达到 ${restorationTargetPercent}% 会提前结算。`)
                : lang === 'en'
                ? `🎯 Restore at least ${restorationTargetPercent}% of the canvas to unlock the exit, then step through the portal!`
                : `🎯 至少复苏 ${restorationTargetPercent}% 的画布即可开启出口，然后进入传送门逃出！`}
            </p>
          </div>
        </div>
      )}

      {/* Main interactive Canvas wrapped in an Ornate Painting Frame */}
      <div className="relative bg-black p-0 border-[12px] md:border-[16px] border-[#c5a059] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all duration-300 hover:shadow-[0_0_35px_rgba(197,160,89,0.2)] w-full flex justify-center">
        {/* Corner metallic museum frames details */}
        <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#c5a059] opacity-85"></div>
        <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#c5a059] opacity-85"></div>
        <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#c5a059] opacity-85"></div>
        <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#c5a059] opacity-85"></div>

        <canvas
          id="game-canvas"
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onClick={handleCanvasClick}
          className="cursor-crosshair bg-[#0d0d0d] block max-w-full"
        />

        {/* Hidden Canvas used for exact pixel matching */}
        <canvas
          ref={offscreenCanvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="hidden"
        />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
            <h2 className="text-xl md:text-2xl font-serif italic tracking-[0.2em] mb-4 text-[#c5a059]">{CANVAS_TRANSLATIONS[lang].paused}</h2>
            <p className="text-white/50 text-xs tracking-wider mb-6">{CANVAS_TRANSLATIONS[lang].pausedTip}</p>
            <button
              onClick={() => setIsPaused(false)}
              className="px-6 py-2.5 bg-[#c5a059] hover:bg-[#d4b06d] text-black font-bold text-xs uppercase tracking-widest rounded shadow-lg transition-all flex items-center gap-2"
            >
              <Play size={14} /> {CANVAS_TRANSLATIONS[lang].resume}
            </button>
          </div>
        )}
      </div>

      {/* Palette Color Pickers below painting */}
      <div className="w-full mt-5 bg-[#151515] border border-white/10 p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg">
        {/* Curated Color Palette */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-serif italic text-[#c5a059] tracking-widest uppercase">{CANVAS_TRANSLATIONS[lang].colorSpectrum}</span>
            <span className="text-[9px] tracking-widest font-mono text-white/40 bg-black px-2 py-0.5 rounded border border-white/5">
              {CANVAS_TRANSLATIONS[lang].colorSpectrumTip}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {painting.palette.map((color, idx) => {
              const colName = lang === 'en' ? (color.nameEn || color.name) : color.name;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPaletteColor(color.hex)}
                  className="w-10 h-10 rounded border transition-all relative group hover:scale-105 active:scale-95 shadow flex items-end justify-center pb-0.5"
                  style={{
                    backgroundColor: color.hex,
                    borderColor: activeColor === color.hex ? '#c5a059' : 'rgba(255,255,255,0.15)',
                    boxShadow: activeColor === color.hex ? `0 0 12px ${color.hex}99` : 'none'
                  }}
                  title={colName}
                >
                  <div className="absolute inset-0 bg-black/10 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[8px] font-mono text-white mix-blend-difference bg-black/60 px-1 rounded truncate max-w-[90%]">
                    {colName}
                  </span>
                  {activeColor === color.hex && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c5a059] text-black rounded-full border border-white flex items-center justify-center font-bold text-[8px] shadow">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Ink status & Control Actions */}
        <div className="flex items-center gap-4 flex-shrink-0 self-stretch md:self-auto justify-between md:justify-end w-full md:w-auto border-t border-white/5 md:border-0 pt-4 md:pt-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 font-serif uppercase tracking-widest">{CANVAS_TRANSLATIONS[lang].activeColor}</span>
            <div className="flex items-center gap-2.5 bg-black/50 p-2 pr-4 rounded border border-white/5">
              <div
                className="w-8 h-8 rounded border border-white/10 shadow-inner"
                style={{ backgroundColor: activeColor }}
              />
              <span className="text-xs font-mono font-bold text-white tracking-wider">{activeColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-3 bg-black/40 hover:bg-black/80 text-white/80 hover:text-white rounded border border-white/10 transition-all"
              title={isPaused ? CANVAS_TRANSLATIONS[lang].controlsResume : CANVAS_TRANSLATIONS[lang].controlsPause}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>

            <button
              onClick={onToggleMute}
              className="p-3 bg-black/40 hover:bg-black/80 text-white/80 hover:text-white rounded border border-white/10 transition-all"
              title={isMuted ? CANVAS_TRANSLATIONS[lang].controlsUnmute : CANVAS_TRANSLATIONS[lang].controlsMute}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Keyboard instructions helper */}
      <div className="w-full mt-4 px-5 py-3 bg-[#151515]/40 rounded border border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/40 font-mono gap-3">
        {isLocalDuel ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-amber-300 font-bold">P1</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">WASD</span>
              <span>{lang === 'en' ? 'move' : '移动'}</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">Space/F</span>
              <span>{lang === 'en' ? 'blend' : '吸色'}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-cyan-300 font-bold">P2</span>
              <span className="bg-black text-cyan-300 px-2 py-0.5 rounded border border-white/10">Arrow Keys</span>
              <span>{lang === 'en' ? 'move' : '移动'}</span>
              <span className="bg-black text-cyan-300 px-2 py-0.5 rounded border border-white/10">Enter / Right Shift</span>
              <span>{lang === 'en' ? 'blend' : '吸色'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">W</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">A</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">S</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">D</span>
              <span>{lang === 'en' ? 'or Arrow Keys to move player' : '或 方向键 移动小人'}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="bg-black text-[#c5a059] px-2.5 py-0.5 rounded border border-white/10">Space 键</span>
              <span>{lang === 'en' ? 'or' : '或'}</span>
              <span className="bg-black text-[#c5a059] px-2 py-0.5 rounded border border-white/10">F 键</span>
              <span>{lang === 'en' ? 'to blend into background (6s)' : '吸取背景色 (持续 6 秒)'}</span>
            </div>
          </>
        )}
        <div className="hidden lg:block text-[#c5a059]/60">
          <span>{CANVAS_TRANSLATIONS[lang].generalTip}</span>
        </div>
      </div>
    </div>
  );
};
