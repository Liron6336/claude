'use strict';

const T = TILE;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// ================= Предметы =================
const ORE_SHAPE = [[-0.9, -0.2], [-0.5, -0.85], [0.3, -0.9], [0.9, -0.3], [0.8, 0.5], [0.2, 0.9], [-0.6, 0.75]];

function drawItem(ctx, type, x, y, s) {
  const it = ITEMS[type];
  if (!it) return;
  const h = s / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1, s / 12);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = it.color;
  switch (it.shape) {
    case 'ore': {
      ctx.beginPath();
      ORE_SHAPE.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, px * h * 0.85, py * h * 0.85));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = type === 'coal' ? 'rgba(160,170,190,0.45)' : 'rgba(255,255,255,0.28)';
      circle(ctx, -h * 0.25, -h * 0.3, h * 0.22);
      ctx.fill();
      break;
    }
    case 'plate': {
      rr(ctx, -h * 0.85, -h * 0.6, h * 1.7, h * 1.2, h * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-h * 0.6, -h * 0.4, h * 1.2, h * 0.18);
      break;
    }
    case 'brick': {
      ctx.fillRect(-h * 0.85, -h * 0.5, h * 1.7, h);
      ctx.strokeRect(-h * 0.85, -h * 0.5, h * 1.7, h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(-h * 0.7, -h * 0.38, h * 1.4, h * 0.16);
      break;
    }
    case 'ingot': {
      ctx.beginPath();
      ctx.moveTo(-h * 0.55, -h * 0.5);
      ctx.lineTo(h * 0.55, -h * 0.5);
      ctx.lineTo(h * 0.9, h * 0.5);
      ctx.lineTo(-h * 0.9, h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-h * 0.45, -h * 0.35, h * 0.9, h * 0.16);
      break;
    }
    case 'gear': {
      ctx.beginPath();
      const n = 8;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 ? h * 0.66 : h * 0.92;
        const a1 = a - Math.PI / (n * 2) * 0.6, a2 = a + Math.PI / (n * 2) * 0.6;
        ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
        ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      circle(ctx, 0, 0, h * 0.26);
      ctx.fill();
      break;
    }
    case 'wire': {
      ctx.lineWidth = s / 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      circle(ctx, 0, 0, h * 0.6);
      ctx.stroke();
      ctx.lineWidth = s / 8;
      ctx.strokeStyle = it.color;
      circle(ctx, 0, 0, h * 0.6);
      ctx.stroke();
      ctx.strokeStyle = '#ffd48a';
      ctx.lineWidth = Math.max(1, s / 16);
      circle(ctx, 0, 0, h * 0.3);
      ctx.stroke();
      break;
    }
    case 'circuit': {
      ctx.fillStyle = '#d9b14a';
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(-h * 0.95, i * h * 0.35 - h * 0.07, h * 1.9, h * 0.14);
      }
      ctx.fillStyle = it.color;
      rr(ctx, -h * 0.7, -h * 0.7, h * 1.4, h * 1.4, h * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1b2a22';
      ctx.fillRect(-h * 0.3, -h * 0.3, h * 0.6, h * 0.6);
      break;
    }
    case 'ammo': {
      for (const oy of [-0.32, 0.32]) {
        ctx.fillStyle = it.color;
        ctx.fillRect(-h * 0.8, (oy - 0.24) * h, h * 1.0, h * 0.48);
        ctx.strokeRect(-h * 0.8, (oy - 0.24) * h, h * 1.0, h * 0.48);
        ctx.fillStyle = '#c8763a';
        ctx.beginPath();
        ctx.moveTo(h * 0.2, (oy - 0.24) * h);
        ctx.quadraticCurveTo(h * 0.95, oy * h, h * 0.2, (oy + 0.24) * h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'motor': {
      ctx.fillStyle = '#9aa5b1';
      ctx.fillRect(h * 0.45, -h * 0.15, h * 0.5, h * 0.3);
      ctx.fillStyle = it.color;
      rr(ctx, -h * 0.85, -h * 0.65, h * 1.35, h * 1.3, h * 0.25);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-h * 0.6 + (i + 1) * h * 0.38, -h * 0.5);
        ctx.lineTo(-h * 0.6 + (i + 1) * h * 0.38, h * 0.5);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

// ================= Здания =================
function metalBase(ctx, x, y, w, h, fill, edge) {
  rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(x + 4, y + 3.5, w - 8, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, y + h - 6, w - 8, 3);
}

function bolts(ctx, x, y, w, h) {
  ctx.fillStyle = '#7d8894';
  for (const [bx, by] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
    circle(ctx, bx, by, 1.8);
    ctx.fill();
  }
}

function drawGear(ctx, x, y, r, teeth, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 ? r * 0.75 : r;
    const a1 = a - Math.PI / (teeth * 2) * 0.55, a2 = a + Math.PI / (teeth * 2) * 0.55;
    ctx.lineTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
    ctx.lineTo(Math.cos(a2) * rad, Math.sin(a2) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  circle(ctx, 0, 0, r * 0.3);
  ctx.fill();
  ctx.restore();
}

function drawConveyor(ctx, b, t) {
  const x = b.x * T, y = b.y * T;
  ctx.save();
  ctx.translate(x + T / 2, y + T / 2);
  ctx.rotate(b.dir * Math.PI / 2);
  ctx.fillStyle = '#14181d';
  ctx.fillRect(-16, -12, 32, 24);
  ctx.fillStyle = '#2a3037';
  ctx.fillRect(-16, -9, 32, 18);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-16, -9, 32, 18);
  ctx.clip();
  const off = (t * CONVEYOR_SPEED * T) % 16;
  ctx.strokeStyle = '#46505b';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = -1; k < 3; k++) {
    const cx = -16 + k * 16 + off;
    ctx.moveTo(cx - 3, -5);
    ctx.lineTo(cx + 2, 0);
    ctx.lineTo(cx - 3, 5);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#5a6470';
  ctx.fillRect(-16, -12, 32, 3);
  ctx.fillRect(-16, 9, 32, 3);
  ctx.fillStyle = '#7b8692';
  ctx.fillRect(-16, -12, 32, 1);
  ctx.restore();
}

function drawConveyorItems(ctx, b) {
  const d = DIRS[b.dir];
  for (const it of b.items) {
    const px = (b.x + 0.5 + d[0] * (it.pos - 0.5)) * T;
    const py = (b.y + 0.5 + d[1] * (it.pos - 0.5)) * T;
    drawItem(ctx, it.type, px, py, 13);
  }
}

function drawDrill(ctx, b) {
  const x = b.x * T, y = b.y * T, s = b.w * T;
  metalBase(ctx, x, y, s, s, '#39414b', '#1b2026');
  ctx.save();
  rr(ctx, x + 5, y + 5, s - 10, s - 10, 4);
  ctx.clip();
  ctx.fillStyle = '#e3b341';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#1d1f22';
  for (let i = -s; i < s * 2; i += 12) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + 6, y);
    ctx.lineTo(x + i + 6 - s, y + s);
    ctx.lineTo(x + i - s, y + s);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#22272d';
  rr(ctx, x + 10, y + 10, s - 20, s - 20, 6);
  ctx.fill();
  const cx = x + s / 2, cy = y + s / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.anim || 0);
  ctx.fillStyle = '#b4bec8';
  ctx.strokeStyle = '#3a424b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.rotate(Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(17, -6);
    ctx.lineTo(16, 2);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = b.oreType ? ITEMS[b.oreType].color : '#888';
  circle(ctx, cx, cy, 6.5);
  ctx.fill();
  ctx.strokeStyle = '#1b2026';
  ctx.lineWidth = 2;
  ctx.stroke();
  bolts(ctx, x, y, s, s);
}

function drawSmelter(ctx, b, t) {
  const x = b.x * T, y = b.y * T, s = b.w * T;
  metalBase(ctx, x, y, s, s, '#4b3631', '#1e1513');
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 7; row++) {
    const yy = y + 8 + row * 8;
    ctx.beginPath();
    ctx.moveTo(x + 4, yy);
    ctx.lineTo(x + s - 4, yy);
    for (let col = 0; col < 5; col++) {
      const xx = x + 6 + col * 13 + (row % 2 ? 6 : 0);
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 8);
    }
    ctx.stroke();
  }
  // труба
  ctx.fillStyle = '#2c2422';
  ctx.fillRect(x + s - 21, y + 3, 13, 16);
  ctx.fillStyle = '#120d0c';
  ctx.fillRect(x + s - 19, y + 3, 9, 4);
  // топка
  const mx = x + s / 2, my = y + s * 0.64;
  ctx.fillStyle = '#160f0d';
  rr(ctx, mx - 17, my - 11, 34, 22, 9);
  ctx.fill();
  ctx.strokeStyle = '#6d4a3f';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (b.working) {
    const f = 0.75 + 0.25 * Math.sin(t * 19 + b.x) * Math.sin(t * 11.3 + b.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, 26);
    g.addColorStop(0, `rgba(255,190,80,${0.95 * f})`);
    g.addColorStop(0.45, `rgba(255,100,20,${0.55 * f})`);
    g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    circle(ctx, mx, my, 26);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = '#3a1d14';
    rr(ctx, mx - 11, my - 4, 22, 8, 4);
    ctx.fill();
  }
  if (b.recipe) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    circle(ctx, x + 13, y + 13, 9);
    ctx.fill();
    drawItem(ctx, recipeOutput(b.recipe), x + 13, y + 13, 13);
  }
}

