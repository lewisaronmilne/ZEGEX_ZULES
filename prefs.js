///////////
// SETUP //
///////////

var maxRowHeight = null;
var awaitingMsg = true;

// MESSAGE RECEIVER
browser.runtime.onMessage.addListener(function(msg)
{
	if (!awaitingMsg)
		return;

	awaitingMsg = false;

	if (msg.password_result == "correct")
		notifyTextInput("#passwordInput", "#AFA")
	else if (msg.password_result == "incorrect")
		notifyTextInput("#passwordInput", "#FAA")

	if (msg.password_image)
	{
		document.getElementById("passwordDiv").removeAttribute("no_password");
		document.getElementById("passwordInput").value = "";
		document.getElementById("passwordImage").setAttribute("src", msg.password_image);
	}

	if (msg.no_password)
	{
		document.getElementById("passwordDiv").setAttribute("no_password","");
		document.getElementById("passwordInput").value = "";
		document.getElementById("passwordImage").removeAttribute("src");
	}

	if (msg.receive_prefs)
	{
		clearPage();
		makePage(msg.receive_prefs);
	}
});

function makePage(prefs) 
{
	document.querySelector("#addonsLockout").checked = prefs.addons_lockout;
	maxRowHeight = prefs.max_row_height;
	document.querySelector("#maxRowHeight").value = isNaN(maxRowHeight) ? "" : maxRowHeight;
	document.querySelector("#passwordLength").value = prefs.password_length;

	if (prefs.rows.length == 0)
		addRow(initRow);
		
	for(var i = 0; i < prefs.rows.length; i++)
	{
		addRow(prefs.rows[i]);
	}

	setTimeout(refreshRows, 1);
}

function clearPage()
{
	var rowList = document.querySelector("#rows").children;
	for (var i = rowList.length - 1; i >= 0; i--) 
	{
		rowList[i].remove();
	}
}

/////////////
// ADD ROW //
/////////////

function addRow(row)
{
	// Make Row
	var rowDiv = document.createElement("div");
	rowDiv.classList.add("row");

	// RegEx CodeMirror
	addCodeMirror(rowDiv, "regex", row.regex_arr.join("\n"));

	// Right Hand Side
	var rightDiv = rowDiv.appendChild(document.createElement("div"));
	rightDiv.classList.add("rightDiv");
	
	// Row Bar
	var rowBar = rightDiv.appendChild(document.createElement("div"));
	rowBar.classList.add("rowBar");
	rowBar.classList.add("hBar");

	addLabelledCheckbox(rowBar.appendChild(document.createElement("div")), "block", "Block", row.block);
	addLabelledCheckbox(rowBar.appendChild(document.createElement("div")), "insertJsCss", "Insert JS/CSS", row.insert_js_css);

	var underBarBtnDiv = rowBar.appendChild(document.createElement("div"));
	addModeBtn(underBarBtnDiv, rightDiv, "JS", "js");
	addModeBtn(underBarBtnDiv, rightDiv, "CSS", "css");

	rowBar.appendChild(document.createElement("div")).classList.add("stretch");

	var reorderBtnDiv = rowBar.appendChild(document.createElement("div"));
	var upBtn = reorderBtnDiv.appendChild(document.createElement("input"));
	upBtn.setAttribute("type", "submit");
	upBtn.value = "▲";
	upBtn.classList.add("upBtn");
	upBtn.onclick = () => swapRows(rowDiv.previousSibling, rowDiv);

	var downBtn = reorderBtnDiv.appendChild(document.createElement("input"));
	downBtn.setAttribute("type", "submit");
	downBtn.value = "▼";
	downBtn.classList.add("downBtn");
	downBtn.onclick = () => swapRows(rowDiv, rowDiv.nextSibling);

	// Under Bar (JS/CSS CodeMirror's)
	addCodeMirror(rightDiv, "javascript", row.js_code);
	addCodeMirror(rightDiv, "css", row.css_code);

	// add to Array/DOM
	document.querySelector("#rows").appendChild(rowDiv);
}

function addCodeMirror(parent, codeLang, code)
{
	var mirror = CodeMirror(parent, 
	{
		value: code,
		mode: codeLang,
		placeholder: "Enter some " + codeLang + ".",
		viewportMargin: Infinity,
		indentUnit: 4,
		lineNumbers: true,
	});
	mirror.getWrapperElement().classList.add(codeLang+"Mirror");
}

function addLabelledCheckbox(parent, checkClass, labelText, checked)
{
	var checkbox = parent.appendChild(document.createElement("input"));
	var labelTextDiv = parent.appendChild(document.createElement("div"));

	checkbox.setAttribute("type", "checkbox"); 
	checkbox.classList.add(checkClass);
	if (checked) checkbox.setAttribute("checked", "");

	labelTextDiv.appendChild(document.createTextNode(labelText));
	labelTextDiv.classList.add("textDiv");
}

