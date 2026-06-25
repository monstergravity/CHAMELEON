/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Player, Guard, ColorOrb, ExitGate, PaintingData, Position } from '../types';
import { audio } from './AudioEngine';
import { RotateCcw, Play, Pause, Volume2, VolumeX, Eye, HelpCircle, Award, CheckCircle } from 'lucide-react';

interface GameCanvasProps {
  painting: PaintingData;
  onLevelCleared: () => void;
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
    exploreGuide: '🔍 探索画廊，寻找隐藏的出口门！(收集3个能量球解锁)',
    orbsGoalReached: '⚡ 已发现出口门！现在收集 3 个能量球来开启它',
    escapedOpen: '🎉 出口已解锁！快穿过传送门逃离！',
    movingWarning: '⚠️ 移动中',
    camouflageText: ' 伪装',
    pressSpaceToCamo: '按空格吸取背景色',
    fragments: 'FRAGMENTS / 碎片',
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
    exploreGuide: '🔍 Explore and find the hidden exit! (Collect 3 orbs to unlock)',
    orbsGoalReached: '⚡ Exit door discovered! Collect 3 orbs to power it up',
    escapedOpen: '🎉 Exit unlocked! Step into the portal to escape!',
    movingWarning: '⚠️ Moving',
    camouflageText: '% Camo',
    pressSpaceToCamo: 'Press Space to Blend',
    fragments: 'FRAGMENTS',
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

export const GameCanvas: React.FC<GameCanvasProps> = ({
  painting,
  onLevelCleared,
  onGameOver,
  isMuted,
  onToggleMute,
  lang = 'zh',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
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

  // Keyboard controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Elements
  const guardsRef = useRef<Guard[]>([]);
  const orbsRef = useRef<ColorOrb[]>([]);
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

  // Track if game is active
  const isGameRunning = useRef<boolean>(true);

  // Reset level state
  useEffect(() => {
    isGameRunning.current = true;
    setIsPaused(false);
    setOrbsCollected(0);
    setIsExitOpen(false);
    setIsExitDiscovered(false);
    setAlertLevel(0);

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
    orbsRef.current = orbs;

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

    guardsRef.current = guards;
    particlesRef.current = [];

    // Reset Sunflower state
    setSunflowerRevealRate(0);
    clonesRef.current = [];
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

    // Initialize reveal canvas if Sunflowers level
    if (painting.proceduralType === 'sunflowers') {
      const rCanvas = document.createElement('canvas');
      rCanvas.width = WIDTH;
      rCanvas.height = HEIGHT;
      const rCtx = rCanvas.getContext('2d');
      if (rCtx) {
        rCtx.fillStyle = '#ffffff';
        rCtx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      revealCanvasRef.current = rCanvas;
    } else {
      revealCanvasRef.current = null;
    }

    // Instantly draw our gorgeous procedural masterpiece
    drawOffscreen();

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'f'].includes(k) || e.key === ' ') {
        // Prevent browser scrolling
        if (e.key === ' ' || e.key.startsWith('Arrow')) {
          e.preventDefault();
        }
      }
      keysPressed.current[e.key.toLowerCase()] = true;

      // Quick hotkey to paint (Space or F)
      if (e.key === ' ' || k === 'f') {
        absorbColorUnderPlayer();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      isGameRunning.current = false;
    };
  }, [painting]);

  // Handle color absorption at player's current coordinate
  const absorbColorUnderPlayer = () => {
    if (isPaused || !isGameRunning.current) return;
    
    const player = playerRef.current;
    const color = getPixelColor(Math.round(player.x), Math.round(player.y));
    
    player.targetColor = color;
    player.isPainted = true;
    setActiveColor(color);

    // Play splat sound
    audio.playSplat();

    // Spawn painting splat particles
    spawnSplatParticles(player.x, player.y, color);
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

  // Helper to reveal sunflowers painting at coordinate
  const revealPaintingAt = (x: number, y: number, radius: number): number => {
    const canvas = revealCanvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    let whiteCleared = 0;
    try {
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
    } catch (e) {
      // Safe guard
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    return whiteCleared;
  };

  // Helper to get pixel color from offscreen canvas
  const getPixelColor = (x: number, y: number): string => {
    const cx = Math.max(0, Math.min(WIDTH - 1, x));
    const cy = Math.max(0, Math.min(HEIGHT - 1, y));

    // Special sunflowers mask check
    if (painting.proceduralType === 'sunflowers' && revealCanvasRef.current) {
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
    }
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
          setSunflowerRevealRate(Math.min(100, Math.round(pct)));

          // Size scaling: radius goes from 16 up to 34
          player.radius = 16 + (pct / 100) * 18;

          // Clear target check (win condition)
          if (pct >= 98) {
            isGameRunning.current = false;
            audio.playWin();
            onLevelCleared();
            return;
          }
        }
      }

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

      // 4. Update Orbs
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

      guards.forEach(guard => {
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
          guard.angle += angleDiff * 0.15;

          guard.x += Math.cos(guard.angle) * guard.speed;
          guard.y += Math.sin(guard.angle) * guard.speed;
        }

        // B. Vision Cone Detection Checks
        const dx = player.x - guard.x;
        const dy = player.y - guard.y;
        const distToPlayer = Math.hypot(dx, dy);

        let isInsideVision = false;

        if (distToPlayer < guard.visionRange) {
          // Calculate angle from guard to player
          const angleToPlayer = Math.atan2(dy, dx);
          let diffAngle = angleToPlayer - guard.angle;
          // Normalize
          diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));

          if (Math.abs(diffAngle) < guard.visionAngle / 2) {
            isInsideVision = true;
          }
        }

        // C. Alert accumulation logic
        if (isInsideVision) {
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
        // If sunflowers level, draw the reveal mask on top of the masterpiece!
        if (painting.proceduralType === 'sunflowers' && revealCanvasRef.current) {
          ctx.drawImage(revealCanvasRef.current, 0, 0);
        }
      } else {
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // Draw Exit Gate (Only if discovered!)
      const gate = exitGateRef.current;
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
            ctx.fillText(CANVAS_TRANSLATIONS[lang].collect3Orbs, gate.x + gate.width / 2, gate.y + gate.height / 2 + 18);
          } else {
            ctx.fillText(`${CANVAS_TRANSLATIONS[lang].locked} (${CANVAS_TRANSLATIONS[lang].collect3Orbs})`, gate.x + gate.width / 2, gate.y + gate.height / 2 + 4);
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
        ctx.fillText(CANVAS_TRANSLATIONS[lang].exploreGuide, WIDTH / 2, 15 + 48 / 2);
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
        ctx.fillText(CANVAS_TRANSLATIONS[lang].orbsGoalReached, WIDTH / 2, 15 + 48 / 2);
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

      // Draw Guards & Vision Flashlights
      guardsRef.current.forEach(guard => {
        // A. Draw Vision Cone (Flashlight Beam)
        ctx.save();
        const startAngle = guard.angle - guard.visionAngle / 2;
        const endAngle = guard.angle + guard.visionAngle / 2;

        // Flashlight beam color based on alert state
        let beamColorStart = 'rgba(253, 224, 71, 0.35)'; // bright yellow
        let beamColorEnd = 'rgba(253, 224, 71, 0.0)';
        
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

        // B. Draw Guard Character (Museum inspector style)
        ctx.save();
        ctx.translate(guard.x, guard.y);
        ctx.rotate(guard.angle);

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;

        // Blue Uniform coat
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
        ctx.fill();

        // Golden badge
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(8, -6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Security Cap visor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(8, -guard.radius/2, 6, guard.radius);

        // Hair / Head
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-2, 0, guard.radius - 4, 0, Math.PI * 2);
        ctx.fill();

        // Flashlight instrument hand held
        ctx.fillStyle = '#64748b';
        ctx.fillRect(6, 6, 8, 4);
        ctx.fillStyle = '#fbbf24'; // lens
        ctx.fillRect(14, 6, 2, 4);

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
  }, [painting, isPaused]);

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
    setActiveColor(color);

    audio.playSplat();
    spawnSplatParticles(player.x, player.y, color);
  };

  // Quick select color from custom palette
  const handleSelectPaletteColor = (hex: string) => {
    if (isPaused || !isGameRunning.current) return;
    const player = playerRef.current;
    player.targetColor = hex;
    player.isPainted = true;
    setActiveColor(hex);

    audio.playSplat();
    spawnSplatParticles(player.x, player.y, hex);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* HUD status bars */}
      <div className="w-full flex flex-wrap gap-4 items-center justify-between mb-4 bg-[#151515] text-[#f2f2f2] p-4 rounded-lg border border-white/10 shadow-lg">
        {/* Camouflage meter */}
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

        {/* Level Objectives: Orbs & Exit Status */}
        <div className="flex items-center gap-5">
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

      {/* Special sunflowers explanation banner */}
      {painting.proceduralType === 'sunflowers' && (
        <div className="w-full mb-4 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] px-4 py-3 rounded-lg text-xs font-mono leading-relaxed flex items-start gap-3">
          <span className="text-base flex-shrink-0">🌻</span>
          <div>
            <strong className="block text-[#c5a059] mb-0.5 uppercase tracking-wider font-bold">
              {lang === 'en' ? 'SPECIAL MASTERPIECE MECHANIC: VAN GOGH REVEAL' : '【向日葵关卡专属特殊机制：色彩复苏】'}
            </strong>
            <span>
              {lang === 'en'
                ? 'The masterpiece starts covered in a white canvas! Move around or press Space / F (or click) to absorb the white background and scratch it off to reveal Van Gogh\'s Sunflowers underneath. Stand on revealed colors and absorb them to remain invisible!'
                : '向日葵画作开始时被白色画布完全遮挡！移动小人或按空格键/F键（或点击画面）可以吸走白底并揭露出向日葵原作。站在复苏的色彩上再次吸色，即可重新隐形！'}
            </span>
          </div>
        </div>
      )}

      {/* Sunflowers Real-time HUD Status */}
      {painting.proceduralType === 'sunflowers' && (
        <div className="w-full mb-4 bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5">
          {/* Reveal rate */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold tracking-wider text-[#c5a059] flex items-center gap-2">
                🌻 {lang === 'en' ? 'REVEAL PROGRESS' : '向日葵画作复苏率'}
              </span>
              <span className="font-mono font-bold text-[#c5a059]">
                {sunflowerRevealRate}% / 98%
              </span>
            </div>
            <div className="relative w-full h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-[#c5a059] transition-all duration-300"
                style={{ width: `${(sunflowerRevealRate / 98) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-white/50 italic font-sans">
              {lang === 'en'
                ? '🎯 Reveal at least 98% of the white canvas to fully recover the masterpiece and pass!'
                : '🎯 至少复苏 98% 的画布即可唤醒整幅向日葵神作并获得胜利！'}
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
        <div className="hidden lg:block text-[#c5a059]/60">
          <span>{CANVAS_TRANSLATIONS[lang].generalTip}</span>
        </div>
      </div>
    </div>
  );
};
