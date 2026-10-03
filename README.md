# 轻拟物时钟 PWA · 纯静态版（Neumorph Clock · Static）

闹钟 / 世界时钟 / 秒表 / 计时器，全面采用「云母瓷面」轻拟物质感主题。
**零依赖、零构建**：不需要 Node.js、不需要 npm install，解压即用。

## 快速开始

### 方式一：直接打开（最简单）

双击 `index.html` 即可使用全部功能（闹钟 / 世界时钟 / 秒表 / 计时器 / 铃声 / 数据持久化）。

> 直接以 `file://` 打开时浏览器不注册 Service Worker（属正常限制），应用本体不受影响。

### 方式二：本地静态服务器（完整 PWA 体验）

任选其一，在 `index.html` 所在目录执行：

```bash
# Python（macOS / Linux 一般自带）
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code 用户：安装 Live Server 插件后右键 index.html → Open with Live Server
```

然后访问 `http://localhost:8080`。localhost 或 HTTPS 环境下会自动注册 Service Worker，
即可 **安装到主屏幕 + 离线使用**。

### 安装为应用（PWA）

- Chrome / Edge：地址栏右侧「安装」图标，或菜单 → 投放/安装 → 安装
- iOS Safari（16.4+）：分享 → 添加到主屏幕
- 安装要求页面通过 **localhost 或 HTTPS** 访问

## 功能

- ⏰ **闹钟**：时间滚轮、只响一次/每天/工作日/休息日/自定义星期、贪睡 5 分钟
- 🌍 **世界时钟**：63 座城市、时差换算（快/慢 X 小时）、搜索添加
- ⏱ **秒表**：百分秒精度、同轴进度轨道表盘、计次（分段/累计）、复位
- ⏳ **计时器**：时/分/秒循环滚轮、凹槽进度环、到点全屏响铃
- 🕐 **模拟表盘**：凹陷秒弧轨道 + 平滑扫秒（毫秒精度），多视图独立实例互不干扰
- 🔔 **铃声**：Web Audio 实时合成 5 款旋律（Light / HappyHour / AmusementPark / Flashing / Signal），支持导入自定义音频（存 IndexedDB）
- 📱 **PWA**：manifest + Service Worker 预缓存，可安装、可离线
- 🎨 **轻拟物质感主题**：瓷面底色、双色柔影、凹凸按压反馈、陶土强调色、陶瓷噪点纹理

## 目录结构

```
├── index.html              入口
├── manifest.webmanifest    PWA 清单
├── sw.js                   Service Worker（预缓存 + 缓存优先/后台更新）
├── css/
│   ├── base.css            设计令牌 + 轻拟物工具类 + 布局/导航/弹窗/开关
│   └── views.css           四个视图与滚轮/响铃层/铃声面板样式
├── js/
│   ├── utils.js            时间格式化 / 时区换算 / 重复规则 / DOM 工具
│   ├── store.js            localStorage + IndexedDB 持久化
│   ├── cities.js           63 座城市数据
│   ├── ringtones.js        Web Audio 铃声合成引擎
│   ├── components.js       模拟表盘 / 秒表盘 / 循环滚轮选择器 / 图标
│   ├── ringtone-modal.js   铃声选择底部面板
│   ├── ring-overlay.js     全屏响铃层
│   ├── views-alarm.js      闹钟视图 + 编辑器
│   ├── views-world.js      世界时钟视图 + 城市选择
│   ├── views-stopwatch.js  秒表视图
│   ├── views-timer.js      计时器视图
│   └── app.js              外壳：标签页 / 响铃调度引擎 / 通知 / PWA 注册
└── icons/                  应用图标（192 / 512 / maskable）
```

## 数据与存储

- 闹钟、城市、铃声偏好存于 **localStorage**；自定义铃声存于 **IndexedDB**
- 全部数据仅保存在本机浏览器，无任何账号系统、无网络上传
- 首次打开不预置闹钟（空白列表即开即用），城市预置纽约/伦敦/莫斯科三座

## 常见问题

- **闹钟在页面关闭后还会响吗？** 浏览器不允许网页在关闭后运行，响铃需要页面保持打开
  （可安装为 PWA 后单独窗口挂机；浏览器对后台标签页有限流，可能有秒级延迟）
- **听不到声音？** 浏览器要求先与页面交互一次才允许播放音频，点击任意位置即可
- **改了代码但没生效？** Service Worker 有缓存，强刷两次（Ctrl+Shift+R），
  或 DevTools → Application → Service Workers → Unregister 后刷新；也可把 `sw.js`
  里的 `CACHE` 版本号加一
- **部署到服务器？** 任意静态托管均可（GitHub Pages / Netlify / Nginx 等），
  线上必须 HTTPS 才能安装 PWA；如部署在子路径，无需任何修改（全部为相对路径）
