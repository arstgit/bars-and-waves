# 深入 redis 源码, 多线程的 redis, threaded I/O

redis 作为单线程的高性能内存数据库为人所熟知, 但是这不是完全正确的, 尽管 redis 的核心操作依旧保持着单线程模型, 其他地方出于性能的考虑有使用多线程多进程技术.

## 虚假的单线程 redis

持久化操作 AOF 和 RDB 都是新起一个进程在后台执行.

bio 线程池执行一些简单的后台任务, 比如 close(), fsync(), 数据清理等操作.

threadedIO 线程池执行 read(), write() 操作, 这也是本文要探究的主题.

## threaded I/O 的必要性

epoll 搭配 non-blocking I/O 这一经典组合早已大行其道, 但它不是完美无缺的, 这一点从模型的名字上就能初见端倪: 同步非阻塞多路复用编程模型.

非阻塞的 read() 操作是同步的: 将 buffer 从内核空间复制到用户空间所耗费的时间是被包含在函数调用耗时内的, 对于 write() 同样如此.

为了减轻耗时操作对性能的影响, 通常会使用线程池技术进行优化, redis 选择将部分耗时操作交由线程池执行.

redis 默认不开启 threaded I/O 功能. 在开启 threaded I/O 后对性能有多少影响可以参看链接:

https://itnext.io/benchmarking-the-experimental-redis-multi-threaded-i-o-1bb28b69a314

## 深入源码

### 初始化线程池 initThreadedIO()

在初始化 server 过程的最后会调用 InitServerLast():

```
void InitServerLast() {
    bioInit();
    initThreadedIO();
    set_jemalloc_bg_thread(server.jemalloc_bg_thread);
    server.initial_memory_usage = zmalloc_used_memory();
}
```

initTreadedIO() 执行初始化线程池操作:

```
/* Initialize the data structures needed for threaded I/O. */
void initThreadedIO(void) {
    io_threads_active = 0; /* We start with threads not active. */

    /* Don't spawn any thread if the user selected a single thread:
     * we'll handle I/O directly from the main thread. */
    if (server.io_threads_num == 1) return;

    if (server.io_threads_num > IO_THREADS_MAX_NUM) {
        serverLog(LL_WARNING,"Fatal: too many I/O threads configured. "
                             "The maximum number is %d.", IO_THREADS_MAX_NUM);
        exit(1);
    }

    /* Spawn and initialize the I/O threads. */
    for (int i = 0; i < server.io_threads_num; i++) {
        /* Things we do for all the threads including the main thread. */
        io_threads_list[i] = listCreate();
        if (i == 0) continue; /* Thread 0 is the main thread. */

        /* Things we do only for the additional threads. */
        pthread_t tid;
        pthread_mutex_init(&io_threads_mutex[i],NULL);
        io_threads_pending[i] = 0;
        pthread_mutex_lock(&io_threads_mutex[i]); /* Thread will be stopped. */
        if (pthread_create(&tid,NULL,IOThreadMain,(void*)(long)i) != 0) {
            serverLog(LL_WARNING,"Fatal: Can't initialize IO thread.");
            exit(1);
        }
        io_threads[i] = tid;
    }
}
```

可以看到

1. io_threads_pending 数组记录着每个线程分配到的任务数量.
2. io_threads_mutex 数组用来控制每个线程的开始与停止.
3. 线程运行函数 IOThreadMain().

为了避免冲突, io_threads_pending 数组内的元素被 _Atomic 修饰:

```
_Atomic unsigned long io_threads_pending[IO_THREADS_MAX_NUM];
```

### 线程执行 IOThreadMain()

线程的主函数内部其实就是一个检测/执行循环:

