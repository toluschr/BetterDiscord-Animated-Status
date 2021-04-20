//META{"name":"AnimatedStatus","source":"https://raw.githubusercontent.com/toluschr/BetterDiscord-Animated-Status/master/animated-status.plugin.js","website":"https://github.com/toluschr/BetterDiscord-Animated-Status"}*//

class AnimatedStatus {
	/* BD functions */
	getName() { return "AnimatedStatus"; }
	getVersion() { return "0.12.0"; }
	getAuthor() { return "toluschr"; }
	getDescription() { return "Animate your Discord status"; }

	SetData(key, value) {
		BdApi.setData(this.getName(), key, value);
	}

	GetData(key) {
		return BdApi.getData(this.getName(), key);
	}

	/* Code related to Animations */
	load() {
		this.kSpacing = "15px";
		this.kMinTimeout = 2900;
		this.cancel = undefined;

		this.animation = this.GetData("animation") || [];
		this.timeout = this.GetData("timeout") || this.kMinTimeout;

		// Import Older Config Files
		if (typeof this.timeout == "string")
			this.timeout = parseInt(this.timeout);
		if (this.animation.length > 0 && Array.isArray(this.animation[0]))
			this.animation = this.animation.map(em => this.ConfigObjectFromArray);
	}

	start() {
		if (this.animation.length == 0)
			BdApi.showToast("Animated Status: No status set. Go to Settings>Plugins to set a custom animation!");
		else
			this.AnimationLoop();
	}

	stop() {
		if (this.cancel) this.cancel();
		clearTimeout(this.loop);
		Status.Set(null);
	}

	ConfigObjectFromArray(arr) {
		let data = {};
		if (arr.length > 0 && arr[0] !== undefined && arr[0].length > 0) data.text       = arr[0];
		if (arr.length > 1 && arr[1] !== undefined && arr[1].length > 0) data.emoji_name = arr[1];
		if (arr.length > 2 && arr[2] !== undefined && arr[2].length > 0) data.emoji_id   = arr[2];
		return data;
	}

	async ResolveStatusField(text = "") {
		let evalPrefix = "eval ";
		if (!text.startsWith(evalPrefix)) return text;

		try {
			return eval(text.substr(evalPrefix.length));
		} catch (e) {
			BdApi.showToast(e, {type: "error"});
			return "";
		}
	}

	AnimationLoop(i = 0) {
		i %= this.animation.length;
		let should_continue = true;
		this.cancel = () => { should_continue = false; }

		Promise.all([this.ResolveStatusField(this.animation[i].text),
					 this.ResolveStatusField(this.animation[i].emoji_name),
					 this.ResolveStatusField(this.animation[i].emoji_id)]).then(p => {
			if (should_continue) {
				this.cancel = undefined;
				Status.Set(this.ConfigObjectFromArray(p));
				this.loop = setTimeout(() => { this.AnimationLoop(i + 1); }, this.timeout);
			}
		});
	}

	NewEditorRow({text, emoji_name, emoji_id} = {}) {
		let hbox = GUI.newHBox();

		let textWidget = hbox.appendChild(GUI.newInput(text, "Text"));
		textWidget.style.marginRight = this.kSpacing;

		let emojiWidget = hbox.appendChild(GUI.newInput(emoji_name, "👍 / nitro_name"));
		emojiWidget.style.width = "140px";
		emojiWidget.style.marginRight = this.kSpacing;

		let optNitroIdWidget = hbox.appendChild(GUI.newInput(emoji_id, "nitro_id"));
		optNitroIdWidget.style.width = "140px";
		return hbox;
	}

	EditorFromJSON(json) {
		let out = document.createElement("div");
		for (let i = 0; i < json.length; i++) {
			let row = out.appendChild(this.NewEditorRow(json[i]));
			if (i) row.style.marginTop = "15px";
		}
		return out;
	}

	JSONFromEditor(editor) {
		return Array.prototype.slice.call(editor.childNodes).map(row => {
			return this.ConfigObjectFromArray(Array.prototype.slice.call(row.childNodes).map(e => e.value));
		});
	}

