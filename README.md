# BetterDiscord-Animated-Status

## Installation
Install [BetterDiscord](https://github.com/rauenzi/BetterDiscordApp)\
Download animated-status-plugin.js into the following directory\
Mac: `~/Library/Preferences/BetterDiscord`\
Windows: `%appdata%\BetterDiscord\plugins`\
Linux: `~/.config/BetterDiscord/plugins`

## Usage
Open Discord, go to Settings\>Plugins, enable AnimatedStatus and click on Settings.\
Enter the required information into the input fields and click `save`

## Animations
![Settings Page](/screenshots/settings.png?raw=true)\
Animations are made in a really simple and easy to understand syntax.
```
"Test (Message)"
"Test (Message)", "👍 (Symbol)"
"Test (Message)", "emoji (Nitro Symbol)", "000000000000000000 (Nitro Symbol ID)"
"eval new String('test') (Javascript)"
"eval new String('test') (Javascript)", "eval new String('👍') (Javascript)"
...
```
## Examples
Switching text:
```
"Text 1"
"Text 2 with emoji", "👍"
```

### Custom Javascript
Have the current time as your status:
```
"eval let fmt=t=>(t<10?'0':'')+t;let d=new Date();`${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`;"
```

Have the current time with the corresponding clock symbol as your current status
![Settings Page](/screenshots/status_clock.png?raw=true)\
```
"eval let fmt=t=>(t<10?'0':'')+t;let d=new Date();`${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`;", "eval ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'][((new Date()).getHours()%12)];"
```
