//META{"name":"AnimatedStatus","source":"https://raw.githubusercontent.com/toluschr/BetterDiscord-Animated-Status/master/Animated_Status.plugin.js","website":"https://github.com/toluschr/BetterDiscord-Animated-Status"}*//

class AnimatedStatus {
	/* BD functions */
	getName() { return "Animated Status"; }
	getVersion() { return "0.13.2"; }
	getAuthor() { return "toluschr"; }
	getDescription() { return "Animate your Discord status"; }

	SetData(key, value) {
		BdApi.setData("AnimatedStatus", key, value);
	}

	GetData(key) {
		return BdApi.getData("AnimatedStatus", key);
	}

	/* Code related to Animations */
	load() {
		this.kSpacing = "15px";
		this.kMinTimeout = 2900;
		this.cancel = undefined;

		this.animation = this.GetData("animation") || [];
		this.timeout = this.GetData("timeout") || this.kMinTimeout;
		this.randomize = this.GetData("randomize") || false;

		this.modules = this.modules || (() => {
			let m = []
			webpackChunkdiscord_app.push([['AnimatedStatus'], {}, e => { m = m.concat(Object.values(e.c)) }])
			return m
		})();

		// Import Older Config Files
		if (typeof this.timeout == "string")
			this.timeout = parseInt(this.timeout);
		if (this.animation.length > 0 && Array.isArray(this.animation[0]))
			this.animation = this.animation.map(em => this.ConfigObjectFromArray(em));

		Status.authToken = this.modules.find(m => m.exports?.default?.getToken !== void 0).exports.default.getToken();
		this.currentUser = this.modules.find(m => m.exports?.default?.getCurrentUser !== void 0).exports.default.getCurrentUser();
	}

	start() {
		if (this.animation.length == 0)
			BdApi.showToast("Animated Status: No status set. Go to Settings>Plugins to set a custom animation!");
		else
			this.AnimationLoop();
	}

	stop() {
		if (this.cancel) {
			this.cancel();
		} else {
			console.assert(this.loop != undefined);
			clearTimeout(this.loop);
		}
		Status.Set(null);
	}

	ConfigObjectFromArray(arr) {
		let data = {};
		if (arr[0] !== undefined && arr[0].length > 0) data.text       = arr[0];
		if (arr[1] !== undefined && arr[1].length > 0) data.emoji_name = arr[1];
		if (arr[2] !== undefined && arr[2].length > 0) data.emoji_id   = arr[2];
		if (arr[3] !== undefined && arr[3].length > 0) data.timeout    = parseInt(arr[3]);
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

		// Every loop needs its own shouldContinue variable, otherwise there
		// is the possibility of multiple loops running simultaneously
		let shouldContinue = true;
		this.loop = undefined;
		this.cancel = () => { shouldContinue = false; };

		Promise.all([this.ResolveStatusField(this.animation[i].text),
		             this.ResolveStatusField(this.animation[i].emoji_name),
		             this.ResolveStatusField(this.animation[i].emoji_id)]).then(p => {
			Status.Set(this.ConfigObjectFromArray(p));
			this.cancel = undefined;

			if (shouldContinue) {
				let timeout = this.animation[i].timeout || this.timeout;
				this.loop = setTimeout(() => {
					if (this.randomize) {
						i += Math.floor(Math.random() * (this.animation.length - 2));
					}
					this.AnimationLoop(i + 1);
				}, timeout);
			}
		});
	}

	NewEditorRow({text, emoji_name, emoji_id, timeout} = {}) {
		let hbox = GUI.newHBox();
		hbox.style.marginBottom = this.kSpacing;

		let textWidget = hbox.appendChild(GUI.newInput(text, "Text"));
		textWidget.style.marginRight = this.kSpacing;

		let emojiWidget = hbox.appendChild(GUI.newInput(emoji_name, "👍" + (this.currentUser.premiumType ? " / Nitro Name" : "")));
		emojiWidget.style.marginRight = this.kSpacing;
		emojiWidget.style.width = "140px";

		let optNitroIdWidget = hbox.appendChild(GUI.newInput(emoji_id, "Nitro ID"));
		if (!this.currentUser.premiumType) optNitroIdWidget.style.display = "none";
		optNitroIdWidget.style.marginRight = this.kSpacing;
		optNitroIdWidget.style.width = "140px";

		let optTimeoutWidget = hbox.appendChild(GUI.newNumericInput(timeout, this.kMinTimeout, "Time"));
		optTimeoutWidget.style.width = "75px";

		hbox.onkeydown = (e) => {
			let activeContainer = document.activeElement.parentNode;
			let activeIndex = Array.from(activeContainer.children).indexOf(document.activeElement);

			let keymaps = {
				"Delete": [
					[[false, true], () => {
						activeContainer = hbox.nextSibling || hbox.previousSibling;
						hbox.parentNode.removeChild(hbox);
					}],
				],

				"ArrowDown": [
					[[true, true], () => {
						activeContainer = this.NewEditorRow();
						hbox.parentNode.insertBefore(activeContainer, hbox.nextSibling);
					}],
					[[false, true], () => {
						let next = hbox.nextSibling;
						if (next != undefined) {
							next.replaceWith(hbox);
							hbox.parentNode.insertBefore(next, hbox);
						}
					}],
					[[false, false], () => {
						activeContainer = hbox.nextSibling;
					}],
				],

				"ArrowUp": [
					[[true, true], () => {
						activeContainer = this.NewEditorRow();
						hbox.parentNode.insertBefore(activeContainer, hbox);
					}],
					[[false, true], () => {
						let prev = hbox.previousSibling;
						if (prev != undefined) {
							prev.replaceWith(hbox);
							hbox.parentNode.insertBefore(prev, hbox.nextSibling);
						}
					}],
					[[false, false], () => {
						activeContainer = hbox.previousSibling;
					}],
				],
			};

			let letter = keymaps[e.key];
			if (letter == undefined) return;

			for (let i = 0; i < letter.length; i++) {
				if (letter[i][0][0] != e.ctrlKey || letter[i][0][1] != e.shiftKey)
					continue;

				letter[i][1]();
				if (activeContainer) activeContainer.children[activeIndex].focus();
				e.preventDefault();
				return;
			}
		};
		return hbox;
	}

