<p align="center">
  <img src="https://img.shields.io/badge/particles-12000+-blue" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" />
  <img src="https://img.shields.io/badge/Vite-6.0-purple" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

<h1 align="center">🌊 流体粒子</h1>
<p align="center"><strong>Fluid Particle Simulation</strong></p>

<p align="center">
  <a href="https://is-cau.github.io/FluidChar/">🔗 在线体验</a>
  &nbsp;·&nbsp;
  <a href="#-效果预览">📸 预览</a>
  &nbsp;·&nbsp;
  <a href="#-操作说明">🎮 操作</a>
  &nbsp;·&nbsp;
  <a href="#-技术原理">🔬 原理</a>
</p>

---

## 📸 效果预览

> 打开页面后，**12000+ 发光粒子**在旋流噪声场驱动下自然流动。移动鼠标产生漩涡扰动，粒子被卷入旋转并向外飞溅——像搅动一池发光的星尘。

四种内置配色方案，**数字键 1~4** 一键切换：

| 配色 | 色调 | 感觉 |
|------|------|------|
| 🌊 **海洋** | 蓝 · 青 | 深海暗流，静谧深邃 |
| 🌌 **极光** | 绿 · 紫 | 极光帷幕，神秘梦幻 |
| 🔥 **火焰** | 红 · 橙 | 烈焰涌动，炽热绚烂 |
| 💫 **银河** | 蓝 · 紫 | 星河流转，璀璨静谧 |

---

## 🎮 操作说明

| 按键 | 功能 |
|------|------|
| **移动鼠标** | 产生漩涡扰动力场（切向力 + 径向推力） |
| **鼠标滚轮** | 增大/减小扰动力度 |
| **空格 Space** | 暂停 / 继续 |
| **↑ / ↓** | 加速 / 减速全局流速 |
| **← / →** | 减小 / 增大扰动力度 |
| **1 2 3 4** | 切换配色方案 |
| **R** | 恢复默认参数 |

---

## 🔬 技术原理

### 旋流噪声场 (Curl Noise)

```
标量噪声场 φ(x, y) → 求旋度 → 向量场 v = (∂φ/∂y, −∂φ/∂x)
```

- 采用 **FBM (Fractal Brownian Motion)** 多层值噪声叠加
- 对噪声场求**旋度 (Curl)**，得到自动满足**无散条件 (divergence-free)** 的速度场
- 天然产生漩涡、环流等流体特征，无需额外约束

### 粒子系统

- **12000+ 粒子**，每个独立维护位置、速度、色相、尺寸、透明度
- 双层渲染：内层**亮核** + 外层**半透明光晕**，模拟辉光散射
- HSL 色彩空间动态调节，鼠标附近粒子实时变亮变大

### 鼠标交互

```
F = F_tangential + F_radial
  切向力产生漩涡  径向力向外推
```

- 力场强度随距离衰减（平滑阶跃）
- 粒子离开鼠标范围后逐渐恢复原始状态

### 渲染管线

- 径向渐变暗色背景（中心微亮 → 边缘纯黑）
- 鼠标位置叠加光晕遮罩
- 每帧遍历粒子，drawArc 绘制圆点 + 光晕
- 边界环绕（超出屏幕的粒子从对面重新进入）

---

## 🛠️ 本地运行

```bash
# 克隆
git clone https://github.com/is-cau/FluidChar.git
cd FluidChar

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 📁 项目结构

```
FluidChar/
├── index.html          # 入口页面
├── package.json        # 依赖配置
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 构建配置
└── src/
    └── main.ts         # 全部核心代码（~170行）
```

> 整个项目的核心逻辑集中在单个 TypeScript 文件中，不到 200 行代码实现了完整的流体模拟系统。

---

## 📜 技术栈

| 层 | 技术 |
|----|------|
| 语言 | TypeScript |
| 构建 | Vite |
| 渲染 | Canvas 2D API |
| 物理 | Curl Noise + FBM |
| 部署 | GitHub Pages |

---

<p align="center">
  <sub>Made with ❤️ | <a href="https://is-cau.github.io/FluidChar/">在线体验</a></sub>
</p>
