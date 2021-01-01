//META{"name":"AnimatedStatus","source":"https://raw.githubusercontent.com/toluschr/BetterDiscord-Animated-Status/master/animated-status.plugin.js","website":"https://github.com/toluschr/BetterDiscord-Animated-Status"}*//

const Editor_Type = {
	RICH: 0,
	RAW: 1,
};

class AnimatedStatus {
	/* BD functions */
	getName() {
		return "AnimatedStatus";
	}

	getVersion() {
		return "0.11.1";
	}

	getAuthor() {
		return "toluschr";
	}

	getDescription() {
		return "Animate your Discord status";
	}

	setData(key, value) {
		BdApi.setData(this.getName(), key, value);
	}

	getData(key) {
		return BdApi.getData(this.getName(), key);
	}

	/* Code related to Animations */
	load() {
		this.kSpacing = "15px";
		this.kMinTimeout = 2900;
		this.kDefaultEditor = Editor_Type.RICH;

		this.animation = this.getData("animation") || [];
		this.timeout = this.getData("timeout") || this.kMinTimeout;
		this.editor = this.getData("editor") || this.kDefaultEditor;

		// Be compatible with older configs
		if (typeof this.timeout == "string")
			this.timeout = parseInt(this.timeout);
	}

	start() {
		this.Status_Animate();
	}

	stop() {
		clearTimeout(this.loop);
		Status.unset();
	}

	Status_Eval(string) {
		try {
			return ((string.startsWith("eval ")) ? (eval(string.substr(5))) : (string));
		}
		catch (e) {
			BdApi.showToast(e, {type: "error"});
			return "";
		}
	}

	Status_Animate(index = 0) {
		if (index >= this.animation.length) index = 0;
		if (this.animation[index] == undefined) {
			BdApi.showToast("Animated Status: No status set. Go to Settings>Plugins to set a custom animation!");
			return;
		}

		let results = this.animation[index].map(async (element) => this.Status_Eval(element));
		Promise.all(results).then(res => {
			Status.set(res)
			this.loop = setTimeout(() => { this.Status_Animate(index + 1); }, this.timeout);
		});
	}

	// Ui related, but special components
	newRawEdit(str = "") {
		let out = GUI.newTextarea();
		out.style.fontFamily = "SourceCodePro,Consolas,Liberation Mono,Menlo,Courier,monospace";
		out.placeholder = '"Test (Message)"\n"Test (Message)", "👍 (Symbol)"\n"Test (Message)", "emoji (Nitro Symbol)", "000000000000000000 (Nitro Symbol ID)"\n"eval new String(\'test\') (Javascript)"\n"eval new String(\'test\') (Javascript)", "eval new String(\'👍\') (Javascript)"\n...';
		out.value = str;
		return out;
	}

	newRichRow(text, emoji, optNitroId = undefined) {
		let hbox = GUI.newHBox();

		let textWidget = GUI.newInput(text);
		textWidget.placeholder = "Text";
		textWidget.style.marginRight = this.kSpacing;
		if (text != undefined) textWidget.value = text;
		hbox.appendChild(textWidget);

		let emojiWidget = GUI.newInput(emoji);
		emojiWidget.placeholder = "👍 / nitro_name";
		emojiWidget.style.width = "140px";
		emojiWidget.style.marginRight = this.kSpacing;
		if (emoji != undefined) emojiWidget.value = emoji;
		hbox.appendChild(emojiWidget);

		let optNitroIdWidget = GUI.newInput(optNitroId);
		optNitroIdWidget.placeholder = "nitro_id";
		optNitroIdWidget.style.width = "150px";
		if (optNitroId != undefined) optNitroIdWidget.value = optNitroId;
		hbox.appendChild(optNitroIdWidget);

		return hbox;
	}

	// Conversion related
	strToJson(str) {
		return str.split("\n").filter(i => i).map((element) => JSON.parse(`[${element}]`));
	}

	jsonToStr(animation) {
		if (animation == undefined) return "";

		let out = "";
		for (let i = 0; i < animation.length; i++) {
			out += JSON.stringify(animation[i]).substr(1).slice(0, -1) + "\n";
		}
		return out;
	}

	jsonToRichEdit(json) {
		let out = document.createElement("div");
		for (let i = 0; i < json.length; i++) {
			// text is 0, emoji is 1
			let row = undefined;
			if (json[i].length == 2) row = this.newRichRow(json[i][0], json[i][1]);
			else row = this.newRichRow(json[i][0], json[i][1], json[i][2]);

			if (i) row.style.marginTop = "15px";
			out.appendChild(row);
		}

		return out;
	}

	richEditToJson(editor) {
		return Array.prototype.slice.call(editor.childNodes).map((element) => {
				return Array.prototype.slice.call(element.childNodes)
					.filter(e => e.value.length)
					.map(e => e.value);
		}).filter(e => e.length);
	}

