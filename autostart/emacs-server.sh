#!/bin/bash  

if [ `pgrep -f "emacs24 --daemon"| wc -l` -eq 0 ]; then
    #echo "emacs24 daemon not exist"
    /bin/sh -c "LC_CTYPE=zh_CN.UTF-8 /usr/bin/emacs24 --daemon"
fi
