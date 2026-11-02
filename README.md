# V3 整机交互 Demo — Vercel 版

这是从 ChatGPT Sites 版本独立出来的标准 Next.js 工程，可直接部署到 Vercel。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 部署到 Vercel

1. 将本目录上传到一个 GitHub 仓库。
2. 在 Vercel 选择 **Add New → Project**。
3. 导入该仓库；Framework Preset 会自动识别为 **Next.js**。
4. 不需要添加环境变量，直接选择 **Deploy**。

## 后续调整

- `app/v3-config.ts`：长按、待机、档位和菜单参数。
- `app/v3-demo.tsx`：页面状态和交互流程。
- `app/globals.css`：整机布局和视觉样式。
- `public/assets/`：全部美术素材。

方案二可继续在相同工程中接入。

## 第一版更新交互

- 圆盘滚轮：一级页首次滚动进入双侧吸力页，随后向下增加、向上减少；左右保留各自原值，单次增档最多 3 档，短按确认或静默 5 秒返回。
- 模式键及右下角 App 韵律按钮立即开始对应吸奶。
- 圆盘短按开始、暂停、继续或确认；漏气排查短按前进，最后一步短按恢复；长按 2 秒结束并关机。
- 关机时短按圆盘点亮开机提示页，仍需长按圆盘 2 秒真正开机；提示页亮起后可短按夜灯键进入亮度页。
- 夜灯占位键：短按开启，长按 2 秒经独立进度页关闭；吸奶中显示 Light on/off 3 秒，非吸奶时显示亮度页，关闭后显示 Off / Brightness。
- 夜灯支持 Auto、L0–L3，L0 关闭，记住上次非零亮度。
- 首次开机选择 Minimal / IP，浏览器记住选择；右下角可重新打开皮肤选择。
- 最终夜灯素材放入 `public/assets/`，将 `app/v3-config.ts` 的 `nightKeyAsset` 设为素材路径即可替换占位键，位置及事件均已预留。
