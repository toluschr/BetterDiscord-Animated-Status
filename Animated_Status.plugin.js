//META{"name":"AnimatedStatus","source":"https://raw.githubusercontent.com/toluschr/BetterDiscord-Animated-Status/master/Animated_Status.plugin.js","website":"https://github.com/toluschr/BetterDiscord-Animated-Status"}*//

class AnimatedStatus {
  constructor() {
    this.kSpacing = "15px";
    this.kMinTimeout = 2900;
    this.cancel = undefined;
  }

  getName() { return "Animated Status"; }
  getVersion() { return "0.13.3"; }
  getAuthor() { return "toluschr, SirSlender"; }
  getDescription() { return "Animate your Discord status"; }

  setData(key, value) {
    BdApi.setData("AnimatedStatus", key, value);
  }

  getData(key) {
    return BdApi.getData("AnimatedStatus", key);
  }

  load() {
    this.animation = this.getData("animation") || [];
    this.timeout = this.getData("timeout") || this.kMinTimeout;
    this.randomize = this.getData("randomize") || false;

    // https://github.com/BetterDiscord/BetterDiscord/blob/main/renderer/src/modules/webpackmodules.js#L445
    //
    // Seems to load before the Module that exports getToken, so BdApi.Webpack can't be used
    this.modules = this.modules || (() => {
      let m = [];
      webpackChunkdiscord_app.push([['AnimatedStatus'], {}, e => {
        m = m.concat(Object.values(e.c || {}));
      }]);
      return m;
    })();

    this.status = {
      authToken: this.modules.find(m => m.exports?.default?.getToken !== void 0).exports.default.getToken(),
      currentUser: this.modules.find(m => m.exports?.default?.getCurrentUser !== void 0).exports.default.getCurrentUser()
    };
  }

  start() {
    if (this.animation.length === 0) {
      BdApi.showToast("Animated Status: No status set. Go to Settings>Plugins to set a custom animation!");
    } else {
      this.animationLoop();
    }
  }

  stop() {
    if (this.cancel) {
      this.cancel();
    } else {
      console.assert(this.loop !== undefined);
      clearTimeout(this.loop);
    }
    this.setStatus(null);
  }

  configObjectFromArray(arr) {
    const data = {};
    if (arr[0] !== undefined && arr[0].length > 0) data.text = arr[0];
    if (arr[1] !== undefined && arr[1].length > 0) data.emoji_name = arr[1];
    if (arr[2] !== undefined && arr[2].length > 0) data.emoji_id = arr[2];
    if (arr[3] !== undefined && arr[3].length > 0) data.timeout = parseInt(arr[3]);
    return data;
  }

  async resolveStatusField(text = "") {
    const evalPrefix = "eval ";
    if (!text.startsWith(evalPrefix)) return text;

    try {
      return eval(text.substr(evalPrefix.length));
    } catch (e) {
      BdApi.showToast(e, { type: "error" });
      return "";
    }
  }

  animationLoop(i = 0) {
    i %= this.animation.length;

    let shouldContinue = true;
    this.loop = undefined;
    this.cancel = () => { shouldContinue = false; };

    Promise.all([
      this.resolveStatusField(this.animation[i].text),
      this.resolveStatusField(this.animation[i].emoji_name),
      this.resolveStatusField(this.animation[i].emoji_id)
    ]).then(p => {
      this.setStatus(this.configObjectFromArray(p));
      this.cancel = undefined;

      if (shouldContinue) {
        const timeout = this.animation[i].timeout || this.timeout;
        this.loop = setTimeout(() => {
          if (this.randomize) {
            i += Math.floor(Math.random() * (this.animation.length - 2));
          }
          this.animationLoop(i + 1);
        }, timeout);
      }
    });
  }

