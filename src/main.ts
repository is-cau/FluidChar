// ╔══════════════════════════════════════════════════════╗
// ║    汉字流体 — Chinese Character Fluid Simulation      ║
// ║    万级粒子 · 旋流噪声场 · 鼠标扰动 · 诗意水墨         ║
// ╚══════════════════════════════════════════════════════╝

// ==================== 噪声系统 ====================
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbm(x: number, y: number, octaves: number = 3): number {
  let v = 0, a = 1, f = 1, mv = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * smoothNoise(x * f, y * f);
    mv += a; a *= 0.5; f *= 2.0;
  }
  return v / mv;
}

function curl(x: number, y: number, t: number): [number, number] {
  const eps = 0.005;
  const dy = (fbm(x + t, y + eps, 3) - fbm(x + t, y - eps, 3)) / (2 * eps);
  const dx = (fbm(x + eps, y + t, 3) - fbm(x - eps, y + t, 3)) / (2 * eps);
  return [dy * 2.5, -dx * 2.5];
}

// ==================== 优美的汉字集 ====================
const CHARS = [
  // 自然
  '山','水','云','风','月','星','雨','雪','天','海','河','湖','林','花','草','木','叶',
  '春','夏','秋','冬','日','夜','雷','电','霞','雾','露','霜','冰','虹','谷','峰','岚',
  '溪','泉','浪','涛','尘','光','影',
  // 情感
  '心','梦','思','念','爱','欢','喜','忧','悲','静','安','然','乐','愁','魂','灵','孤',
  '独','寂','忆','恋','愿','祈','慕','痴','醉',
  // 哲思
  '道','法','自','然','空','无','有','真','美','禅','玄','韵','境','意','悟','觉','缘',
  // 动作
  '飞','流','落','飘','浮','沉','游','转','旋','舞','行','来','去','归','渡','越','翔',
  // 色彩
  '红','绿','青','蓝','紫','白','黑','金','银','明','暗','清','浊','素','艳',
  // 诗意
  '江','生','若','初','见','离','别','故','乡','远','近','深','浅','朝','暮','古','今',
  '桃','柳','荷','菊','梅','兰','竹','松','鹤','凤','龙','羽','锦','绮','琼','瑶',
  // 抽象
  '永','恒','瞬','虚','实','华','寂','幽','微','极','绝','幻','逸','灵','韵',
];

// ==================== 类型 ====================
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  char: string;
  baseColor: [number, number, number]; // HSL
  size: number;
  opacity: number;
}

// ==================== 画布与状态 ====================
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let W = 0, H = 0;
let particles: Particle[] = [];
let charSprites: Map<string, HTMLCanvasElement> = new Map();
let time = 0;
let paused = false;
let mouseX = -999, mouseY = -999;
let mouseActive = false;
let mouseForce = 80;  // 鼠标扰动力度
let flowSpeed = 1.0;  // 流速倍率

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ==================== 预渲染汉字精灵 ====================
function buildCharSprites() {
  charSprites.clear();
  const fontSize = 48;
  for (const ch of CHARS) {
    const c = document.createElement('canvas');
    c.width = fontSize; c.height = fontSize;
    const cx = c.getContext('2d')!;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.font = `bold ${fontSize - 4}px "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif`;
    cx.fillStyle = '#ffffff';
    cx.fillText(ch, fontSize / 2, fontSize / 2);
    charSprites.set(ch, c);
  }
}

// ==================== 粒子初始化 ====================
function spawnParticles(count: number) {
  particles = [];
  for (let i = 0; i < count; i++) {
    const hue = 190 + Math.random() * 50; // 蓝青色系 190-240
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
      baseColor: [hue, 40 + Math.random() * 40, 50 + Math.random() * 40],
      size: 16 + Math.random() * 20,
      opacity: 0.25 + Math.random() * 0.45,
    });
  }
}

// ==================== 更新循环 ====================
function update(dt: number) {
  if (paused) return;
  time += dt * flowSpeed;

  const dtClamped = Math.min(dt, 0.05); // 防大帧跳跃

  for (const p of particles) {
    // 从旋流噪声场采样速度
    const nx = p.x / W * 4;   // 映射到噪声空间
    const ny = p.y / H * 4;
    const [cvx, cvy] = curl(nx, ny, time * 0.3);

    // 基础流速
    const baseSpeed = 0.8;
    p.vx += (cvx * baseSpeed - p.vx) * 0.03;
    p.vy += (cvy * baseSpeed - p.vy) * 0.03;

    // 鼠标扰动
    if (mouseActive) {
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = mouseForce * 3;
      if (dist < radius) {
        const strength = (1 - dist / radius);
        const angle = Math.atan2(dy, dx);
        // 漩涡效果：切向力 + 径向外推力
        const tangential = strength * mouseForce * 0.6;
        const radial = strength * mouseForce * 0.3;
        p.vx += (-Math.sin(angle) * tangential + Math.cos(angle) * radial) * 0.15;
        p.vy += (Math.cos(angle) * tangential + Math.sin(angle) * radial) * 0.15;
        // 靠近鼠标的粒子变亮
        p.opacity = Math.min(1, p.opacity + strength * 0.3);
        p.baseColor[2] = Math.min(90, p.baseColor[2] + strength * 30);
      }
    }

    // 移动
    p.x += p.vx * dtClamped * 60;
    p.y += p.vy * dtClamped * 60;

    // 边界环绕
    const margin = 60;
    if (p.x < -margin) p.x = W + margin;
    if (p.x > W + margin) p.x = -margin;
    if (p.y < -margin) p.y = H + margin;
    if (p.y > H + margin) p.y = -margin;

    // 颜色/透明度缓慢回归
    p.baseColor[2] += (55 - p.baseColor[2]) * 0.01;
    p.opacity += (0.4 - p.opacity) * 0.005;

    // 速度阻尼
    p.vx *= 0.995;
    p.vy *= 0.995;
  }
}

