#!/bin/bash  

if [ `pgrep -f XX-Net/start | wc -l` -eq 0 ]; then
    #echo "XX-Net daemon not exist"
    /opt/XX-Net/start
fi
