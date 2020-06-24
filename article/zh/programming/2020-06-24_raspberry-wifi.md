# Config raspberry pi wifi without a display.

My poor raspberry pi was broken. It lost all 4 usb port and eth connection, while the rest still functions well. After I flashed the new raspberry pi image, problems arised. My pi didn't connect to wifi automatically without proper wifi ssid and password configuration, and I can't log into the system with the usb port. It seems the only viable way to config it is writting to the file system directly.

## Two steps

After the raspberry pi first time boot initialized file system resize, pull out the SD card and mount it to your Linux/Win.

1. Cd info the mount point, add wifi ssid and password to file `/etc/wpa_supplicant/wpa_supplicant.conf`:

```
network={
        ssid="your-ssid"
        psk="your-password"
}
```

2. Make sure the content in file `/var/lib/systemd/rfkill/platform-3f300000.mmcnr:wlan` is 0 instead of 1.

Umount the SD card, reboot your raspberry pi, it should connect to the wifi you configured automatially.
