# nginx 根据 hostname 转发流量到不同端口

单台机器上可能部署多个 web 服务, 但是 80 端口只有一个, 这时候就需要 nginx 登场了.

## 配置文件

在 /etc/nginx/conf.d 下新建文件 example.conf:

```
upstream foo_pool{
    server 127.0.0.1:3000;
}

upstream bar_pool{
    server 127.0.0.1:3001;
}

server {
    listen       80;
    listen [::]:80;
    server_name  www.tiaoxingyubolang.com;

    location / {
        proxy_pass http://foo_pool/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen       80;
    listen [::]:80;
    server_name  www.netsphere.live;

    location / {
        proxy_pass http://bar_pool/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 使修改生效

先检测配置文件格式正确:

```
$ nginx -t
```

更新 nginx:

```
$ nginx -s reload
```