```
void *IOThreadMain(void *myid) {
    /* The ID is the thread number (from 0 to server.iothreads_num-1), and is
     * used by the thread to just manipulate a single sub-array of clients. */
    long id = (unsigned long)myid;
    char thdname[16];

    snprintf(thdname, sizeof(thdname), "io_thd_%ld", id);
    redis_set_thread_title(thdname);
    redisSetCpuAffinity(server.server_cpulist);

    while(1) {
        /* Wait for start */
        for (int j = 0; j < 1000000; j++) {
            if (io_threads_pending[id] != 0) break;
        }

        /* Give the main thread a chance to stop this thread. */
        if (io_threads_pending[id] == 0) {
            pthread_mutex_lock(&io_threads_mutex[id]);
            pthread_mutex_unlock(&io_threads_mutex[id]);
            continue;
        }

        serverAssert(io_threads_pending[id] != 0);

        if (tio_debug) printf("[%ld] %d to handle\n", id, (int)listLength(io_threads_list[id]));

        /* Process: note that the main thread will never touch our list
         * before we drop the pending count to 0. */
        listIter li;
        listNode *ln;
        listRewind(io_threads_list[id],&li);
        while((ln = listNext(&li))) {
            client *c = listNodeValue(ln);
            if (io_threads_op == IO_THREADS_OP_WRITE) {
                writeToClient(c,0);
            } else if (io_threads_op == IO_THREADS_OP_READ) {
                readQueryFromClient(c->conn);
            } else {
                serverPanic("io_threads_op value is unknown");
            }
        }
        listEmpty(io_threads_list[id]);
        io_threads_pending[id] = 0;

        if (tio_debug) printf("[%ld] Done\n", id);
    }
}
```

io_threads_pending 与 io_threads_mutex 一起控制线程任务的执行. 而线程具体执行什么任务是由全局变量 io_threads_op 确定的, io_threads_op 作为一个全局变量却不会引起线程执行混乱, 这得益于 redis 的核心逻辑依旧是单线程执行, 这一点后面还有体现.

线程执行任务时需要有相应数据, io_threads_list 数组记录着每个线程所需数据.

### 分配 write() 任务到线程池

在对一个命令处理完成以后, 需要向 client 发送回复内容. 调用 _addReplyToBuffer() 将打算发送的内容存储在 client 相应字段:

```
int _addReplyToBuffer(client *c, const char *s, size_t len) {
    size_t available = sizeof(c->buf)-c->bufpos;

    if (c->flags & CLIENT_CLOSE_AFTER_REPLY) return C_OK;

    /* If there already are entries in the reply list, we cannot
     * add anything more to the static buffer. */
    if (listLength(c->reply) > 0) return C_ERR;

    /* Check that the buffer has enough space available for this string. */
    if (len > available) return C_ERR;

    memcpy(c->buf+c->bufpos,s,len);
    c->bufpos+=len;
    return C_OK;
}
```

在进入下一个 eventLoop 进行 sleep 之前调用 beforeSleep():

```
void beforeSleep(struct aeEventLoop *eventLoop) {

// ...

    /* Handle writes with pending output buffers. */
    handleClientsWithPendingWritesUsingThreads();

// ...

}

```

handleClientsWithPendingWritesUsingThreads() 负责将前面准备好的 buffer 发送出去:

```
int handleClientsWithPendingWritesUsingThreads(void) {
    int processed = listLength(server.clients_pending_write);
    if (processed == 0) return 0; /* Return ASAP if there are no clients. */

    /* If I/O threads are disabled or we have few clients to serve, don't
     * use I/O threads, but thejboring synchronous code. */
    if (server.io_threads_num == 1 || stopThreadedIOIfNeeded()) {
        return handleClientsWithPendingWrites();
    }

    /* Start threads if needed. */
    if (!io_threads_active) startThreadedIO();

    if (tio_debug) printf("%d TOTAL WRITE pending clients\n", processed);

    /* Distribute the clients across N different lists. */
    listIter li;
    listNode *ln;
    listRewind(server.clients_pending_write,&li);
    int item_id = 0;
    while((ln = listNext(&li))) {
        client *c = listNodeValue(ln);
        c->flags &= ~CLIENT_PENDING_WRITE;
        int target_id = item_id % server.io_threads_num;
        listAddNodeTail(io_threads_list[target_id],c);
        item_id++;
    }

    /* Give the start condition to the waiting threads, by setting the
     * start condition atomic var. */
    io_threads_op = IO_THREADS_OP_WRITE;
    for (int j = 1; j < server.io_threads_num; j++) {
        int count = listLength(io_threads_list[j]);
        io_threads_pending[j] = count;
    }

    /* Also use the main thread to process a slice of clients. */
    listRewind(io_threads_list[0],&li);
    while((ln = listNext(&li))) {
        client *c = listNodeValue(ln);
        writeToClient(c,0);
    }
    listEmpty(io_threads_list[0]);

    /* Wait for all the other threads to end their work. */
    while(1) {
        unsigned long pending = 0;
        for (int j = 1; j < server.io_threads_num; j++)
            pending += io_threads_pending[j];
        if (pending == 0) break;
    }
    if (tio_debug) printf("I/O WRITE All threads finshed\n");

    /* Run the list of clients again to install the write handler where
     * needed. */
    listRewind(server.clients_pending_write,&li);
    while((ln = listNext(&li))) {
        client *c = listNodeValue(ln);

        /* Install the write handler if there are pending writes in some
         * of the clients. */
        if (clientHasPendingReplies(c) &&
                connSetWriteHandler(c->conn, sendReplyToClient) == AE_ERR)
        {
            freeClientAsync(c);
        }
    }
    listEmpty(server.clients_pending_write);
    return processed;
}
```