	// Settings
	getSettingsPanel() {
		let settings = document.createElement("div");
		settings.style.padding = "10px";

		// timeout
		settings.appendChild(GUI.newLabel("Time per Keyframe (In milliseconds)"));
		let timeout = GUI.newInput();
		timeout.setAttribute("type", "number");
		timeout.addEventListener("focusout", () => {
			if (parseInt(timeout.value) < this.kMinTimeout) {
				timeout.value = String(this.kMinTimeout);
			}
		});
		timeout.value = String(this.timeout);
		timeout.style.marginBottom = this.kSpacing;
		settings.appendChild(timeout);

		// Animation
		settings.appendChild(GUI.newLabel('Animation'));
		let animationContainer = document.createElement("div");
		animationContainer.marginBottom = this.kSpacing;
		settings.appendChild(animationContainer);

		// Actions
		let actions = GUI.newHBox();
		actions.style.marginTop = this.kSpacing;
		settings.appendChild(actions);

		let actionsRich = GUI.newHBox();

		let addStep = GUI.setSuggested(GUI.newButton("+", false));
		addStep.title = "Add step to end";
		addStep.onclick = () => {
			let row = this.newRichRow();
			if (edit.childNodes.length) row.style.marginTop = this.kSpacing;
			edit.appendChild(row);
		}
		actionsRich.appendChild(addStep);

		let delStep = GUI.setDestructive(GUI.newButton("-", false));
		delStep.title = "Remove last step";
		delStep.style.marginLeft = this.kSpacing;
		delStep.onclick = () => edit.removeChild(edit.childNodes[edit.childNodes.length - 1]);
		actionsRich.appendChild(delStep);

		let edit = undefined;
		if (this.editor == Editor_Type.RICH) {
			edit = this.jsonToRichEdit(this.animation);
			actionsRich.style.display = "flex";
		} else {
			edit = this.newRawEdit(this.jsonToStr(this.animation));
			actionsRich.style.display = "none";
		}
		animationContainer.appendChild(edit);

		let changeEditMode = GUI.newButton("Change Edit Mode");
		actions.appendChild(changeEditMode);

		// TODO make this function less bad
		changeEditMode.onclick = () => {
			this.editor = !this.editor;
			let newEdit = undefined;

			try {
				if (this.editor == Editor_Type.RICH) {
					newEdit = this.jsonToRichEdit(this.strToJson(edit.value));
					actionsRich.style.display = "flex";
				} else {
					newEdit = this.newRawEdit(this.jsonToStr(this.richEditToJson(edit)));
					actionsRich.style.display = "none";
				}
			}
			catch (e) {
				BdApi.showToast(e, {type: "error"});
				return;
			}

			animationContainer.removeChild(edit);
			animationContainer.appendChild(newEdit);
			edit = newEdit;
		};

		// Append actions Rich after change edit mode
		actionsRich.style.marginLeft = this.kSpacing
		actions.appendChild(actionsRich);

		// Move save to the right
		actions.appendChild(GUI.setExpand(document.createElement("div"), 2));

		let save = GUI.newButton("Save");
		GUI.setSuggested(save, true);
		actions.appendChild(save);
		save.onclick = () => {
			try {
				// Set timeout
				this.setData("timeout", parseInt(timeout.value));
				this.setData("editor", this.editor);

				// Set Animation
				if (this.editor == Editor_Type.RICH)
					this.setData("animation", this.richEditToJson(edit));
				else
					this.setData("animation", this.strToJson(edit.value));
			}
			catch (e) {
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
		if (req.status < 400)
			return undefined;

		if (req.status == 401)
			return "Invalid AuthToken";

		let json = JSON.parse(req.response);
		for (const s of ["errors", "custom_status", "text", "_errors", 0, "message"])
			if ((json == undefined) || ((json = json[s]) == undefined))
				return "Internal. Report at github.com/toluschr/BetterDiscord-Animated-Status";

		return json;
	},

	request: () => {
		let req = new XMLHttpRequest();
		req.open("PATCH", "/api/v8/users/@me/settings", true);
		req.setRequestHeader("authorization", Status.authToken);
		req.setRequestHeader("content-type", "application/json");
		req.onload = () => {
			let err = Status.strerror(req);
			if (err != undefined)
				BdApi.showToast(`Animated Status: Error: ${err}`, {type: "error"});
		};
		return req;
	},

	set: (status) => {
		let data = {};

		if (status.length == 0) return;
		if (status.length >= 1) data.text = status[0];
		if (status.length >= 2) data.emoji_name = status[1];
		if (status.length >= 3) data.emoji_id = status[2];

		Status.request().send(JSON.stringify({custom_status: data}));
	},

	unset: () => {
		Status.request().send('{"custom_status":null}');
	}
};

// Used to easily style elements like the 'native' discord ones
const GUI = {
	newInput: (text = "") => {
		let input = document.createElement("input");
		input.className = "inputDefault-_djjkz input-cIJ7To";
		input.innerText = text;
		return input;
	},

	newLabel: (text) => {
		let label = document.createElement("h5");
		label.className = "h5-18_1nd";
		label.innerText = text;
		return label;
	},

	newTextarea: () => {
		let textarea = document.createElement("textarea");
		textarea.className = "input-cIJ7To scrollbarGhostHairline-1mSOM1";
		textarea.style.resize = "vertical";
		textarea.rows = 4;
		return textarea;
	},

	newButton: (text, filled = true) => {
		let button = document.createElement("button");
		button.className = "button-38aScr colorBrand-3pXr91 sizeSmall-2cSMqn grow-q77ONN";
		if (filled) button.classList.add("lookFilled-1Gx00P");
		else button.classList.add("lookOutlined-3sRXeN");
		button.innerText = text;
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
