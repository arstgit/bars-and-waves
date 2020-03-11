# docker Common Operations

Docker is a common tool in software development, and some operations are used every day.

### Installation

Execute under debian:

```
  $ apt install docker.io docker-compose
```

Test installation is complete:

```
  $ docker run hello-world
```

### Mirror

Mirror pull, list, delete.

```
  $ docker pull hello-world
  $ docker image ls
  $ docker image rm [imageName]
```

After writing the Dockerfile, package and publish the image to the docker hub.

```
  $ docker build -t [username] / [repository]: [tag].
  $ docker push [username] / [repository]: [tag]
```

### Container

Run, enter bash, list, terminate, delete container, print log:

```
  $ docker run hello-world
  $ docker run -it ubuntu bash
  $ docker container ls --all
  $ docker container kill / stop [containID]
  $ docker container rm [containID]
  $ docker logs --tail = [num] [containID]

```

Enter the running container and open the bash operation:

```
  $ docker container exec -it [containerID] / bash
```
