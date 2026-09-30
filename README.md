# Faust TRPG Craft

面向个人和小规模跑团的轻量级纯前端工具。骰子、随机表、词条、生成器、集合和历史都在浏览器里运行，数据保存在这台浏览器中，不会自动上传。

线上地址：[https://faustknowsall.cc](https://faustknowsall.cc)

## 本地开发

```bash
npm install
npm run dev
npm test
npm run build
```

开发地址是 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。

## 页面

- `/` 首页
- `/dice` 骰子
- `/tables` 随机表
- `/entries` 词条
- `/generators` 生成器
- `/collections` 集合
- `/history` 历史
- `/storage` 数据管理
- `/settings` 设置

内置内容随网站发布，只读，并且默认不显示。在设置里打开「显示内置数据」后，才能在列表和选择框里看到它们。用户自己的随机表、词条、生成器、设置和历史保存在 IndexedDB。数据管理页可以分别导出、导入和清理这两套数据。

## 发布

推送到 `main` 后，GitHub Actions 会安装依赖、执行 `npm run build`，并把 `dist` 部署到 GitHub Pages。站点使用自定义域名，Vite 的 `base` 是 `/`。

直接打开 `/dice` 这类地址时，GitHub Pages 会返回 `404.html`。构建时会把 `index.html` 复制为 `404.html`，前端路由因此仍能打开对应页面。

域名 `faustknowsall.cc` 在腾讯云解析到 GitHub Pages。apex 记录使用下面四条 A 记录，主机记录为 `@`：

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

如果还要使用 `www.faustknowsall.cc`，添加一条 CNAME，主机记录为 `www`，记录值为 `tigh0147c.github.io`。
