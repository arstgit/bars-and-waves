# nginx forwards traffic to different ports based on hostname

There may be multiple web services deployed on a single machine that have only one 80 port. Nginx can be used to solve this problem.

## Configuration file

Create a new file example.conf under /etc/nginx/conf.d:

```
upstream book_pool{
    server 127.0.0.1:3000;
}

upstream movie_pool{
    server 127.0.0.1:3001;
}

server {
    listen       80;
    listen [::]:80;
    server_name  www.tiaoxingyubolang.com;

    location / {
        proxy_pass http://book_pool/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen       80;
    listen [::]:80;
    server_name  www.netsphere.live;

    location / {
        proxy_pass http://movie_pool/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Make changes effective

First check that the configuration file format is correct:

```
$ nginx -t
```

Update nginx:

```
$ nginx -s reload
```
