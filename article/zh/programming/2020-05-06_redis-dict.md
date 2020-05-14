# 深入 redis 源码, 字典 dict

redis 使用的 hash table 在其内部被称作 dict. 实际上, redis 的一个数据库就是一个 dict.

## dict 数据结构

dict 内部包括了下面几个结构:

```
typedef struct dictEntry {
    void *key;
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next;
} dictEntry;

typedef struct dictType {
    uint64_t (*hashFunction)(const void *key);
    void *(*keyDup)(void *privdata, const void *key);
    void *(*valDup)(void *privdata, const void *obj);
    int (*keyCompare)(void *privdata, const void *key1, const void *key2);
    void (*keyDestructor)(void *privdata, void *key);
    void (*valDestructor)(void *privdata, void *obj);
} dictType;

/* This is our hash table structure. Every dictionary has two of this as we
 * implement incremental rehashing, for the old to the new table. */
typedef struct dictht {
    dictEntry **table;
    unsigned long size;
    unsigned long sizemask;
    unsigned long used;
} dictht;

typedef struct dict {
    dictType *type;
    void *privdata;
    dictht ht[2];
    long rehashidx; /* rehashing not in progress if rehashidx == -1 */
    unsigned long iterators; /* number of iterators currently running */
} dict;
```

从中我们可以看到

1. struct dict 内的字段 type 描述了 hashFunction(), keyCompare() 等与 dict 类型相关的方法. 且此字段是作为参数在创建 dict 时需要提供的.
2. struct dict 内的字段 ht 是一个包含 2 个元素的数组, 这与字段 rehashidx 一起为 dict 扩容机制提供了基础.
3. struct dictht 内的字段 table 是一个指针数组, 存储着实际的数据.
4. struct dictEntry 就是每一条实际的数据, 其中的存在字段 next, 这告诉我们 hash 冲突是通过链表机制解决的.

redis 选择了 siphash() 作为默认 hashFunction(), 这里不作详细描述.

## rehash

在创建完一个 dict 后, 它的内部用于存储数据的空间是 0. 当我们向这个 dict 插入数据时, dict 需要执行扩容操作. 前面我们提到过 struct dict 内的字段 ht 是一个两个元素的数组, 而扩容实际上就是就将位于 ht[0] 的数据 rehash 到 ht[1].

rehash 相关操作遍布 dict.c 文件. 这是因为 rehash 是一个渐进式的操作, 它不是一蹴而就, 一次完成的:

1. 当向 dict 插入数据时, 如果有必要, 会进行扩容操作, 触发 rehash.
2. 当我们对已经触发过 rehash 的 dict 进行插入, 删除, 查找数据操作时, 都会进行一次 rehash 操作, 默认一次 rehash 10 条数据.
3. 当把所有的数据从 ht[0] rehash 到 ht[1] 后, 将 ht[1] 记录的数据复制到 ht[0], 并重置 ht[1], 这些操作都完成后, 一次完整的 rehash 流程就结束了. 这样, ht[0] 重新拥有了完整的数据并获得了更大的容量.

rehash 是一个渐进式的过程, 但是在这个过程中我们对 dict 的操作不会受到影响. 比如, 在 rehash 过程中查找一条数据, 实现上是在 ht[0] 和 ht[1] 中都进行查找操作. 在比如, rehash 过程中插入一条数据, 只需在 ht[1] 内插入即可.

## dict 其他

dict 的冲突是通过链表解决的, 这一点在数据结构上就体现了出来.

dict 何时扩容, _dictExpandIfNeeded() 回答了这个问题:

```
/* Expand the hash table if needed */
static int _dictExpandIfNeeded(dict *d)
{
    /* Incremental rehashing already in progress. Return. */
    if (dictIsRehashing(d)) return DICT_OK;

    /* If the hash table is empty expand it to the initial size. */
    if (d->ht[0].size == 0) return dictExpand(d, DICT_HT_INITIAL_SIZE);

    /* If we reached the 1:1 ratio, and we are allowed to resize the hash
     * table (global setting) or we should avoid it but the ratio between
     * elements/buckets is over the "safe" threshold, we resize doubling
     * the number of buckets. */
    if (d->ht[0].used >= d->ht[0].size &&
        (dict_can_resize ||
         d->ht[0].used/d->ht[0].size > dict_force_resize_ratio))
    {
        return dictExpand(d, d->ht[0].used*2);
    }
    return DICT_OK;
}
```

关于 dict 还有不少细节这里没有提到, 因为 redis 的 dict 实现相当优美简练, 我推荐也相信你可以通过阅读源码了解到更多.