在 threaded I/O 开启的情况下, handleClientsWithPendingWritesUsingThreads() 将待处理的任务与相应数据 client  平均分配给包含着主线程的线程池, 然后, 在将自已的那份任务执行完后等待线程池中任务全部完成.

我们虽然用了 `等待` 这个词, 但完全没有暗示有 blocking I/O 操作存在, 所以这里等待的时间是要比 threaded I/O 关闭的情况下任务完全由主线程执行的耗时要短的, 除非任务的数量非常少, 以至于 thread I/O 完全没必要开启. redis 对这种情况有所处理:

```
int stopThreadedIOIfNeeded(void) {
    int pending = listLength(server.clients_pending_write);

    /* Return ASAP if IO threads are disabled (single threaded mode). */
    if (server.io_threads_num == 1) return 1;

    if (pending < (server.io_threads_num*2)) {
        if (io_threads_active) stopThreadedIO();
        return 1;
    } else {
        return 0;
    }
}
```

### 关于 read() 与 threaded I/O

将 read() 任务分配到线程池的操作与 write() 是类似的, 相同的部分不再赘述. read() 有如下几个地方值得注意:

1. 将 read() 任务分配到线程池的同时也会将相应的 parsing 部分分配, 但是之后的执行命令任务, 也就是 redis 的核心操作部分, 不会交由线程池执行:

  ```
  void processInputBuffer(client *c) {
      /* Keep processing while there is something in the input buffer */
      while(c->qb_pos < sdslen(c->querybuf)) {

  // ...

          /* Multibulk processing could see a <= 0 length. */
          if (c->argc == 0) {
              resetClient(c);
          } else {
              /* If we are in the context of an I/O thread, we can't really
               * execute the command here. All we can do is to flag the client
               * as one that needs to process the command. */
              if (c->flags & CLIENT_PENDING_READ) {
                  c->flags |= CLIENT_PENDING_COMMAND;
                  break;
              }

              /* We are finally ready to execute the command. */
              if (processCommandAndResetClient(c) == C_ERR) {
                  /* If the client is no longer valid, we avoid exiting this
                   * loop and trimming the client buffer later. So we return
                   * ASAP in that case. */
                  return;
              }
          }
      }

  // ...

  }
  ```

  这一点也对应了我们在前面提到的 redis 的核心单线程模型.

![threadedio](/static/picture/threadedio.png)

2. 在 threaded I/O 开启的情况下, 不同于 write(), read() 任务默认是不使用线程池的, 还需要设置参数 io-threads-do-reads 来显式开启.

  上图是运行过程中的 redis-server 火焰图, 可以看到其中的 ksys_read() 比 ksys_write() 短了许多, 这说明 read() 操作与 write() 操作相比轻量很多, 那么将 read() 任务分配线程池就显得不是那么有必要. 至于依附在 read() 后的 parsing, 由于它的执行非常迅速, 将它分配到线程池与否也实在影响不了大局.

## redis, speed up!

redis 的简洁是其作者"偏执"的结果. 利用多线程技术加速 redis 有多种方案, 作者选择只将耗时的, 所谓的边缘操作多线程化, 维持核心的单线程模型不变. 这实现虽简单, 效果却显著.

多线程化的 redis 在单机上是充分利用了 cpu, 但是 redis 的性能通常受制于内存与网络, 而这两大因素在单机环境下很难突破. 对更高性能的需求还需要其他方案的帮助.
