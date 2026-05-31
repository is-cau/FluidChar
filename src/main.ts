// ╔══════════════════════════════════════════════════════╗
// ║    流体粒子 — Fluid Particle Simulation               ║
// ║    万级粒子 · 旋流噪声场 · 鼠标漩涡 · 流光溢彩          ║
// ╚══════════════════════════════════════════════════════╝

// ==================== 噪声 ====================
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
  return n00 + (n10 - n00) * sx + (n01 + (n11 - n01) * sx - (n00 + (n10 - n00) * sx)) * sy;
}

function fbm(x: number, y: number, o: number = 3): number {
  let v = 0, a = 1, f = 1, m = 0;
  for (let i = 0; i < o; i++) { v += a * smoothNoise(x * f, y * f); m += a; a *= 0.5; f *= 2.0; }
  return v / m;
}

function curl(x: number, y: number, t: number): [number, number] {
  const e = 0.005;
  const dy = (fbm(x + t, y + e, 3) - fbm(x + t, y - e, 3)) / (2 * e);
  const dx = (fbm(x + e, y + t, 3) - fbm(x - e, y + t, 3)) / (2 * e);
  return [dy * 2.5, -dx * 2.5];
}

// ==================== 状态 ====================
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let W = 0, H = 0;

interface Particle { x: number; y: number; vx: number; vy: number; hue: number; size: number; alpha: number; }
let particles: Particle[] = [];
let time = 0, paused = false;
let mouseX = -999, mouseY = -999, mouseActive = false;
let mouseForce = 80, flowSpeed = 1.0;

// 配色方案 — 可切换
const palettes = [
  { name: '海洋', hues: [190, 220], s: [50, 80], l: [55, 80] },   // 蓝青
  { name: '极光', hues: [160, 280], s: [60, 90], l: [50, 80] },   // 绿紫
  { name: '火焰', hues: [10, 50], s: [70, 100], l: [55, 85] },    // 红橙
  { name: '银河', hues: [220, 290], s: [40, 80], l: [60, 90] },   // 蓝紫
];
let paletteIdx = 0;

// ==================== 粒子 ====================
function spawn(count: number) {
  particles = [];
  const p = palettes[paletteIdx];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: 0, vy: 0,
      hue: p.hues[0] + Math.random() * (p.hues[1] - p.hues[0]),
      size: 1.5 + Math.random() * 3.5,
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
}

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  spawn(12000);
}

// ==================== 更新 ====================
function update(dt: number) {
  if (paused) return;
  time += dt * flowSpeed;
  const dc = Math.min(dt, 0.05);

  for (const p of particles) {
    const nx = p.x / W * 4, ny = p.y / H * 4;
    const [cvx, cvy] = curl(nx, ny, time * 0.3);

    p.vx += (cvx * 0.8 - p.vx) * 0.03;
    p.vy += (cvy * 0.8 - p.vy) * 0.03;

    if (mouseActive) {
      const dx = p.x - mouseX, dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const R = mouseForce * 3;
      if (dist < R) {
        const s = (1 - dist / R);
        const a = Math.atan2(dy, dx);
        p.vx += (-Math.sin(a) * s * mouseForce * 0.6 + Math.cos(a) * s * mouseForce * 0.3) * 0.15;
        p.vy += (Math.cos(a) * s * mouseForce * 0.6 + Math.sin(a) * s * mouseForce * 0.3) * 0.15;
        p.alpha = Math.min(0.95, p.alpha + s * 0.3);
        p.size = Math.min(6, p.size + s * 0.3);
      }
    }

    p.x += p.vx * dc * 60;
    p.y += p.vy * dc * 60;

    const m = 60;
    if (p.x < -m) p.x = W + m; if (p.x > W + m) p.x = -m;
    if (p.y < -m) p.y = H + m; if (p.y > H + m) p.y = -m;

    p.vx *= 0.995; p.vy *= 0.995;
    p.alpha += (0.45 - p.alpha) * 0.008;
    p.size += ((1.5 + Math.random() * 0.5) - p.size) * 0.005;
  }
}

// ==================== 渲染 ====================
function render() {
  // 暗色渐变背景
  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  grad.addColorStop(0, '#0d1020');
  grad.addColorStop(0.5, '#080b18');
  grad.addColorStop(1, '#030510');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 鼠标光晕
  if (mouseActive) {
    const g = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, mouseForce * 3.5);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // 粒子 — 带微光晕的小圆点
  for (const p of particles) {
    const hsl = `hsl(${p.hue}, 70%, ${55 + p.alpha * 30}%)`;
    ctx.fillStyle = hsl;
    ctx.globalAlpha = p.alpha;

    // 内层亮核
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    // 外层微光晕
    ctx.fillStyle = hsl;
    ctx.globalAlpha = p.alpha * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 鼠标圈指示
  if (mouseActive) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mouseX, mouseY, mouseForce * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.arc(mouseX, mouseY, mouseForce * 1.2, 0, Math.PI * 2); ctx.stroke();
  }

  // 配色名称 & 提示
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${palettes[paletteIdx].name}配色 · ${particles.length}粒子 · 滚轮调力度 · 数字键切换配色 · 空格暂停`, 16, H - 16);
}

// ==================== 事件 ====================
window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; mouseActive = true; });
window.addEventListener('mouseleave', () => { mouseActive = false; });
window.addEventListener('wheel', (e) => { e.preventDefault(); mouseForce = Math.max(15, Math.min(250, mouseForce - e.deltaY * 0.1)); });
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  if (e.key === 'r') { flowSpeed = 1.0; mouseForce = 80; }
  if (e.key === 'ArrowUp') flowSpeed = Math.min(3, flowSpeed + 0.1);
  if (e.key === 'ArrowDown') flowSpeed = Math.max(0.1, flowSpeed - 0.1);
  if (e.key === 'ArrowRight') mouseForce = Math.min(250, mouseForce + 10);
  if (e.key === 'ArrowLeft') mouseForce = Math.max(15, mouseForce - 10);
  if (e.key >= '1' && e.key <= '4') { paletteIdx = parseInt(e.key) - 1; spawn(particles.length); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});

// ==================== 主循环 ====================
let last = performance.now();
function loop(now: number) { update((now - last) / 1000); last = now; render(); requestAnimationFrame(loop); }

resize();
requestAnimationFrame(loop);

console.log('🌊 流体粒子已就绪 —', particles.length, '粒子');
