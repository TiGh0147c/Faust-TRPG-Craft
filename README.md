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