const STATUS_COLOR = { work: '#3fdc7a', input: '#e3b341', output: '#e5534b' };

function drawAssembler(ctx, b, t) {
  const x = b.x * T, y = b.y * T, s = b.w * T;
  metalBase(ctx, x, y, s, s, '#2e3a46', '#131920');
  ctx.strokeStyle = 'rgba(63,184,201,0.75)';
  ctx.lineWidth = 2;
  rr(ctx, x + 6, y + 6, s - 12, s - 12, 6);
  ctx.stroke();
  const cx = x + s / 2, cy = y + s / 2;
  ctx.fillStyle = '#151b21';
  circle(ctx, cx, cy, 19);
  ctx.fill();
  drawGear(ctx, cx, cy, 17, 10, b.anim || 0, '#4c5967');
  if (b.recipe) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    circle(ctx, cx, cy, 10);
    ctx.fill();
    drawItem(ctx, recipeOutput(b.recipe), cx, cy, 15);
  }
  const col = STATUS_COLOR[b.status] || '#e3b341';
  ctx.fillStyle = col;
  circle(ctx, x + s - 11, y + 11, 3);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4);
  circle(ctx, x + s - 11, y + 11, 6);
  ctx.fill();
  ctx.restore();
  bolts(ctx, x, y, s, s);
}

