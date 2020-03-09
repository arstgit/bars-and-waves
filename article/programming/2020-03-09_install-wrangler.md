# 解决 root 用户安装 wrangler 失败问题

在使用 npm 安装 wrangler 时出现报错: "Error: EACCES: permission denied, mkdir '/root/.wrangler'".

## 临时解决方案

把自己的 home 目录 /root/ 临时扩大权限:

```
  $ chmod 777 /root
  $ npm i -g @cloudflare/wrangler
  $ chmod 700 /root
```

## 追本溯源

在使用临时解决方法安装完成后, 目录 /root/.wrangler 详细信息如下:

```
  drwxr-xr-x  3 nobody  root 4.0K Mar  9 09:14 .wrangler
```

我的当前用户是 root, 然而创建的文件夹 user 却是 nobody, 很是奇怪.

查询 @cloudflare/wrangler 的源码, 安装命令在 package.json 内的 scripts.postinstall 中:

```
  {
    "name": "@cloudflare/wrangler",
    "version": "1.8.1",
    "description": "Wrangle your Cloudflare Workers",
    "main": "binary.js",
    "scripts": {
      "postinstall": "node ./install-wrangler.js",
      "preuninstall": "node ./uninstall-wrangler.js"
    },
  ...

```

将 @cloudflare/wrangler 的源码拷贝到本机, 不使用 npm, 而直接执行命令 `node ./install-wrangler.js` 安装, 一切顺利进行, .wrangle 的 user 属性也是 root. 问题定位到了 npm 这里. 

在 npm 源码中搜索 'nobody', 果然, 在 lib/config/defaults.js 中有命中, 看文件名就知道 nobody 是预定义的行为. 再仔细搜寻文档, 发现这样一段文字:

> If npm was invoked with root privileges, then it will change the uid to the user account or uid specified by the user config, which defaults to nobody. Set the unsafe-perm flag to run scripts with root privileges.

我们的问题也迎刃而解了.

## 完美解决方法

如文档所述, 使用 unsafe-perm 标签:

```
  $ npm i -g @cloudflare/wrangler --unsafe-perm=true
```

