import React, { useEffect, useRef } from 'react';
import { PaintingData } from '../types';

interface ProceduralArtThumbnailProps {
  type: PaintingData['proceduralType'];
  className?: string;
}

export const ProceduralArtThumbnail: React.FC<ProceduralArtThumbnailProps> = ({ type, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WIDTH = 800;
    const HEIGHT = 500;

    // Clear and scale
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width / WIDTH, canvas.height / HEIGHT);

    // Default black background fill
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

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

      // Spray details (deterministic using Math.sin/cos)
      ctx.fillStyle = '#f7f6f0';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        const randX = Math.abs(Math.sin(i * 9.8)) * 80;
        const randY = Math.abs(Math.cos(i * 3.5)) * 100;
        const randR = 3 + (Math.abs(Math.sin(i * 12.3)) * 4);
        ctx.arc(120 + randX, 140 + randY, randR, 0, Math.PI * 2);
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
          const dotAngle = j * 1.05;
          ctx.arc(f.x + (Math.sin(dotAngle) * f.r * 0.35), f.y + (Math.cos(dotAngle) * f.r * 0.35), 2, 0, Math.PI * 2);
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
          const angle = (i * Math.PI) / 4 + Math.PI / 8;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 8, 3, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        // Yellow center
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (type === 'thekiss') {
      // Warm gold background gradient
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#ebd152');
      grad.addColorStop(0.5, '#e5a93b');
      grad.addColorStop(1, '#664c12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Central gold-leaf block (the lovers)
      ctx.fillStyle = '#dfba73';
      ctx.beginPath();
      ctx.ellipse(WIDTH / 2, HEIGHT / 2 + 30, 140, 180, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.ellipse(WIDTH / 2 - 20, HEIGHT / 2 - 20, 100, 130, 0.1, 0, Math.PI * 2);
      ctx.ellipse(WIDTH / 2 + 20, HEIGHT / 2 - 10, 90, 120, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Colored mosaic tiles
      const colors = ['#f48fb1', '#26a69a', '#ef5350', '#cfd8dc', '#1a1a1a'];
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = colors[i % colors.length];
        const rx = WIDTH / 2 - 100 + Math.abs(Math.sin(i * 45)) * 200;
        const ry = HEIGHT / 2 - 80 + Math.abs(Math.cos(i * 23)) * 260;
        ctx.fillRect(rx, ry, 12, 12);
      }

      // Lovers' heads
      ctx.fillStyle = '#fce4ec';
      ctx.beginPath();
      ctx.arc(WIDTH / 2 - 35, HEIGHT / 2 - 80, 32, 0, Math.PI * 2);
      ctx.arc(WIDTH / 2 + 25, HEIGHT / 2 - 70, 28, 0, Math.PI * 2);
      ctx.fill();

      // Golden hair curls
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath();
      ctx.arc(WIDTH / 2 - 35, HEIGHT / 2 - 95, 18, 0, Math.PI * 2);
      ctx.arc(WIDTH / 2 + 25, HEIGHT / 2 - 82, 16, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'venus') {
      // Soft pastel sea green background
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#e0f2f1');
      grad.addColorStop(1, '#b2dfdb');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Sea wave lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const y = 80 + i * 50;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(WIDTH * 0.25, y - 10, WIDTH * 0.75, y + 10, WIDTH, y);
        ctx.stroke();
      }

      // Giant pink scallop shell at bottom center
      const shellX = WIDTH / 2;
      const shellY = HEIGHT - 40;
      ctx.fillStyle = '#ffcdd2';
      ctx.beginPath();
      ctx.arc(shellX, shellY, 150, Math.PI, 0);
      ctx.fill();

      // Shell ribs
      ctx.strokeStyle = '#df9b9b';
      ctx.lineWidth = 4;
      for (let i = 0; i <= 10; i++) {
        const angle = Math.PI + (i * Math.PI) / 10;
        ctx.beginPath();
        ctx.moveTo(shellX, shellY);
        ctx.lineTo(shellX + Math.cos(angle) * 150, shellY + Math.sin(angle) * 150);
        ctx.stroke();
      }

      // Scallop bottom joint
      ctx.fillStyle = '#e57373';
      ctx.fillRect(shellX - 30, shellY - 10, 60, 20);

      // Venus' golden hair swirls
      ctx.fillStyle = '#fada43';
      ctx.beginPath();
      ctx.arc(shellX, HEIGHT / 2 - 60, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(shellX - 20 + i * 10, HEIGHT / 2 - 20 + i * 20, 30 + i * 10, 0, Math.PI, false);
        ctx.stroke();
      }

      // Floating pink rose petals
      ctx.fillStyle = '#ff80ab';
      for (let i = 0; i < 15; i++) {
        const px = 50 + Math.abs(Math.sin(i * 12.3)) * (WIDTH - 100);
        const py = 50 + Math.abs(Math.cos(i * 7.4)) * (HEIGHT - 150);
        ctx.beginPath();
        ctx.ellipse(px, py, 10, 6, Math.PI / 4 + i, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (type === 'liberty') {
      // Dark dramatic smoky sky
      const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      grad.addColorStop(0, '#1a202c');
      grad.addColorStop(0.6, '#4a3f35');
      grad.addColorStop(1, '#110d0c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Giant Tricolor French Flag
      ctx.save();
      ctx.translate(WIDTH / 2, 140);
      ctx.rotate(-0.25);
      
      // Blue, white, red bands
      ctx.fillStyle = '#0f4c81'; // Blue
      ctx.fillRect(-90, -60, 60, 100);
      ctx.fillStyle = '#f7fafc'; // White
      ctx.fillRect(-30, -60, 60, 100);
      ctx.fillStyle = '#c53030'; // Red
      ctx.fillRect(30, -60, 60, 100);

      // Flag pole
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-90, 100);
      ctx.lineTo(-90, -80);
      ctx.stroke();
      ctx.restore();

      // Smoke and dust clouds
      ctx.fillStyle = 'rgba(138, 112, 86, 0.35)';
      ctx.beginPath();
      ctx.arc(150, HEIGHT - 80, 120, 0, Math.PI * 2);
      ctx.arc(WIDTH - 150, HEIGHT - 100, 150, 0, Math.PI * 2);
      ctx.arc(WIDTH / 2, HEIGHT - 60, 100, 0, Math.PI * 2);
      ctx.fill();

      // Minimal fortress/cobblestones at bottom
      ctx.fillStyle = '#3e352d';
      ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

    } else if (type === 'persistence') {
      // Catalan golden shore desert background
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#f5d792');
      grad.addColorStop(0.4, '#e2b36e');
      grad.addColorStop(0.7, '#0f3c5f'); // blue sea
      grad.addColorStop(1, '#051b30');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Sand dunes in foreground
      ctx.fillStyle = '#d7a15c';
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT - 120);
      ctx.quadraticCurveTo(WIDTH * 0.4, HEIGHT - 180, WIDTH * 0.7, HEIGHT - 80);
      ctx.lineTo(WIDTH, HEIGHT - 100);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Distant rocky cliffs
      ctx.fillStyle = '#df8f3d';
      ctx.beginPath();
      ctx.moveTo(WIDTH * 0.7, HEIGHT - 80);
      ctx.lineTo(WIDTH * 0.85, 180);
      ctx.lineTo(WIDTH, 200);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Dead olive tree trunk and branch
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(180, HEIGHT - 100);
      ctx.lineTo(180, 150);
      ctx.lineTo(340, 150);
      ctx.stroke();

      // Melting Clock 1 (over the branch)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0288d1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(320, 190, 20, 45, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blue clock center
      ctx.fillStyle = '#b3e5fc';
      ctx.beginPath();
      ctx.ellipse(320, 190, 14, 38, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // melting clock hands
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(320, 190);
      ctx.lineTo(323, 160);
      ctx.moveTo(320, 190);
      ctx.lineTo(328, 215);
      ctx.stroke();

      // Melting Clock 2 (on a brown table/pedestal on bottom-left)
      ctx.fillStyle = '#795548';
      ctx.fillRect(0, HEIGHT - 140, 150, 140);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(80, HEIGHT - 140, 35, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (type === 'cafeterrace') {
      // Dark starry night on the right half
      ctx.fillStyle = '#0c1446';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Warm yellow cafe terrace on the left half
      const cafeGrad = ctx.createLinearGradient(0, 0, WIDTH * 0.6, 0);
      cafeGrad.addColorStop(0, '#ffeb3b');
      cafeGrad.addColorStop(0.7, '#ff9800');
      cafeGrad.addColorStop(1, '#0c1446');
      ctx.fillStyle = cafeGrad;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.65, 0);
      ctx.lineTo(WIDTH * 0.45, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Big starry night yellow stars
      const stars = [
        { x: WIDTH * 0.72, y: 80, r: 18 },
        { x: WIDTH * 0.88, y: 120, r: 24 },
        { x: WIDTH * 0.78, y: 220, r: 15 },
        { x: WIDTH * 0.92, y: 280, r: 18 },
      ];
      stars.forEach(s => {
        ctx.fillStyle = 'rgba(254, 218, 67, 0.3)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fada43';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cobblestone pavement at the bottom (Teal)
      ctx.fillStyle = '#00796b';
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT - 100);
      ctx.lineTo(WIDTH * 0.5, HEIGHT - 140);
      ctx.lineTo(WIDTH * 0.4, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Cafe tables and chairs silhouettes
      ctx.fillStyle = '#bf360c';
      ctx.beginPath();
      // Table 1
      ctx.arc(120, HEIGHT - 180, 25, 0, Math.PI, true);
      ctx.fill();
      ctx.fillRect(115, HEIGHT - 180, 10, 45);
      // Table 2
      ctx.beginPath();
      ctx.arc(240, HEIGHT - 200, 22, 0, Math.PI, true);
      ctx.fill();
      ctx.fillRect(236, HEIGHT - 200, 8, 40);
    } else if (type === 'earthlydelights') {
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#16051f');
      grad.addColorStop(0.5, '#0f2f35');
      grad.addColorStop(1, '#f472b6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = 'rgba(20, 184, 166, 0.75)';
      ctx.beginPath();
      ctx.ellipse(WIDTH * 0.48, HEIGHT * 0.64, 260, 80, -0.08, 0, Math.PI * 2);
      ctx.fill();

      const fruit = [
        [160, 120, 42, '#f472b6'], [340, 95, 58, '#fff7ed'],
        [510, 155, 38, '#a3e635'], [650, 105, 50, '#fb7185'],
      ];
      fruit.forEach(([x, y, r, color]) => {
        ctx.fillStyle = `${color}`;
        ctx.beginPath();
        ctx.arc(Number(x), Number(y), Number(r), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 5;
        ctx.stroke();
      });

      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 5;
      for (let i = 0; i < 9; i++) {
        const x = 80 + i * 80;
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT - 80);
        ctx.bezierCurveTo(x + 20, 330, x - 35, 230, x + 45, 170);
        ctx.stroke();
      }
    } else if (type === 'temeraire') {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, '#1d4ed8');
      sky.addColorStop(0.45, '#fb7185');
      sky.addColorStop(0.8, '#f59e0b');
      sky.addColorStop(1, '#111827');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.beginPath();
      ctx.arc(WIDTH * 0.76, HEIGHT * 0.35, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(120, 305);
      ctx.lineTo(520, 270);
      ctx.lineTo(455, 345);
      ctx.lineTo(170, 365);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(210 + i * 70, 280);
        ctx.lineTo(225 + i * 70, 115);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(229, 231, 235, 0.35)';
      for (let y = 360; y < HEIGHT; y += 28) {
        ctx.fillRect(0, y, WIDTH, 8);
      }
    } else if (type === 'grandjatte') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const dotColors = ['#38bdf8', '#22c55e', '#ef4444', '#fde68a', '#f8fafc'];
      for (let y = 22; y < HEIGHT; y += 22) {
        for (let x = 18; x < WIDTH; x += 24) {
          const idx = Math.floor((x * 3 + y * 5) / 22) % dotColors.length;
          ctx.fillStyle = dotColors[idx];
          ctx.globalAlpha = 0.45 + ((x + y) % 50) / 120;
          ctx.beginPath();
          ctx.arc(x, y, 4 + ((x + y) % 5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#111827';
      [180, 410, 620].forEach((x, i) => {
        ctx.beginPath();
        ctx.arc(x, 290 - i * 15, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 11, 315 - i * 15, 22, 120);
      });

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(80, 420);
      ctx.bezierCurveTo(250, 345, 460, 455, 720, 380);
      ctx.stroke();
    } else if (type === 'composition8') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 6;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(60 + i * 70, 40 + (i % 3) * 30);
        ctx.lineTo(10 + i * 65, HEIGHT - 40 - (i % 4) * 28);
        ctx.stroke();
      }

      const shapes = [
        [170, 150, 70, '#ef4444'], [430, 105, 50, '#facc15'],
        [650, 260, 80, '#2563eb'], [300, 330, 42, '#020617'],
      ];
      shapes.forEach(([x, y, r, color]) => {
        ctx.fillStyle = `${color}`;
        ctx.beginPath();
        ctx.arc(Number(x), Number(y), Number(r), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 4;
        ctx.stroke();
      });

      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.moveTo(520, 360);
      ctx.lineTo(720, 420);
      ctx.lineTo(630, 250);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'boogiewoogie') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#020617';
      for (let x = 70; x < WIDTH; x += 110) ctx.fillRect(x, 0, 14, HEIGHT);
      for (let y = 56; y < HEIGHT; y += 90) ctx.fillRect(0, y, WIDTH, 14);

      ctx.fillStyle = '#fde047';
      for (let x = 0; x < WIDTH; x += 42) {
        ctx.fillRect(x, 56, 24, 14);
        ctx.fillRect(x + 16, 326, 24, 14);
      }
      for (let y = 0; y < HEIGHT; y += 42) {
        ctx.fillRect(290, y, 14, 24);
        ctx.fillRect(620, y + 18, 14, 24);
      }

      const blocks = [
        [90, 110, '#dc2626'], [210, 220, '#2563eb'], [470, 140, '#dc2626'],
        [560, 355, '#2563eb'], [700, 235, '#fde047'], [350, 395, '#dc2626'],
      ];
      blocks.forEach(([x, y, color]) => {
        ctx.fillStyle = `${color}`;
        ctx.fillRect(Number(x), Number(y), 42, 42);
      });
    } else if (type === 'redstudio') {
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#7f1d1d');
      grad.addColorStop(0.55, '#b91c1c');
      grad.addColorStop(1, '#292524');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 5;
      const frames = [
        [95, 80, 150, 110], [310, 55, 135, 160],
        [545, 90, 170, 120], [180, 310, 180, 105],
      ];
      frames.forEach(([x, y, w, h]) => {
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.moveTo(x + 20, y + h - 25);
        ctx.lineTo(x + w * 0.5, y + 28);
        ctx.lineTo(x + w - 22, y + h - 35);
        ctx.stroke();
      });

      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(500, 430);
      ctx.lineTo(690, 365);
      ctx.lineTo(735, 450);
      ctx.stroke();

      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(575, 330, 85, 24, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={200}
      className={`w-full h-full object-cover select-none pointer-events-none ${className}`}
    />
  );
};