function octagon(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * Math.PI / 4;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function drawCore(ctx, b, t) {
  const x = b.x * T, y = b.y * T, s = b.w * T;
  const cx = x + s / 2, cy = y + s / 2;
  octagon(ctx, cx, cy, s / 2 - 1);
  ctx.fillStyle = '#26303a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#11161b';
  ctx.stroke();
  octagon(ctx, cx, cy, s / 2 - 9);
  ctx.strokeStyle = 'rgba(65,214,195,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // вентиляция по углам
  ctx.fillStyle = '#161c22';
  for (const [vx, vy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.save();
    ctx.translate(cx + vx * 30, cy + vy * 30);
    ctx.rotate(Math.PI / 4 * vx * vy);
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = '#3a4550';
    ctx.fillRect(-6, -3, 12, 1.5);
    ctx.fillRect(-6, 0, 12, 1.5);
    ctx.fillStyle = '#161c22';
    ctx.restore();
  }
  // кристалл
  const pulse = (b.pulse || 0) * 4 + Math.sin(t * 2.5) * 1.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34 + pulse);
  g.addColorStop(0, 'rgba(95,240,220,0.7)');
  g.addColorStop(1, 'rgba(95,240,220,0)');
  ctx.fillStyle = g;
  circle(ctx, cx, cy, 34 + pulse);
  ctx.fill();
  ctx.restore();
  const r = 15 + pulse * 0.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.75, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.75, cy);
  ctx.closePath();
  const cg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  cg.addColorStop(0, '#b8fff4');
  cg.addColorStop(1, '#1fa894');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = '#0e5a50';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // излучатель пушки
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.angle || 0);
  ctx.strokeStyle = '#9aa5b1';
  ctx.lineWidth = 2;
  circle(ctx, 0, 0, 22);
  ctx.stroke();
  ctx.fillStyle = '#41d6c3';
  circle(ctx, 22, 0, 3.5);
  ctx.fill();
  if (b.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120,255,235,0.8)';
    circle(ctx, 24, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawTurret(ctx, b) {
  const x = b.x * T, y = b.y * T;
  const cx = x + T / 2, cy = y + T / 2;
  metalBase(ctx, x, y, T, T, '#363e48', '#191e24');
  ctx.fillStyle = '#242a31';
  circle(ctx, cx, cy, 12);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.angle || 0);
  ctx.fillStyle = '#aab4be';
  ctx.strokeStyle = '#1b2026';
  ctx.lineWidth = 1.5;
  ctx.fillRect(2, -3, 15, 6);
  ctx.strokeRect(2, -3, 15, 6);
  ctx.fillStyle = '#e5534b';
  circle(ctx, 0, 0, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  circle(ctx, -2, -2.5, 3);
  ctx.fill();
  if (b.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    circle(ctx, 19, 0, 5);
    ctx.fill();
  }
  ctx.restore();
  const n = b.ammo ? b.ammo.length + (b.shots > 0 ? 1 : 0) : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x + 5, y + T - 6, T - 10, 3);
  ctx.fillStyle = n ? '#ffd24a' : '#e5534b';
  ctx.fillRect(x + 5, y + T - 6, (T - 10) * (n ? Math.min(1, n / 10) : 1), 3);
}

