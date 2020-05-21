# BetterDiscord-Animated-Status

## Installation
Install [BetterDiscord](https://github.com/rauenzi/BetterDiscordApp)\
Download [animated-status.plugin.js](/animated-status.plugin.js?raw=true) into the following directory\
Mac: `~/Library/Preferences/BetterDiscord`\
Windows: `%appdata%\BetterDiscord\plugins`\
Linux: `~/.config/BetterDiscord/plugins`

## Usage
Open Discord, go to Settings\>Plugins, enable AnimatedStatus and click on Settings.\
Enter the required information into the input fields and click `save`

## Timeout / Time Per Keyframe
The value specifies the length of each animation step in milliseconds.
Example: With a timeout of 2000, the following animation would take 4 seconds to complete
```
"abc"
"def"
```
The animation timeout should be at least 2900 milliseconds for the animation to look smooth on other clients. This makes sure no keyframe gets gets lost.
On mobile systems the timeout might have to be set a little higher (10-14 Seconds)\
^ According to [@pintoso](https://github.com/pintoso)


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
![Settings Page](/screenshots/status_clock.png?raw=true)
```
"eval let fmt=t=>(t<10?'0':'')+t;let d=new Date();`${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`;", "eval ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'][((new Date()).getHours()%12)];"
```
