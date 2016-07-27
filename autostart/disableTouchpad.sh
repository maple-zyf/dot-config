#!/bin/bash  

if [ `ls -d /sys/class/input/mouse* | wc -l` -gt 1 ]; then
	xinput set-prop 'ETPS/2 Elantech Touchpad' 'Device Enabled' 0
fi
