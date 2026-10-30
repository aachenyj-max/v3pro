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
