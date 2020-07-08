# 桌面 Linux 必备软件与设置

我经常重装系统, centos, ubuntu, gentoo 都有使用过一段时间, 最后停留在了 kali. 每次面对全新的 kali, 都要装上必备的软件, 进行一些设置.

## 依序安装/执行

- apt remove lightdm 
> 为了方便 xmonad 的启动, 删除窗口管理器.

- apt install xmonad acpi redshift xserver-xorg-input-synaptics fcitx fcitx-table-all fcitx-anthy alsa-utils npm docker.io tor aria2
> 后面会简单介绍各个软件.

- 拷贝设置文件. 克隆 https://github.com/derekchuank/debian-config, 执行 bin/restore.sh. 
> 为 profile.sh, bash.bashrc, .xinitrc, .vimrc 等设置文件建立软链接.

- 在 fcitx-configtool 中关闭 punctuation support.
> 使中文输入法使用英文标点.

- 安装 snapd, 再通过 snap 安装 code, microk8s, kubectl.

## 软件简介

- xmonad. 平铺式窗口管理器.
- redshift. 让屏幕变黄.
- acpi. 电源接口.
- xserver-xorg-input-synaptics. 触摸板驱动.
- fcitx. 输入法.
- alsa-utils. 音量控制.
- npm. Nodejs 环境.
- docker. docker 环境.
- tor. 匿名代理.
- aria2. 下载管理器.