	EditorFromJSON(json) {
		let out = document.createElement("div");
		for (let i = 0; i < json.length; i++) {
			out.appendChild(this.NewEditorRow(json[i]));
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
		settings.appendChild(GUI.newLabel("Step-Duration (3000: 3 seconds, 3500: 3.5 seconds, ...), overwritten by invididual steps"));
		let timeout = settings.appendChild(GUI.newNumericInput(this.timeout, this.kMinTimeout));
		timeout.style.marginBottom = this.kSpacing;

		// Animation Container
		settings.appendChild(GUI.newLabel("Animation"));
		let animationContainer = settings.appendChild(document.createElement("div"));
		animationContainer.marginBottom = this.kSpacing;

		// Editor
		let edit = animationContainer.appendChild(this.EditorFromJSON(this.animation));

		// Actions
		let actions = settings.appendChild(GUI.newHBox());

		// Add Step
		let addStep = actions.appendChild(GUI.setSuggested(GUI.newButton("+", false)));
		addStep.title = "Add step to end";
		addStep.onclick = () => edit.appendChild(this.NewEditorRow());

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
				this.SetData("randomize", this.randomize);
				this.SetData("timeout", parseInt(timeout.value));
				this.SetData("animation", this.JSONFromEditor(edit));
			} catch (e) {
				BdApi.showToast(e, {type: "error"});
				return;
			}

			// Show Toast
			BdApi.showToast("Settings were saved!", {type: "success"});

			// Restart
			this.stop();
			this.load();
			this.start();
		};

		// End
		return settings;
	}
}

/* Status API */
const Status = {
	strerror: (req) => {
		if (req.status  < 400) return undefined;
		if (req.status == 401) return "Invalid AuthToken";

		// Discord _sometimes_ returns an error message
		let json = JSON.parse(req.response);
		for (const s of ["errors", "custom_status", "text", "_errors", 0, "message"])
			if ((json == undefined) || ((json = json[s]) == undefined))
				return "Unknown error. Please report at github.com/toluschr/BetterDiscord-Animated-Status";

		return json;
	},

	Set: async (status) => {
		let req = new XMLHttpRequest();
		req.open("PATCH", "/api/v9/users/@me/settings", true);
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
		input.className = "inputDefault-3FGxgL input-2g-os5";
		input.value = String(text);
		input.placeholder = String(placeholder);
		return input;
	},

	newNumericInput: (text = "", minimum = 0, placeholder = "") => {
		let out = GUI.newInput(text, placeholder);
		out.setAttribute("type", "number");
		out.addEventListener("focusout", () => {
			if (parseInt(out.value) < minimum) {
				out.value = String(minimum);
				BdApi.showToast(`Value must not be lower than ${minimum}`, {type: "error"});
			}
		});
		return out;
	},

	newLabel: (text = "") => {
		let label = document.createElement("h5");
		label.className = "h5-2RwDNl";
		label.innerText = String(text);
		return label;
	},

	newButton: (text, filled = true) => {
		let button = document.createElement("button");
		button.className = "button-f2h6uQ colorBrand-I6CyqQ sizeSmall-wU2dO- grow-2sR_-F";
		if (filled) button.classList.add("lookFilled-yCfaCM");
		else button.classList.add("lookOutlined-3yKVGo");
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
		if (value) element.classList.add("colorGreen-3y-Z79");
		else element.classList.remove("colorGreen-3y-Z79");
		return element;
	},

	setDestructive: (element, value = true) => {
		if (value) element.classList.add("colorRed-rQXKgM");
		else element.classList.remove("colorRed-rQXKgM");
		return element;
	}
};