function drawWall(ctx, b) {
  const x = b.x * T, y = b.y * T;
  ctx.fillStyle = '#7c4433';
  ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
  ctx.strokeStyle = '#3c2017';
  ctx.lineWidth = 1.5;
  for (let row = 0; row < 4; row++) {
    const yy = y + 1 + row * 7.5;
    ctx.beginPath();
    ctx.moveTo(x + 1, yy);
    ctx.lineTo(x + T - 1, yy);
    const off = row % 2 ? 8 : 0;
    for (let xx = x + 1 + off; xx < x + T - 1; xx += 15) {
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 7.5);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a140e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 2, y + 2, T - 4, 2);
}

function drawSteelWall(ctx, b) {
  const x = b.x * T, y = b.y * T;
  const g = ctx.createLinearGradient(x, y, x + T, y + T);
  g.addColorStop(0, '#7b91a6');
  g.addColorStop(1, '#45566a');
  ctx.fillStyle = g;
  rr(ctx, x + 1, y + 1, T - 2, T - 2, 3);
  ctx.fill();
  ctx.strokeStyle = '#1f2a35';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, T - 10, T - 10);
  bolts(ctx, x - 1, y - 1, T + 2, T + 2);
}

function drawSplitter(ctx, b) {
  const x = b.x * T, y = b.y * T, cx = x + T / 2, cy = y + T / 2;
  metalBase(ctx, x, y, T, T, '#342e47', '#17141f');
  ctx.fillStyle = '#a371f7';
  for (let d = 0; d < 4; d++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(d * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(9, -4);
    ctx.lineTo(9, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#1b1726';
  rr(ctx, cx - 7, cy - 7, 14, 14, 3);
  ctx.fill();
  if (b.item) drawItem(ctx, b.item, cx, cy, 11);
}

function drawStorage(ctx, b) {
  const x = b.x * T, y = b.y * T;
  ctx.fillStyle = '#7a5634';
  ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
  ctx.strokeStyle = '#3d2a19';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + T - 3, y + T - 3);
  ctx.moveTo(x + T - 3, y + 3);
  ctx.lineTo(x + 3, y + T - 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 3, y + 3, T - 6, 2);
  const f = b.total ? b.total / b.cap : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x + 5, y + T - 7, T - 10, 3);
  ctx.fillStyle = '#e3b341';
  ctx.fillRect(x + 5, y + T - 7, (T - 10) * f, 3);
}

function drawBuilding(ctx, b, t) {
  switch (b.type) {
    case 'conveyor': return drawConveyor(ctx, b, t);
    case 'drill': return drawDrill(ctx, b, t);
    case 'smelter': return drawSmelter(ctx, b, t);
    case 'assembler': return drawAssembler(ctx, b, t);
    case 'core': return drawCore(ctx, b, t);
    case 'turret': return drawTurret(ctx, b, t);
    case 'wall': return drawWall(ctx, b, t);
    case 'steel_wall': return drawSteelWall(ctx, b, t);
    case 'splitter': return drawSplitter(ctx, b, t);
    case 'storage': return drawStorage(ctx, b, t);
  }
}

function drawHp(ctx, x, y, w, frac) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = frac > 0.5 ? '#3fdc7a' : frac > 0.25 ? '#e3b341' : '#e5534b';
  ctx.fillRect(x, y, w * frac, 4);
}