function addModeBtn(parent, modeHolder, btnText, modeName)
{
	var btn = parent.appendChild(document.createElement("input"));
	btn.setAttribute("type", "submit");
	btn.classList.add(modeName+"Btn");
	btn.value = btnText;
	btn.onclick = function()
	{
		if (modeHolder.getAttribute("under_bar") != modeName)
			modeHolder.setAttribute("under_bar", modeName);
		else
			modeHolder.removeAttribute("under_bar");

		refreshRows();
	}
}

function swapRows(topRow, bottomRow)
{
	if (!topRow || !bottomRow)
		return;
	
	duration = 200;
	
	topRow.style.top = "0px";
	topRow.style.transitionProperty = "top";
	topRow.style.transitionDuration = duration + "ms";
	bottomRow.style.top = "0px";
	bottomRow.style.transitionProperty = "top";
	bottomRow.style.transitionDuration = duration + "ms";

	var moveTop = bottomRow.offsetTop + bottomRow.clientHeight - topRow.offsetTop - topRow.clientHeight;
	var moveBottom = topRow.offsetTop - bottomRow.offsetTop;
	topRow.style.top = moveTop + "px";
	bottomRow.style.top = moveBottom + "px";
	
	setTimeout(() =>
	{
		topRow.style.top = "";
		topRow.style.transitionProperty = "";
		topRow.style.transitionDuration = "";
		bottomRow.style.top = "";
		bottomRow.style.transitionProperty = "";
		bottomRow.style.transitionDuration = "";

		topRow.insertAdjacentElement("beforebegin", bottomRow);
	}, duration);
}

/////////////////
// SAVE BUTTON //
/////////////////

document.querySelector("#saveBtn").onclick = function()
{
	var savePrefs = 
	{ 
		"addons_lockout" : document.querySelector("#addonsLockout").checked,
		"max_row_height" : maxRowHeight,
		"password_length" : parseInt(document.querySelector("#passwordLength").value),
		"rows" : [] 
	};

	var rowsDiv = document.querySelector("#rows"); 
	for(var i = 0; i < rowsDiv.children.length; i++)
	{
		var rowDiv = rowsDiv.children[i];
		savePrefs.rows.push(
		{
			"regex_arr" : rowDiv.querySelector(".regexMirror").CodeMirror.getValue().split("\n"),
			"js_code" : rowDiv.querySelector(".javascriptMirror").CodeMirror.getValue(),
			"css_code" : rowDiv.querySelector(".cssMirror").CodeMirror.getValue(),
			"block" : rowDiv.querySelector(".block").checked,
			"insert_js_css" : rowDiv.querySelector(".insertJsCss").checked,
		});
	}

	awaitingMsg = true;
	browser.runtime.sendMessage(
	{ 
		"password": document.querySelector("#passwordInput").value.trim(),
		"save_prefs" : savePrefs, 
	});
}

///////////
// OTHER //
///////////

document.querySelector("#addRowBtn").onclick = function()
{
	addRow(initRow);
	refreshRows();
}

document.querySelector("#setMaxRowHeight").onclick = function()
{
	maxRowHeight = parseInt(document.querySelector("#maxRowHeight").value);
	refreshRows();
}

document.querySelector("#syncBtn").onclick = function()
{
	browser.storage.sync.get("prefs").then(gotPrefs =>
	{
		awaitingMsg = true;
		browser.runtime.sendMessage(
		{ 
			"password": document.querySelector("#passwordInput").value.trim(),
			"save_prefs" : gotPrefs.prefs, 
		});
	});
}

function notifyTextInput(selector, colour)
{
	var timeSolid = 250;
	var timeFading = 500;

	var textInput = document.querySelector(selector);

	textInput.style.transitionProperty = "";
	textInput.style.transitionDuration = "";
	textInput.style.backgroundColor = colour;

	setTimeout(() =>
	{   
		textInput.style.transitionProperty = "background-color";
		textInput.style.transitionDuration = timeFading + "ms";
		textInput.style.backgroundColor = "";  
	}, timeSolid);

	setTimeout(() =>
	{   
		textInput.style.transitionProperty = "";
		textInput.style.transitionDuration = "";
	}, (timeSolid + timeFading));
}

function refreshRows()
{
	document.documentElement.style.setProperty("--max-row-height", maxRowHeight + "px");
	document.querySelectorAll(".CodeMirror").forEach(cmElem => cmElem.CodeMirror.refresh());
}