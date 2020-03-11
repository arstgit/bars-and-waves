# Troubleshoot wrangler installation failure for root user

An error occurred while installing wrangler using npm: "Error: EACCES: permission denied, mkdir '/root/.wrangler'".

## Temporary Solution

Temporarily extend your home directory / root /:

``` 
  $ chmod 777 / root
  $ npm i -g @ cloudflare / wrangler
  $ chmod 700 / root
```

## Tracing the Source

After installation using the temporary workaround, the directory /root/.wrangler details are as follows:

```
  drwxr-xr-x 3 nobody root 4.0K Mar 9 09:14 .wrangler
```

My current user is root, but the folder user created is nobody, which is strange.

Query the source code of @ cloudflare / wrangler, the installation command is in scripts.postinstall in package.json:

```
  {
    "name": "@ cloudflare / wrangler",
    "version": "1.8.1",
    "description": "Wrangle your Cloudflare Workers",
    "main": "binary.js",
    "scripts": {
      "postinstall": "node ./install-wrangler.js",
      "preuninstall": "node ./uninstall-wrangler.js"
    },
  ...

```

Copy the source code of @ cloudflare / wrangler to this machine, instead of using npm, directly execute the command `node. / Install-wrangler.js` to install, everything goes smoothly, the user attribute of .wrangle is also root. The problem is located here npm

Search for 'nobody' in the npm source code, and sure enough, there is a hit in lib / config / defaults.js. If you look at the file name, you know that nobody is a predefined behavior. Then you search the documentation carefully and find such a text:

> If npm was invoked with root privileges, then it will change the uid to the user account or uid specified by the user config, which defaults to nobody. Set the unsafe-perm flag to run scripts with root privileges.

Our problem was solved.

## Perfect solution

As stated in the documentation, use the unsafe-perm tag:

```
  $ npm i -g @ cloudflare / wrangler --unsafe-perm = true
```
