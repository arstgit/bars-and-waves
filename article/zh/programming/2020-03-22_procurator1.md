# 使用 c 与 epoll 实现 socks 代理

Nodejs 版本的 socks 代理(shadowsocks) 相当吃内存. 作为最常使用的软件, 为了追求最佳效率, 我选择使用 c, 再搭配以传统经典 epoll 与 Non-blocking IO.

## 鸟瞰大局

普通的上网方式:

> browser <------> www

使用 socks 代理上网:

> browser <------> socks-local <------> socks-server <------> www

我们需要实现 socks-local 与 socks-server. 其中 browser 与 socks-local 之间使用 rfc 规定的 socks5 协议进行通信. socks-local 与 socks-server 之间的通信方式完全由我们自己掌握. 而 socks-server 与 www 之间通信方式是与普通的上网方式完全一致的.

可以看到, socks-local 与 socks-server 均承担流量转发的角色, 且它们都从左侧接受请求开始, 随后向右侧发出请求, 在左右两侧建立起了连接通道进行双向通信. 行为上有极大的相似性, 这使得 socks-local 与 socks-server 之间有大量代码可以复用. 

实际上, 在我的实现里, 它们之间仅是数十行代码, 一个函数的区别, 我把它们分别放在了单独的文件: /server.c 与 /local.c.

下面以 socks-local 为例.

## socks5 协议

[socks5 协议 rfc](https://tools.ietf.org/html/rfc1928) 内容很短, 它定义了 browser 与 socks-local 之间的通信方式. 一句话概括就是 browesr 先与 socks-local 握手, 握手成功后, browser 发送期望连接到的地址, 随后它们之间便成了普通的双向连接. 

在这里我们要认识到最核心的一点是连接的建立不是一蹴而就瞬间完成的, 需要经历三个阶段:

* 握手阶段 stage1
* 发送地址信息阶段 stage2
* 双向通道建立完成阶段 stage3.

## epoll 核心 struct evinfo

认识到在 browser 与 socks-local 之间的一条 tcp 连接有不同的 stage 以后, 作为单线程非阻塞 epoll 程序, 这就需要我们自己去记录保存每条连接的状态. 为此我们引入结构体 evinfo:

```
struct evinfo {
  int fd;
  char stage; // 0, 1, 2, 3...

  ...
}
``` 

一条连接(fd)与一个 evinfo 绑定, 并用 stage 字段区分连接的不同阶段.

socks-local 从左侧接受到来自 browser 的请求后, 针对 browser 的每条连接, 都建立一条与之对应的到达 socks-server 的右侧连接. 在这条新连接上的协议由我们自己设计. 

参照 shadowsocks 的实现, 此右侧连接首先发送 browser 期望的互联网地址, 随后就进入双向通信阶段. 极其简洁, 但是同样是有状态的, 也需要使用 stage 来区分, evinfo 再次派上用场:

> browser <------>| evinfo ------ evinfo |<------> socks-server

在 socks-local 的内部, 左右每条连接都与一个 evinfo 绑定, 每一条左侧连接都有一条右侧连接与之对应, 这里暂时只考虑成功的连接建立. 左 evinfo 与右 evinfo 之间需要进行区分和相互绑定:

```
enum evtype { IN, OUT };

struct evinfo {
  enum evtype type;
  struct evinfo *ptr;

  ...
}
```

使用字段 type 区分左右 evinfo, 使用 ptr 指针建立左右 evinfo 的相互绑定关系, 左 evinfo 总是指向右 evinfo, 右 evinfo 总是指向左 evinfo. 这样在后续连接处理以及资源销毁时, 不会出现处理一个 evinfo 时找不到另一个 evinfo 的问题. 

## NEXT

至此, 我们的 socks 代理程序的核心已完全揭露, 不过还有一些显而易见的问题需要我们去处理:

* 使用 Nonblocking IO 所必需的缓存策略
* socks-local 与 socks-server 之间通信的加解密
* 针对 socks-local 与 socks-server 之间的连接握手冗余, 使用连接池进行优化.
* 连接超时
* 资源销毁

在处理这些问题时, 我们都离不开程序的核心 evinfo.

### 链接:

本文源码: [https://github.com/derekchuank/procurator](https://github.com/derekchuank/procurator)

Nodejs 版本: [https://github.com/derekchuank/shadowsocks-lite](https://github.com/derekchuank/shadowsocks-lite)