// ==================== 渲染 ====================
function render() {
  // 背景 — 深邃暗蓝渐变
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bgGrad.addColorStop(0, '#0d1b2a');
  bgGrad.addColorStop(0.5, '#0a1220');
  bgGrad.addColorStop(1, '#06060f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 鼠标光环
  if (mouseActive) {
    const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, mouseForce * 3);
    glow.addColorStop(0, 'rgba(180,220,255,0.08)');
    glow.addColorStop(0.3, 'rgba(100,180,255,0.04)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  // 按颜色分组渲染减少状态切换
  // 先按色相粗分组
  for (const p of particles) {
    const sprite = charSprites.get(p.char);
    if (!sprite) continue;

    const [h, s, l] = p.baseColor;
    ctx.globalAlpha = p.opacity;

    // 保存上下文做旋转变换
    const angle = Math.atan2(p.vy, p.vx) * 0.3; // 微小旋转跟随速度方向
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // 用HSL给白色字模染色
    const size = p.size;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);

    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 鼠标位置指示
  if (mouseActive) {
    ctx.strokeStyle = 'rgba(180,220,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, mouseForce * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(180,220,255,0.1)';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, mouseForce * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ==================== 使用 Canvas filter 给文字染色 ====================
// 上方的 render 中直接 drawImage 只能画白色文字。
// 需要先创建染色版本的精灵，或者用 globalCompositeOperation。
// 这里优化：预创建多个色系的染色精灵。

// 改用更高效的染色方式：通过临时canvas染色
const tintCache = new Map<string, HTMLCanvasElement>();

function getTintedSprite(char: string, hue: number, sat: number, light: number): HTMLCanvasElement {
  const key = `${char}_${Math.floor(hue / 10)}_${Math.floor(light / 15)}`;
  const cached = tintCache.get(key);
  if (cached) return cached;

  const src = charSprites.get(char);
  if (!src) return document.createElement('canvas');

  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const cx = c.getContext('2d')!;

  // 先画文字
  cx.drawImage(src, 0, 0);

  // 用 globalCompositeOperation 染色
  cx.globalCompositeOperation = 'source-atop';
  const color = `hsl(${hue}, ${sat}%, ${light}%)`;
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);

  // 限制缓存大小
  if (tintCache.size > 300) {
    const first = tintCache.keys().next().value;
    if (first) tintCache.delete(first);
  }

  tintCache.set(key, c);
  return c;
}

// ==================== 重写渲染函数(优化版) ====================
function renderOptimized() {
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bgGrad.addColorStop(0, '#0d1b2a');
  bgGrad.addColorStop(0.5, '#0a1220');
  bgGrad.addColorStop(1, '#06060f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 鼠标光晕
  if (mouseActive) {
    const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, mouseForce * 3.5);
    glow.addColorStop(0, 'rgba(200,230,255,0.1)');
    glow.addColorStop(0.3, 'rgba(120,190,255,0.05)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  // 绘制粒子
  for (const p of particles) {
    const [h, s, l] = p.baseColor;
    const tinted = getTintedSprite(p.char, h, s, l);
    ctx.globalAlpha = p.opacity;

    const angle = Math.atan2(p.vy, p.vx) * 0.25;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.drawImage(tinted, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 鼠标圈
  if (mouseActive) {
    ctx.strokeStyle = 'rgba(180,220,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mouseX, mouseY, mouseForce * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,220,255,0.08)';
    ctx.beginPath(); ctx.arc(mouseX, mouseY, mouseForce * 1.2, 0, Math.PI * 2); ctx.stroke();
  }
}

// ==================== 事件 ====================
window.addEventListener('resize', () => {
  resize();
  tintCache.clear();
  spawnParticles(8000);
});

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  mouseActive = true;
});

window.addEventListener('mouseleave', () => {
  mouseActive = false;
});

window.addEventListener('wheel', (e) => {
  e.preventDefault();
  mouseForce = Math.max(20, Math.min(200, mouseForce - e.deltaY * 0.1));
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  if (e.key === 'r') { flowSpeed = 1.0; mouseForce = 80; }
  if (e.key === 'ArrowUp') flowSpeed = Math.min(3, flowSpeed + 0.1);
  if (e.key === 'ArrowDown') flowSpeed = Math.max(0.1, flowSpeed - 0.1);
  if (e.key === 'ArrowRight') mouseForce = Math.min(200, mouseForce + 10);
  if (e.key === 'ArrowLeft') mouseForce = Math.max(20, mouseForce - 10);
});

// ==================== 主循环 ====================
let lastTime = performance.now();

function loop(now: number) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt);
  renderOptimized();

  requestAnimationFrame(loop);
}

// ==================== 启动 ====================
resize();
buildCharSprites();
spawnParticles(8000);
requestAnimationFrame(loop);

console.log('🌊 汉字流体已就绪 — 8000 个汉字粒子');
console.log('🖱️  移动鼠标扰动 | 滚轮调力度 | 空格暂停 | 方向键调速');
