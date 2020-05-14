# BetterDiscord-Animated-Status

## Installation
Install (BetterDiscord)[https://github.com/rauenzi/BetterDiscordApp]\
Download animated-status-plugin.js into the following directory\
Mac: `~/Library/Preferences/BetterDiscord`\
Windows: `%appdata%\BetterDiscord\plugins`\
Linux: `~/.config/BetterDiscord/plugins`

## Usage
Open Discord, go to Settings\>Plugins, enable AnimatedStatus and click on Settings.\
Enter the required information into the input fields and click `save`

## Animations
![Settings Page](/screenshots/settings.png?raw=true)
Animations are made in a really simple and easy to understand syntax.
```
"Test (Message)"
"Test (Message)", "👍 (Symbol)"
"Test (Message)", "emoji (Nitro Symbol)", "000000000000000000 (Nitro Symbol ID)"
"eval new String('test') (Javascript)"
"eval new String('test') (Javascript)", "👍 (Symbol)"
...
```

## Examples
Have the current time as your status:
```
"eval (function(){let fmt=(t)=>(t<10?'0':'')+t;let d=new Date();return fmt(d.getHours())+':'+fmt(d.getMinutes())+':'+fmt(d.getSeconds());})();"
```
