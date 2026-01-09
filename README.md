# Pollinations 图片生成器

一个轻量级、基于浏览器的 AI 图片生成工作台，由 [Pollinations API](https://pollinations.ai) 提供支持。

## 功能特性

- **多种 AI 模型** - 支持 flux、turbo、z-image、gptimage、seedream 等多种模型
- **批量生成** - 一次生成 2、4、6 或 9 张图片，支持并发处理
- **可定制参数** - 控制尺寸、种子、质量、引导系数等
- **生成历史** - 自动本地保存最近 20 条生成记录
- **深色/浅色主题** - 主题切换，偏好设置持久保存
- **零依赖** - 纯 HTML、CSS 和原生 JavaScript

## 快速开始

0. 在线使用：https://polimage.enjow.com

1. 克隆仓库：
   ```bash
   git clone https://github.com/yourusername/pollinations.git
   cd pollinations
   ```

2. 在浏览器中打开 `index.html`

3. 从 [https://enter.pollinations.ai](https://enter.pollinations.ai) 获取 API 密钥(需申请**可发布密钥**（`pk_`）- 用于客户端)

4. 点击页面顶部的 API 密钥按钮，输入你的密钥

5. 输入提示词，开始生成！

## 项目结构

```
pollinations/
├── README.md            # 中文文档
├── index.html           # 界面和样式
├── app.js               # 应用逻辑
└── vercel.json          # Vercel 部署配置
```

## 生成参数

| 参数 | 说明 | 范围/选项 |
|------|------|-----------|
| 提示词 | 图片的文字描述 | 必填 |
| 负面提示词 | 图片中要避免的内容 | 可选 |
| 宽度 | 图片宽度（像素） | 0-9007199254740991 |
| 高度 | 图片高度（像素） | 0-9007199254740991 |
| 种子 | 可复现性种子（-1 为随机） | -1-2147483647 |
| 质量 | 输出质量等级 | low, medium, high, hd |
| 引导系数 | 提示词遵循程度 | 1-20 |
| 模型 | 使用的 AI 模型 | flux, turbo, z-image 等 |

### 可选增强功能

- **提示词优化** - AI 增强提示词改进
- **去除水印** - 移除输出图片的水印
- **安全模式** - 过滤不当内容
- **透明背景** - 生成带 Alpha 通道的图片

## 部署

### Vercel（推荐）

1. Fork 本仓库
2. 导入到 [Vercel](https://vercel.com)
3. 部署 - 无需额外配置

### 静态托管

将 `image-generator` 文件夹上传到任意静态托管服务（GitHub Pages、Netlify 等）即可。

## API 参考

本项目使用 Pollinations API。完整 API 文档请参阅 `api.json`（OpenAPI 3.1.0 格式）。

## 致谢

- [Pollinations.ai](https://pollinations.ai) 提供 AI 图片生成 API
