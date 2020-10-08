# Download HTML5 videos from youtube

Cloud services are prevalent nowadays. Music and videos are provided on various websites, that's very convinent and comfortable for me, until one day I found one video I marked in my bookmark previously was't avalible anymore due to censorship or something else. That is totally unacceptable especially if that video was important.

It seems cloud is untrustable and we need to store everything important in our local drive.

Luckily, almost every sites support HTML5 videos, all we need is a HTML5 video downloader. That's easy, right?

HTML5 videos are just some HTML tags named video with a src attribute specifying the accutal data source. We copy the http URL from src and download it directly.

```
<video src="https://www.example.com">
```

It works on many sites except for some popular sites like youtube and so on. Because their video elements look like this:

```
<video src="blob:https://www.example2.com">
```
 
The URL starts with blob, we can't use it as a valid download link. What is that, how can we download the video from it?

## Introduction to media source extension

As you can see, attach a direct link to video tag is too brutal to make finer control over the playback. That brings out Media Source Extension(MSE):

https://w3c.github.io/media-source/

Basically, it exposes one core API called MediaSource and plays around it.

```js
const mediaSource = new MediaSource();

const blobURL = URL.createObjectURL(mediaSource);

console.log(blobURL) // blob:https://www.example2.com
```

Now we know the blob URL is a local link points to the media source object. It can be used inside the page only, that's why we can't download from it directly.

To provide video data to browser, the media source object need to be feeded first.

```
mediaSource.addEventListener('sourceopen', sourceOpen);

function sourceOpen (_) {
  const mediaSource = this;
  const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

  sourceBuffer.appendBuffer(buf);
};
```

`mimeCodec` is just a string specifying the media type and codec of the video. `sourceBuffer.appendBuffer()` feeds the data to browser.

In reality, `sourceBuffer.appendBuffer()` is invoked multiple times instead of just one for a media stream. This makes controlling the playback of HTML5 video all possible.

## Download from Media Source

`sourceBuffer.appendBuffer()` has one argument `buf` produced from invoking a XHR requst to some direct URL hidden in js files. I know what you think, intercept the URL browser connect is a way to download the video, indeed. But distinguish the right requsts from others while keeping the correct order at the meantime is pretty hard in practice, at least for me it is.

What if we can intercept the function invocation `sourceBuffer.appendBuffer()` instead, get the data needed directly from the js code invocation. Turns out it worked perfectly!

```js
const appendBufferOrigin = SourceBuffer.prototype.appendBuffer

SourceBuffer.prototype.appendBuffer = function () {
  // Process the buffer received.
  writeBufToSomewhere(arguments[0])

  return appendBufferOrigin.apply(this, arguments);
}
```

Actually we need to intercept more function invocations to get some other information, buf the core concept stays the same.

## Using nodejs package: videox

I wrote a nodejs package based on puppeteer, along with this idea surely. It's usage is straightforward. You can find it at the bottom of this article.

```js
const Videox = require('videox')

const targetUrl = 'https://www.youtube.com/watch?v=h32FxBqmu_U'

(async () = {
  const videox = new Videox({
    debug: true,
    headless: true,
    downloadBrowser: false,
    logTo: process.stdout,
    browserExecutePath: '/usr/bin/chromium',
    browserArgs: ['--no-sandbox'],
    downloadAsFile: true,
    downloadPath: path.join(__dirname, 'download'),
    checkCompleteLoopInterval: 100,
    waitForNextDataTimeout: 8000,
  })

  await videox.init()

  await videox.get(targetUrl)

  await videox.destroy()
})()
```

## Links

nodejs package, videox: [https://github.com/derekchuank/videox](https://github.com/derekchuank/videox)