  newEditorRow({ text, emoji_name, emoji_id, timeout } = {}) {
    const hbox = GUI.newHBox(this.kSpacing);

    const textWidget = hbox.appendChild(GUI.newInput(text, "Text"));
    textWidget.style.marginRight = this.kSpacing;

    const emojiWidget = hbox.appendChild(GUI.newInput(emoji_name, "👍" + (this.status.currentUser.premiumType ? " / Nitro Name" : "")));
    emojiWidget.style.width = "140px";

    const optNitroIdWidget = hbox.appendChild(GUI.newInput(emoji_id, "Nitro ID"));
    if (!this.status.currentUser.premiumType) optNitroIdWidget.style.display = "none";
    optNitroIdWidget.style.width = "140px";

    const optTimeoutWidget = hbox.appendChild(GUI.newNumericInput(timeout, this.kMinTimeout, "Time"));
    optTimeoutWidget.style.width = "75px";

    hbox.onkeydown = (e) => {
      const activeContainer = document.activeElement.parentNode;
      const activeIndex = Array.from(activeContainer.children).indexOf(document.activeElement);

      const keymaps = {
        "Delete": [
          [[false, true], () => {
            const next = hbox.nextSibling || hbox.previousSibling;
            hbox.parentNode.removeChild(hbox);
          }],
        ],

        "ArrowDown": [
          [[true, true], () => {
            const activeContainer = this.newEditorRow();
            hbox.parentNode.insertBefore(activeContainer, hbox.nextSibling);
          }],
          [[false, true], () => {
            const next = hbox.nextSibling;
            if (next !== undefined) {
              next.replaceWith(hbox);
              hbox.parentNode.insertBefore(next, hbox);
            }
          }],
          [[false, false], () => {
            const activeContainer = hbox.nextSibling;
          }],
        ],

        "ArrowUp": [
          [[true, true], () => {
            const activeContainer = this.newEditorRow();
            hbox.parentNode.insertBefore(activeContainer, hbox);
          }],
          [[false, true], () => {
            const prev = hbox.previousSibling;
            if (prev !== undefined) {
              prev.replaceWith(hbox);
              hbox.parentNode.insertBefore(prev, hbox.nextSibling);
            }
          }],
          [[false, false], () => {
            const activeContainer = hbox.previousSibling;
          }],
        ],
      };

      const letter = keymaps[e.key];
      if (letter === undefined) return;

      for (let i = 0; i < letter.length; i++) {
        if (letter[i][0][0] !== e.ctrlKey || letter[i][0][1] !== e.shiftKey)
          continue;

        letter[i][1]();
        if (activeContainer) activeContainer.children[activeIndex].focus();
        e.preventDefault();
        return;
      }
    };
    return hbox;
  }

  editorFromJSON(json) {
    const out = GUI.newVBox(this.kSpacing);
    for (let i = 0; i < json.length; i++) {
      out.appendChild(this.newEditorRow(json[i]));
    }
    return out;
  }

  jsonFromEditor(editor) {
    return Array.prototype.slice.call(editor.childNodes).map(row => {
      return this.configObjectFromArray(Array.prototype.slice.call(row.childNodes).map(e => e.value));
    });
  }

