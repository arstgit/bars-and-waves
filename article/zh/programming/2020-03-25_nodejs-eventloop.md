# 旖旎 Nodejs: 深入理解 Event Loop

身为一名老 noder, 我们都知道, nodejs 程序写得好不好, 就看对 eventloop 理解得到不到位.

## cliche

* setTimeout 与 setImmediate 之间的区别
* process.nextTick 与 setImmediate 之间的区别
* 何时需要使用 process.nextTick
* promise 在 eventloop 中的定位

相信在读完本文后, 这几个经常令人困惑的问题不再让你感到疑惑.

## 单线程的 nodejs

当我们在说单线程 nodejs 时, 其实是在说我们写的 nodejs 代码的执行是单线程的. 

实际上, nodejs 程序在运行时自己维护了一个线程池. 垃圾回收任务就是在单独的线程里执行的.

## 官方指南

官方已经在[文档](https://github.com/nodejs/node/blob/v4.x/doc/topics/the-event-loop-timers-and-nexttick.md)中简要介绍了 eventloop 的执行逻辑.

       ┌───────────────────────┐
    ┌─>│        timers         │
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │     I/O callbacks     │
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │     idle, prepare     │
    │  └──────────┬────────────┘      ┌───────────────┐
    │  ┌──────────┴────────────┐      │   incoming:   │
    │  │         poll          │<─────┤  connections, │
    │  └──────────┬────────────┘      │   data, etc.  │
    │  ┌──────────┴────────────┐      └───────────────┘
    │  │        check          │
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    └──┤    close callbacks    │
       └───────────────────────┘

从整体上看:
  * 每个 phase, 比如 timer 和 I/O callbacks 等都是一个 FIFO 队列.
  * 队列中的 callback 被同步依序执行, 全部执行完毕或者达到一定限制后, 转入下一个 phase.

单独看每个 phase:
  * timer：处理由 setTimeout 和 setInterval 产生的 callbacks.
  * I/O callbacks： 执行一些系统操作产生的 callbacks, 比如 TCP errors.
  * idle, prepare：仅供內部使用.
  * poll：核心. I/O 操作完成后执行对应的 callbacks.
  * check：处理由 setImmediate 产生的 callback.
  * close callbacks：如 socket.on('close', ...).

在这里注意到 setImmediate 产生的 callbacks 属于 check phase, 而 setTimeout 的却属于 timer phase, 这是它们之间的根本区别.

指南中也对 setTimeout, setImmediate 和 process.nextTick 进行了详细的对比分析.

## eventloop 的根基 libuv

![nodejs-eventloop](/static/picture/nodejs-eventloop.png)

在源码 libuv/src/unix/core.c 中定义了函数 uv_run: 

```
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int timeout;
  int r;
  int ran_pending;

  r = uv__loop_alive(loop);
  if (!r)
    uv__update_time(loop);

  while (r != 0 && loop->stop_flag == 0) {
    uv__update_time(loop);
    uv__run_timers(loop);
    ran_pending = uv__run_pending(loop);
    uv__run_idle(loop);
    uv__run_prepare(loop);

    timeout = 0;
    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
      timeout = uv_backend_timeout(loop);

    uv__io_poll(loop, timeout);
    uv__run_check(loop);
    uv__run_closing_handles(loop);

    if (mode == UV_RUN_ONCE) {
      /* UV_RUN_ONCE implies forward progress: at least one callback must have
       * been invoked when it returns. uv__io_poll() can return without doing
       * I/O (meaning: no callbacks) when its timeout expires - which means we
       * have pending timers that satisfy the forward progress constraint.
       *
       * UV_RUN_NOWAIT makes no guarantees about progress so it's omitted from
       * the check.
       */
      uv__update_time(loop);
      uv__run_timers(loop);
    }

    r = uv__loop_alive(loop);
    if (mode == UV_RUN_ONCE || mode == UV_RUN_NOWAIT)
      break;
  }

  /* The if statement lets gcc compile it to a conditional store. Avoids
   * dirtying a cache line.
   */
  if (loop->stop_flag != 0)
    loop->stop_flag = 0;

  return r;
}
```

简单一瞟, 你可能留意到了几个关键函数调用: uv__run_timers(), uv__run_pendings(), uv__io_poll() 等. 这些调用其实就是前文所提到的 phase. 将它们一一串起来:

       ┌───────────────────────┐
    ┌─>│        timers         │ uv__run_timers()
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │     I/O callbacks     │ uv__run_pending()
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │     idle, prepare     │ uv__run_idle(), uv__run_prepare()
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │         poll          │ uv__io_poll()
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    │  │        check          │ uv__run_check()
    │  └──────────┬────────────┘
    │  ┌──────────┴────────────┐
    └──┤    close callbacks    │ uv__run_closing_handles()
       └───────────────────────┘

eventloop 的结构就清晰明了了.

## 万事俱备

浏览过 libuv 的源码, 辅以官方的指南, 再参照上图. 我们可以认识到实际的 eventloop 就是从 timer phase 起步. 但是 eventloop 是毕竟是一个环, 程序的 I/O 特性决定了 eventloop 中最重要的 phase 是 poll phase. 因此, 我们在讨论 eventloop 时总是围绕着中心 poll phase 来探讨.

所以, 我们总是这样观测 nodejs 程序: I/O 事件在 poll phase 中得到处理, 全部处理完成后进入 check phase 处理 setImmediate 传递的函数, 处理完毕后进入 timer phase 处理到期的由 setTimeout, setInterval 传递的函数, 然后再回到了 poll phase 继续循环.

同时, 官方文档也指出:

  * timer 事件的实际处理时间可能是不准确的, 因为 poll phase 中的 blocking 操作会推迟 timer phase 的到来.
  * 在 poll phase 同时调用 setImmdiate(fn) 和 setTimeout(fn, 0), setImmdiate 所传递的 callback 总是先执行, 因为 poll phase 紧随其后的就是 check phase. 如果不是在 poll phase 同时调用, 两者 callback 相对执行顺序是不确定的.
  * process.nextTick 传递的 callbacks 总是在每一个 phase 结束, 下一个 phase 开始之前顺序同步地执行. 只要 process.nextTick 的所有 callbacks 不处理完毕, 就无法进入下一个 phase, 从而阻塞了 eventloop. 所以循环调用 process.nextTick 是绝对要避免的.
  * 不同与 process.nextTick, 循环调用 setImmediate 会使新的 callback 排到下一次 eventloop 循环, 因此不会发生阻塞. 

这些都是从 eventpoll 原理中得到推论.

## promise.nextTick 的必要性

考虑如下代码片段, callback 函数被同步调用, 导致取 bar 值时, 变量 bar 还没有被声明, 程序抛错.

```
// this has an asynchronous signature, but calls callback synchronously
function someAsyncApiCall (callback) { callback(); };

// the callback is called before `someAsyncApiCall` completes.
someAsyncApiCall(() => {

  // since someAsyncApiCall has completed, bar hasn't been assigned any value
  console.log('bar', bar); // undefined

});

var bar = 1;
```

解决方法自然是将 callback 调用放入 process.nextTick 里, 使得 callback 被调用时 bar 已被声明.

同理, 观察一段更加常见的代码:

```
const server = net.createServer(() => {}).listen(8080);

server.on('listening', () => {});
```

如果 listen 被调用时就发出 listening 事件, 注册的 listening 监听器永远无法收到 listening 事件. 可以使用 process.nextTick 使代码执行完, 监听器注册完毕后再发出 listening 事件.

## 属于 microtask 的 promise

当我们在讨论 nodejs 的 eventloop 时, 其实我们是在指 libuv 的 uv_run 部分再加上 process.nextTick 再加上 microtask.

process.nextTick 执行完后就开始执行 microtask.

源码 node/lib/internal/process/task_queues.js 中定义的函数 processTicksAndRejections 揭示了这一点:

```
function processTicksAndRejections() {
  let tock;
  do {
    while (tock = queue.shift()) {
      const asyncId = tock[async_id_symbol];
      emitBefore(asyncId, tock[trigger_async_id_symbol], tock);

      try {
        const callback = tock.callback;
        if (tock.args === undefined) {
          callback();
        } else {
          const args = tock.args;
          switch (args.length) {
            case 1: callback(args[0]); break;
            case 2: callback(args[0], args[1]); break;
            case 3: callback(args[0], args[1], args[2]); break;
            case 4: callback(args[0], args[1], args[2], args[3]); break;
            default: callback(...args);
          }
        }
      } finally {
        if (destroyHooksExist())
          emitDestroy(asyncId);
      }

      emitAfter(asyncId);
    }
    runMicrotasks();
  } while (!queue.isEmpty() || processPromiseRejections());
  setHasTickScheduled(false);
  setHasRejectionToWarn(false);
}
```

## 自测

到此, eventloop 旅程可以告一段落了. 

本文前面提出的几个问题到此也应该迎刃而解了. 那么根据你所掌握的 eventloop 原理, 下面这两个代码片段的输出是多少呢.

```
// 1
setTimeout(function () {
  setTimeout(function timeout () {
    console.log('1');
  },0);

  setImmediate(function immediate () {
    console.log('2');
  });
});

setImmediate(function () {
  setTimeout(function timeout () {
    console.log('3');
  },0);

  setImmediate(function immediate () {
    console.log('4');
  });
});

```

```
// 2
let fs = require('fs');

fs.readFile(__filename, function (err, data) {
    if (!err) {
        setTimeout(function () {
            console.log('1');
        }, 100);

        setTimeout(function () {
            console.log('2');
        }, 0);

        setImmediate(function () {
            console.log('3');
        });

        helper().then(function () {
            console.log('4');
        });

        process.nextTick(function () {
            console.log('5');
        });
    }
});
function helper() {
  return Promise.resolve();
}
```

## 最后

Nodejs 能够高效执行 I/O 操作, 这要归功于这精妙的 Event Loop. 而 Event Loop 的核心, libuv, 在 Linux 环境下面实际上是基于 epoll 的. 对于 epoll 的原理与实现感兴趣的读者可以参阅这篇文章:

从源码理解 epoll [https://www.tiaoxingyubolang.com/article/2020-03-27_epoll1](/article/2020-03-27_epoll1)
