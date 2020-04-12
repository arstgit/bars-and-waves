# 桌面 Linux 必备软件与设置

我经常重装系统, centos, ubuntu, gentoo 都使用过一段时间, 最后停留在了 kali. 每次面对全新的 kali, 都要装上必备的软件, 进行一些设置.

## 依序安装/执行

- apt remove lightdm
- apt install xmonad redshift xserver-xorg-input-synaptics fcitx fcitx-table-all fcitx-anthy alsa-utils npm
- 拷贝设置文件. 克隆 https://github.com/derekchuank/debian-config, 执行 bin/restore.sh.
- 在 fcitx-configtool 中关闭 punctuation support, 因为我只使用英文标点.

## 软件简介

- xmonad. 平铺式窗口管理器.
- redshift. 让屏幕变黄.
- xserver-xorg-input-synaptics. 触摸板驱动.
- fcitx. 输入法.
- alsa-utils. 音量控制.
- npm. Nodejs 环境.