  getSettingsPanel() {
    const settings = document.createElement("div");
    settings.style.padding = "10px";

    settings.appendChild(GUI.newLabel("Step-Duration (3000: 3 seconds, 3500: 3.5 seconds, ...), overwritten by individual steps"));
    const timeout = settings.appendChild(GUI.newNumericInput(this.timeout, this.kMinTimeout));
    timeout.style.marginBottom = this.kSpacing;

    settings.appendChild(GUI.newLabel("Animation"));

    const animationContainer = settings.appendChild(document.createElement("div"));
    animationContainer.style.marginBottom = this.kSpacing;

    const edit = animationContainer.appendChild(this.editorFromJSON(this.animation));

    const actions = settings.appendChild(GUI.newHBox());

    const addStep = actions.appendChild(GUI.setSuggested(GUI.newButton("+", false)));
    addStep.title = "Add step to end";
    addStep.onclick = () => edit.appendChild(this.newEditorRow());

    const delStep = actions.appendChild(GUI.setDestructive(GUI.newButton("-", false)));
    delStep.title = "Remove last step";
    delStep.style.marginLeft = this.kSpacing;
    delStep.onclick = () => edit.removeChild(edit.childNodes[edit.childNodes.length - 1]);

    actions.appendChild(GUI.setExpand(document.createElement("div"), 2));

    const save = actions.appendChild(GUI.setSuggested(GUI.newButton("Save")));
    save.onclick = () => {
      try {
        this.setData("randomize", this.randomize);
        this.setData("timeout", parseInt(timeout.value));
        this.setData("animation", this.jsonFromEditor(edit));
      } catch (e) {
        BdApi.showToast(e, { type: "error" });
        return;
      }

      BdApi.showToast("Settings were saved!", { type: "success" });

      this.stop();
      this.load();
      this.start();
    };

    return settings;
  }

  setStatus(status) {
    const req = new XMLHttpRequest();
    req.open("PATCH", "/api/v9/users/@me/settings", true);
    req.setRequestHeader("authorization", this.status.authToken);
    req.setRequestHeader("content-type", "application/json");
    req.onload = () => {
      const err = this.strError(req);
      if (err !== undefined)
        BdApi.showToast(`Animated Status: Error: ${err}`, { type: "error" });
    };
    if (status === {}) status = null;
    req.send(JSON.stringify({ custom_status: status }));
  }

  strError(req) {
    if (req.status < 400) return undefined;
    if (req.status === 401) return "Invalid AuthToken";

    let json = JSON.parse(req.response);
    for (const s of ["errors", "custom_status", "text", "_errors", 0, "message"])
      if ((json === undefined) || ((json = json[s]) === undefined))
        return "Unknown error. Please report at github.com/toluschr/BetterDiscord-Animated-Status";

    return json;
  }
}

const GUI = {
  newInput: (text = "", placeholder = "") => {
    const input = document.createElement("input");
    input.className = "bd-select";
    input.style.paddingLeft = "5px";
    input.value = String(text);
    input.placeholder = String(placeholder);
    return input;
  },

  newNumericInput: (text = "", minimum = 0, placeholder = "") => {
    const out = GUI.newInput(text, placeholder);
    out.setAttribute("type", "number");
    out.addEventListener("focusout", () => {
      if (parseInt(out.value) < minimum) {
        out.value = String(minimum);
        BdApi.showToast(`Value must not be lower than ${minimum}`, { type: "error" });
      }
    });
    return out;
  },

  newLabel: (text = "") => {
    const label = document.createElement("h5");
    label.className = "bd-settings-title bd-settings-group-title";
    label.innerText = String(text);
    return label;
  },

  newButton: (text, filled = true) => {
    const button = document.createElement("button");
    button.className = "bd-button bd-addon-button";
    if (filled) button.classList.add("bd-button-filled");
    else button.classList.add("bd-button-outlined");
    button.innerText = String(text);
    return button;
  },

  newHBox: (spacing) => {
    const hbox = document.createElement("div");
    hbox.style.display = "flex";
    hbox.style.gap = spacing;
    hbox.style.flexDirection = "row";
    return hbox;
  },

  newVBox: (spacing) => {
    const hbox = document.createElement("div");
    hbox.style.display = "flex";
    hbox.style.gap = spacing;
    hbox.style.flexDirection = "column";
    return hbox;
  },

  setExpand: (element, value) => {
    element.style.flexGrow = value;
    return element;
  },

  setSuggested: (element, value = true) => {
    if (value) element.classList.add("bd-button-color-green");
    else element.classList.remove("bd-button-color-green");
    return element;
  },

  setDestructive: (element, value = true) => {
    if (value) element.classList.add("bd-button-color-red");
    else element.classList.remove("bd-button-color-red");
    return element;
  }
};