// ================= Враги =================
function drawEnemy(ctx, e, t) {
  const d = e.def;
  const x = e.x * T, y = e.y * T, r = d.size * T;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 4, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(e.angle);
  ctx.translate(e.lunge * r * 0.35, 0);

  // лапки
  ctx.strokeStyle = d.dark;
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.lineCap = 'round';
  const legs = d.legs;
  for (let i = 0; i < legs; i++) {
    const lx = (i - (legs - 1) / 2) * r * 0.55;
    for (const side of [-1, 1]) {
      const sw = Math.sin(e.walk + i * 2.1 + (side > 0 ? Math.PI : 0)) * r * 0.3;
      ctx.beginPath();
      ctx.moveTo(lx, side * r * 0.35);
      ctx.lineTo(lx + sw, side * r * 0.85);
      ctx.lineTo(lx + sw * 1.4 - r * 0.1, side * r * 1.2);
      ctx.stroke();
    }
  }

  if (e.type === 'boss') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
    g.addColorStop(0, `rgba(255,80,100,${0.35 + 0.15 * Math.sin(t * 3)})`);
    g.addColorStop(1, 'rgba(255,40,80,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r * 1.5);
    ctx.fill();
    ctx.restore();
  }

  // тело
  const body = ctx.createLinearGradient(0, -r, 0, r);
  body.addColorStop(0, d.color);
  body.addColorStop(1, d.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, 0, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = d.dark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();

  if (e.type === 'tank') {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, 0, r * (0.3 + i * 0.22), r * (0.25 + i * 0.16), 0, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    }
  } else if (e.type === 'boss') {
    ctx.fillStyle = d.dark;
    for (let i = 0; i < 5; i++) {
      const sx = -r * 0.8 + i * r * 0.32;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx - r * 0.08, side * r * 0.55);
        ctx.lineTo(sx, side * r * 0.95);
        ctx.lineTo(sx + r * 0.08, side * r * 0.55);
        ctx.fill();
      }
    }
    ctx.fillStyle = `rgba(255,220,90,${0.6 + 0.3 * Math.sin(t * 5)})`;
    circle(ctx, -r * 0.2, 0, r * 0.18);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.lineTo(r * 0.45, 0);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.4, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // голова
  ctx.fillStyle = d.dark;
  circle(ctx, r * 0.72, 0, r * 0.38);
  ctx.fill();
  ctx.fillStyle = d.eye;
  circle(ctx, r * 0.88, -r * 0.15, Math.max(1.2, r * 0.09));
  ctx.fill();
  circle(ctx, r * 0.88, r * 0.15, Math.max(1.2, r * 0.09));
  ctx.fill();

  if (e.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, e.hitFlash * 8);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, 0, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (e.hp < e.maxHp) drawHp(ctx, x - r, y - r - 8, r * 2, Math.max(0, e.hp / e.maxHp));
}

// ================= Иконки для интерфейса =================
function fakeBuilding(type) {
  const s = BUILDINGS[type].size;
  return {
    type, def: BUILDINGS[type], x: 0, y: 0, w: s, h: s, dir: 0, anim: 0.4, working: false,
    recipe: type === 'smelter' ? 'iron_plate' : type === 'assembler' ? 'gear' : null,
    oreType: 'iron_ore', angle: -Math.PI / 4, ammo: [1, 1, 1, 1, 1, 1], shots: 0, items: [],
    status: 'work', total: 20, cap: 40, pulse: 0, flash: 0,
  };
}

