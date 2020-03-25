# 旖旎 Nodejs: 同步的 EventEmitter

Nodejs 因其异步事件驱动的特性而闻名. 异步 Event Loop 与 事件驱动 EventEmitter 这两个概念其实是完全不相关的.

## 从源码出发

EventEmitter 的实现全在一个文件里 node/lib/events.js. 整个文件的 js 味道相当醇厚, 其核心也非常清晰明了.

EventEmitter 的构造函数及其初始化:

```
function EventEmitter(opts) {
  EventEmitter.init.call(this, opts);
}

EventEmitter.init = function(opts) {

  if (this._events === undefined ||
      this._events === ObjectGetPrototypeOf(this)._events) {
    this._events = ObjectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;

// ...
};
```

on 方法:

```
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

function _addListener(target, type, listener, prepend) {
  let m;
  let events;
  let existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = ObjectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

// ...
}
```

emit 方法:

```
EventEmitter.prototype.emit = function emit(type, ...args) {
  let doError = (type === 'error');

  const events = this._events;

// ...

  const handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    const result = ReflectApply(handler, this, args);

    // We check if result is undefined first because that
    // is the most common case so we do not pay any perf
    // penalty
    if (result !== undefined && result !== null) {
      addCatch(this, result, type, args);
    }
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler, len);
    for (let i = 0; i < len; ++i) {
      const result = ReflectApply(listeners[i], this, args);

      // We check if result is undefined first because that
      // is the most common case so we do not pay any perf
      // penalty.
      // This code is duplicated because extracting it away
      // would make it non-inlineable.
      if (result !== undefined && result !== null) {
        addCatch(this, result, type, args);
      }
    }
  }

  return true;
};
```

上面摘取的三个片段揭露了 EventEmitter 的运行机制: 每一次调用 on 方法都把用户提供的 listener 函数作为值存入 EventEmitter 实例中, 每次调用 emitter 都会将保存的一个或多个 listener 克隆出来并一个接一个顺序地调用 ReflectApply 执行. 

EventEmitter 根本就是同步的!

## 常用范式带给你错觉

当我们在阅读别人写的 EventEmitter 或者自己写的时侯, 似乎都会或多或少地默认 EventEmitter 具有异步的属性. 这当然是不正确的. 

产生这种错觉的原因是大家都习惯于将 EventEmitter 与异步任务结合起来使用:

```
oneEmitter.on('data', function (data) {
  console.log(data);
});

fs.readFile(__filename, (err, data) => {
  if(!err) {
    oneEmitter.emit('data', data);
  }
});
```

## Nodejs 真美, 小结

在上篇文章, 深入理解 Event Loop:

[https://www.tiaoxingyubolang.com/article/2020-03-25_nodejs-eventloop](https://www.tiaoxingyubolang.com/article/2020-03-25_nodejs-eventloop)

中, 我们探讨 eventloop 的原理, 重点关注了事件的执行顺序. 本文则关心常与 eventloop 结合使用, 却又与 eventloop 毫不相关的 EventEmitter.

如此, 对于 Nodejs 的宣传口号但也确是其极其优美的特性: 异步和事件驱动, 我们都有了相当程度的了解了. 相信你在写 Nodejs 程序时会更加得心应手.