	// Settings
	getSettingsPanel() {
		let settings = document.createElement("div");
		settings.style.padding = "10px";

		// timeout
		settings.appendChild(GUI.newLabel("Step-Time (3000: 3 seconds, 3500: 3.5 seconds, ...)"));
		let timeout = settings.appendChild(GUI.newInput(this.timeout));
		timeout.setAttribute("type", "number");
		timeout.style.marginBottom = this.kSpacing;
		timeout.addEventListener("focusout", () => {
			if (parseInt(timeout.value) < this.kMinTimeout) {
				timeout.value = String(this.kMinTimeout);
				BdApi.showToast(`Timeout must not be lower than ${this.kMinTimeout}`, {type: "error"});
			}
		});

		// Animation Container
		settings.appendChild(GUI.newLabel("Animation"));
		let animationContainer = settings.appendChild(document.createElement("div"));
		animationContainer.marginBottom = this.kSpacing;

		// Editor
		let edit = animationContainer.appendChild(this.EditorFromJSON(this.animation));

		// Actions
		let actions = settings.appendChild(GUI.newHBox());
		actions.style.marginTop = this.kSpacing;

		// Add Step
		let addStep = actions.appendChild(GUI.setSuggested(GUI.newButton("+", false)));
		addStep.title = "Add step to end";
		addStep.onclick = () => {
			let row = edit.appendChild(this.NewEditorRow());
			if (edit.childNodes.length > 1)
				row.style.marginTop = this.kSpacing;
		}

		// Del Step
		let delStep = actions.appendChild(GUI.setDestructive(GUI.newButton("-", false)));
		delStep.title = "Remove last step";
		delStep.style.marginLeft = this.kSpacing;
		delStep.onclick = () => edit.removeChild(edit.childNodes[edit.childNodes.length - 1]);

		// Move save to the right (XXX make use of flexbox)
		actions.appendChild(GUI.setExpand(document.createElement("div"), 2));

		// Save
		let save = actions.appendChild(GUI.newButton("Save"));
		GUI.setSuggested(save, true);
		save.onclick = () => {
			try {
				// Set timeout
				this.SetData("timeout", parseInt(timeout.value));
				this.SetData("animation", this.JSONFromEditor(edit));
			} catch (e) {
				BdApi.showToast(e, {type: "error"});
				return;
			}

			// Show Toast
			BdApi.showToast("Settings were saved!", {type: "success"});

			// Restart
			this.load();
			this.stop();
			this.start();
		};

		// End
		return settings;
	}
}

/* Status API */
const Status = {
	authToken: Object.values(webpackJsonp.push([ [], { ['']: (_, e, r) => { e.cache = r.c } }, [ [''] ] ]).cache).find(m => m.exports && m.exports.default && m.exports.default.getToken !== void 0).exports.default.getToken(),

	strerror: (req) => {
		if (req.status  < 400) return undefined;
		if (req.status == 401) return "Invalid AuthToken";

		// Discord _sometimes_ returns an error message
		let json = JSON.parse(req.response);
		for (const s of ["errors", "custom_status", "text", "_errors", 0, "message"])
			if ((json == undefined) || ((json = json[s]) == undefined))
				return "Unknown. Report at github.com/toluschr/BetterDiscord-Animated-Status";

		return json;
	},

	Set: (status) => {
		let req = new XMLHttpRequest();
		req.open("PATCH", "/api/v8/users/@me/settings", true);
		req.setRequestHeader("authorization", Status.authToken);
		req.setRequestHeader("content-type", "application/json");
		req.onload = () => {
			let err = Status.strerror(req);
			if (err != undefined)
				BdApi.showToast(`Animated Status: Error: ${err}`, {type: "error"});
		};
		if (status === {}) status = null;
		req.send(JSON.stringify({custom_status: status}));
	},
};

// Used to easily style elements like the 'native' discord ones
const GUI = {
	newInput: (text = "", placeholder = "") => {
		let input = document.createElement("input");
		input.className = "inputDefault-_djjkz input-cIJ7To";
		input.value = String(text);
		input.placeholder = String(placeholder);
		return input;
	},

	newLabel: (text = "") => {
		let label = document.createElement("h5");
		label.className = "h5-18_1nd";
		label.innerText = String(text);
		return label;
	},

	newButton: (text, filled = true) => {
		let button = document.createElement("button");
		button.className = "button-38aScr colorBrand-3pXr91 sizeSmall-2cSMqn grow-q77ONN";
		if (filled) button.classList.add("lookFilled-1Gx00P");
		else button.classList.add("lookOutlined-3sRXeN");
		button.innerText = String(text);
		return button;
	},

	newHBox: () => {
		let hbox = document.createElement("div");
		hbox.style.display = "flex";
		hbox.style.flexDirection = "row";
		return hbox;
	},

	setExpand: (element, value) => {
		element.style.flexGrow = value;
		return element;
	},

	setSuggested: (element, value = true) => {
		if (value) element.classList.add("colorGreen-29iAKY");
		else element.classList.remove("mystyle");
		return element;
	},

	setDestructive: (element, value = true) => {
		if (value) element.classList.add("colorRed-1TFJan");
		else element.classList.remove("colorRed-1TFJan");
		return element;
	}
};