const Icons = {
  cache: {},
  make(key, size, fn) {
    if (this.cache[key]) return this.cache[key];
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    fn(g, size);
    return (this.cache[key] = c.toDataURL());
  },
  item(type, size = 22) {
    return this.make('i:' + type + ':' + size, size, (g, s) => drawItem(g, type, s / 2, s / 2, s * 0.9));
  },
  building(type, size = 40) {
    return this.make('b:' + type + ':' + size, size, (g, s) => {
      const k = s / (BUILDINGS[type].size * T);
      g.scale(k, k);
      drawBuilding(g, fakeBuilding(type), 0.4);
    });
  },
  enemy(type, size = 22) {
    return this.make('e:' + type + ':' + size, size, (g, s) => {
      const def = ENEMIES[type];
      const k = s / (def.size * T * 2.8);
      g.translate(s / 2, s / 2);
      g.scale(k, k);
      drawEnemy(g, { type, def, x: 0, y: 0, angle: -Math.PI / 2, walk: 0, lunge: 0, hitFlash: 0, hp: 1, maxHp: 1 }, 0);
    });
  },
  demolish(size = 40) {
    return this.make('demolish:' + size, size, (g, s) => {
      g.translate(s / 2, s / 2);
      g.rotate(-Math.PI / 4);
      g.fillStyle = '#8b6a45';
      g.fillRect(-2.5, -s * 0.1, 5, s * 0.5);
      g.fillStyle = '#c9d2da';
      g.strokeStyle = '#1b2026';
      g.lineWidth = 1.5;
      rr(g, -s * 0.3, -s * 0.32, s * 0.6, s * 0.22, 3);
      g.fill();
      g.stroke();
      g.fillStyle = '#e5534b';
      g.fillRect(-s * 0.3, -s * 0.32, s * 0.12, s * 0.22);
    });
  },
};

