@echo off
echo Starting Job Portal Server...
:start
node server.js
echo Server stopped, restarting in 5 seconds...
timeout /t 5
goto start 