"""Server database migrate"""
import subprocess

dir ="/home/monitoring/app/"
cmd = "cd {}; PYTHONPATH={}py PYSRV_CONFIG_PATH={} python3 scripts/dbmigrate.py".format(dir, dir, dir+"real-server-config.json")
print(cmd)
subprocess.Popen(cmd, shell=True)
