#!/bin/sh
# run in dev mode

# docker run -it --rm --name restpie-dev -p 8100:80 -v `pwd`/:/app/ restpie-dev-image

sudo /usr/bin/uwsgi --ini /home/monitoring/app/conf/uwsgi.ini:uwsgi-production

# sleep 2

# /home/monitoring/app/venv/bin/python /home/monitoring/app/py/socketio_runner.py