// ================= Отрисовка мира =================
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.terrain = null;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cw = window.innerWidth;
    this.ch = window.innerHeight;
    this.canvas.width = Math.floor(this.cw * this.dpr);
    this.canvas.height = Math.floor(this.ch * this.dpr);
    this.canvas.style.width = this.cw + 'px';
    this.canvas.style.height = this.ch + 'px';
  }

  buildTerrain(world) {
    const W = world.W, H = world.H;
    const c = document.createElement('canvas');
    c.width = W * T;
    c.height = H * T;
    const g = c.getContext('2d');
    const rng = mulberry32(world.level.seed + 77);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = world.shade[y * W + x];
      g.fillStyle = `hsl(${195 + s * 25}, ${9 + s * 4}%, ${13 + s * 6}%)`;
      g.fillRect(x * T, y * T, T, T);
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
        const sz = 1 + rng() * 2.5;
        g.fillRect(x * T + rng() * T, y * T + rng() * T, sz, sz);
      }
    }
    g.strokeStyle = 'rgba(255,255,255,0.025)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x++) { g.moveTo(x * T + 0.5, 0); g.lineTo(x * T + 0.5, H * T); }
    for (let y = 0; y <= H; y++) { g.moveTo(0, y * T + 0.5); g.lineTo(W * T, y * T + 0.5); }
    g.stroke();

    // залежи
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = world.ore[y * W + x];
      if (!o) continue;
      const col = ITEMS[o].color;
      g.fillStyle = col;
      g.globalAlpha = 0.13;
      g.fillRect(x * T, y * T, T, T);
      g.globalAlpha = 1;
      const n = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const px = x * T + 5 + rng() * (T - 10), py = y * T + 5 + rng() * (T - 10);
        const s = 4 + rng() * 5;
        g.save();
        g.translate(px, py);
        g.rotate(rng() * Math.PI * 2);
        g.beginPath();
        ORE_SHAPE.forEach(([a, b], i) => (i ? g.lineTo : g.moveTo).call(g, a * s, b * s));
        g.closePath();
        g.fillStyle = col;
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = o === 'coal' ? 'rgba(170,180,200,0.35)' : 'rgba(255,255,255,0.25)';
        g.fillRect(-s * 0.3, -s * 0.4, s * 0.35, s * 0.25);
        g.restore();
      }
    }

    // скалы: тень, потом сами блоки
    const isRock = (x, y) => x < 0 || y < 0 || x >= W || y >= H || world.rock[y * W + x] === 1;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isRock(x, y) && !isRock(x, y + 1)) g.fillRect(x * T + 3, (y + 1) * T, T, 7);
      if (isRock(x, y) && !isRock(x + 1, y)) g.fillRect((x + 1) * T, y * T + 4, 5, T);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isRock(x, y)) continue;
      const s = world.shade[y * W + x];
      g.fillStyle = `hsl(${25 + s * 15}, ${8 + s * 6}%, ${24 + s * 6}%)`;
      g.fillRect(x * T, y * T, T, T);
      if (!isRock(x, y - 1)) {
        g.fillStyle = 'rgba(255,255,255,0.13)';
        g.fillRect(x * T, y * T, T, 4);
      }
      if (!isRock(x - 1, y)) {
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(x * T, y * T, 3, T);
      }
      if (!isRock(x, y + 1)) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(x * T, y * T + T - 5, T, 5);
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 1.2;
      g.beginPath();
      const ax = x * T + rng() * T, ay = y * T + rng() * T;
      g.moveTo(ax, ay);
      g.lineTo(ax + (rng() - 0.5) * 14, ay + (rng() - 0.5) * 14);
      g.stroke();
    }
    this.terrain = c;
  }

  screenToWorld(cam, sx, sy) {
    return { x: (sx - this.cw / 2) / cam.zoom + cam.x, y: (sy - this.ch / 2) / cam.zoom + cam.y };
  }

  draw(world, cam, view) {
    const ctx = this.ctx, dpr = this.dpr, z = cam.zoom;
    const t = world.time, rt = view.realTime;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080b0e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(z * dpr, 0, 0, z * dpr, (this.cw / 2 - cam.x * z) * dpr, (this.ch / 2 - cam.y * z) * dpr);

    ctx.imageSmoothingEnabled = z < 1;
    ctx.drawImage(this.terrain, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, world.W * T, world.H * T);

    const x0 = (cam.x - this.cw / 2 / z) / T - 3, x1 = (cam.x + this.cw / 2 / z) / T + 3;
    const y0 = (cam.y - this.ch / 2 / z) / T - 3, y1 = (cam.y + this.ch / 2 / z) / T + 3;
    const visible = o => o.x + (o.w || 0) >= x0 && o.x <= x1 && o.y + (o.h || 0) >= y0 && o.y <= y1;

    // логова врагов
    for (const sp of world.spawns) {
      const cx = (sp.x + 0.5) * T, cy = (sp.y + 0.5) * T;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, SPAWN_RADIUS * T);
      g.addColorStop(0, 'rgba(30,0,20,0.85)');
      g.addColorStop(0.5, 'rgba(120,10,40,0.25)');
      g.addColorStop(1, 'rgba(120,10,40,0)');
      ctx.fillStyle = g;
      circle(ctx, cx, cy, SPAWN_RADIUS * T);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rt * 0.6);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = `rgba(255,77,109,${0.45 + 0.2 * Math.sin(rt * 3)})`;
      ctx.lineWidth = 2;
      circle(ctx, 0, 0, SPAWN_RADIUS * T - 4);
      ctx.stroke();
      ctx.rotate(-rt * 1.5);
      ctx.strokeStyle = 'rgba(255,77,109,0.35)';
      circle(ctx, 0, 0, T * 0.9);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // здания: сначала ленты, потом предметы на них, потом всё остальное
    const bs = world.buildings;
    for (const b of bs) if (b.type === 'conveyor' && visible(b)) drawConveyor(ctx, b, t);
    for (const b of bs) if (b.type === 'conveyor' && visible(b)) drawConveyorItems(ctx, b);
    for (const b of bs) if (b.type !== 'conveyor' && visible(b)) drawBuilding(ctx, b, t);
    for (const b of bs) {
      if (b.hp < b.maxHp && visible(b)) drawHp(ctx, b.x * T + 4, b.y * T - 2, b.w * T - 8, b.hp / b.maxHp);
    }

    for (const e of world.enemies) if (visible(e)) drawEnemy(ctx, e, t);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of world.bullets) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.px * T, b.py * T);
      ctx.lineTo(b.x * T, b.y * T);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      circle(ctx, b.x * T, b.y * T, 5);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    for (const p of world.particles) {
      const a = p.life / p.max;
      if (p.kind === 'smoke') {
        ctx.globalAlpha = a * 0.45;
        ctx.fillStyle = p.color;
        circle(ctx, p.x * T, p.y * T, (p.size + (1 - a) * 0.35) * T);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        const s = p.size * T * (p.kind === 'goo' ? 1.6 : 1);
        ctx.fillRect(p.x * T - s / 2, p.y * T - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    this.drawOverlay(ctx, world, view, rt);
  }

  drawOverlay(ctx, world, view, rt) {
    const sel = view.selected;
    if (sel && !sel.dead) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -rt * 20;
      ctx.strokeStyle = '#41d6c3';
      ctx.lineWidth = 2;
      ctx.strokeRect(sel.x * T - 2, sel.y * T - 2, sel.w * T + 4, sel.h * T + 4);
      ctx.restore();
      if (sel.type === 'turret' || sel.type === 'core') {
        this.rangeCircle(ctx, sel.cx, sel.cy, sel.type === 'turret' ? TURRET.range : CORE_GUN.range);
      }
    }

    const h = view.hover;
    if (!h) return;
    if (view.tool === 'demolish') {
      const b = world.buildingAt(h.tx, h.ty);
      ctx.fillStyle = 'rgba(229,83,75,0.3)';
      ctx.strokeStyle = '#e5534b';
      ctx.lineWidth = 2;
      if (b && b !== world.core) {
        ctx.fillRect(b.x * T, b.y * T, b.w * T, b.h * T);
        ctx.strokeRect(b.x * T, b.y * T, b.w * T, b.h * T);
      } else {
        ctx.strokeRect(h.tx * T, h.ty * T, T, T);
      }
      return;
    }
    if (view.tool) {
      const def = BUILDINGS[view.tool];
      const s = def.size;
      const bx = view.ghost.x, by = view.ghost.y;
      const err = world.checkPlace(view.tool, bx, by);
      const afford = world.canAfford(def.cost);
      const ok = !err && afford;
      const fake = fakeBuilding(view.tool);
      fake.x = bx;
      fake.y = by;
      fake.dir = view.rot;
      fake.anim = rt * 2;
      if (view.tool === 'drill') fake.oreType = world.countOre(bx, by, s).type;
      if (view.tool === 'smelter' || view.tool === 'assembler') fake.recipe = defaultRecipe(view.tool, world.unlocks.recipes);
      fake.ammo = [];
      fake.total = 0;
      ctx.globalAlpha = 0.6;
      drawBuilding(ctx, fake, rt);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ok ? 'rgba(63,220,122,0.15)' : 'rgba(229,83,75,0.25)';
      ctx.fillRect(bx * T, by * T, s * T, s * T);
      ctx.strokeStyle = ok ? '#3fdc7a' : '#e5534b';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx * T, by * T, s * T, s * T);
      if (def.rotate) {
        const cx = (bx + 0.5) * T, cy = (by + 0.5) * T, d = DIRS[view.rot];
        ctx.fillStyle = '#ffffff';
        ctx.save();
        ctx.translate(cx + d[0] * 22, cy + d[1] * 22);
        ctx.rotate(view.rot * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -6);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if (view.tool === 'drill') {
        const o = world.countOre(bx, by, s);
        if (o.count) {
          ctx.font = 'bold 12px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          const txt = (DRILL_RATE * o.count).toFixed(2) + '/с';
          ctx.strokeText(txt, (bx + 1) * T, by * T - 6);
          ctx.fillText(txt, (bx + 1) * T, by * T - 6);
        }
      }
      if (view.tool === 'turret') this.rangeCircle(ctx, bx + 0.5, by + 0.5, TURRET.range);
    } else {
      const b = world.buildingAt(h.tx, h.ty);
      if (b && b !== sel) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x * T, b.y * T, b.w * T, b.h * T);
      }
    }
  }

  rangeCircle(ctx, x, y, r) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,210,74,0.55)';
    ctx.fillStyle = 'rgba(255,210,74,0.05)';
    ctx.lineWidth = 1.5;
    circle(ctx, x * T, y * T, r * T);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
