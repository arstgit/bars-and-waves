# docker 常用操作

docker 已是软件开发过程中的常用工具, 其中有一些操作每天都会使用到.

### 安装

在 debian 下执行:

```
  $ apt install docker.io docker-compose
```

测试安装完成:

```
  $ docker run hello-world
```

### 镜像

镜像拉取, 列出, 删除.

```
  $ docker pull hello-world
  $ docker image ls
  $ docker image rm [imageName]
```

在 Dockerfile 编写完成后, 将镜像打包发布到 docker hub.

```
  $ docker build -t [username]/[repository]:[tag] .
  $ docker push [username]/[repository]:[tag]
```

### 容器

运行, 进入 bash, 列出, 终止, 删除容器, 打印日志:

```
  $ docker run hello-world
  $ docker run -it ubuntu bash
  $ docker container ls --all
  $ docker container kill/stop [containID]
  $ docker container rm [containID]
  $ docker logs --tail=[num] [containID]

```

进入正在运行的容器, 打开 bash 操作:

```
  $ docker container exec -it [containerID] /bash
```

