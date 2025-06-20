/////////////////////
// OPEN PREFS PAGE //
/////////////////////

browser.browserAction.onClicked.addListener(() => browser.tabs.create({ url: "prefs.html" }));

///////////
// SETUP //
///////////

var prefs = null;
var passwordText = null;
var passwordImage = null;

browser.storage.local.get("prefs").then(gotPrefs => 
{
	if (gotPrefs.prefs)
		prefs = gotPrefs.prefs;
	else 
		prefs = initPrefs
	
	generatePassword();
});

(function resetPrefs()
{
	browser.storage.local.set({ "prefs": prefs });
	setTimeout(resetPrefs, 100);
})();

////////////////
// SAVE PREFS //
////////////////

browser.runtime.onMessage.addListener(function(msg, sender)
{
	if (passwordText && msg.password != passwordText)
	{
		browser.tabs.sendMessage(sender.tab.id, { "password_result": "incorrect" });
		return;
	}

	if (msg.save_prefs)
	{
		// remove rows with no regex
		// remove lines in regex arr with no regex
		msg.save_prefs.rows = msg.save_prefs.rows.filter(row =>
		{
			row.regex_arr = row.regex_arr.map(reg => reg.trim());
			row.regex_arr = row.regex_arr.filter(reg => reg != "");
			return row.regex_arr.length != 0;
		});

		if (!msg.save_prefs.password_length)
			msg.save_prefs.password_length = prefs.password_length;

		prefs = msg.save_prefs;
		browser.storage.sync.set({ "prefs": msg.save_prefs });
		
		generatePassword();
		if (passwordText)
			browser.tabs.sendMessage(sender.tab.id, { "password_result": "correct", "password_image": passwordImage });
		else
			browser.tabs.sendMessage(sender.tab.id, { "password_result": "correct", "no_password": true });
	}
});

///////////////////////
// TAB UPDATED CHECK //
///////////////////////

browser.tabs.onUpdated.addListener(function(_, changes, tab) 
{
	// win.loc.origin is a way to get the addon uuid since the background script is running on page with it's name
	if (new RegExp(window.location.origin, "i").test(tab.url))
	{
		if (new RegExp("/blocked\.html", "i").test(tab.url))
			return;

		if (new RegExp("/prefs\.html", "i").test(tab.url))
		{
			if (passwordText)
				browser.tabs.sendMessage(tab.id, { "receive_prefs": prefs, "password_image": passwordImage });
			else
				browser.tabs.sendMessage(tab.id, { "receive_prefs": prefs, "no_password": true });

			return;
		}
	}

	if (prefs.addons_lockout && (new RegExp("about:addons|about:debugging|chrome://mozapps/content/extensions/extensions\.xul", "i").test(tab.url)))
		browser.tabs.update(tab.id, { url: encodeURI("blocked.html?" + tab.url) });

	if (!changes.url)
		return;

	prefs.rows.forEach(row => 
	{
		row.regex_arr.some(regexStr =>
		{
			if (new RegExp(regexStr, "i").test(tab.url))
			{
				regexSuccess(row, tab);
				return true;
			}
			else
				return false;
		});
	});
});

function regexSuccess(row, tab)
{
	if (row.block)
	{
		browser.tabs.update(tab.id, { url: encodeURI("blocked.html?" + tab.url) });
		return;
	}

	if (row.insert_js_css)
	{
		browser.tabs.executeScript(tab.id, { code: row.js_code });
		browser.tabs.insertCSS(tab.id, { code: row.css_code });
	}
}

/////////////////////////////
// GENERATE PASSWORD IMAGE //
/////////////////////////////

function generatePassword()
{
	var passLength = prefs.password_length;

	if (passLength == 0)
	{
		passwordText = null;
		passwordImage = null;
		return;
	}

	var passText = "";
	var chars = "abcdefghijklmnopqrstuvwxyz";
	for (var i = 0; i < passLength; i++)
	{
		passText += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	passwordText = passText;

	var canvas = document.createElement("canvas");
	canvas.setAttribute("width",  passLength * 7);
	canvas.setAttribute("height", 15);

	var canvasContext = canvas.getContext("2d");
	canvasContext.fillStyle = "white";
	canvasContext.font = "13.33333px consolas";

	canvasContext.fillText(passText, 0, 12);

	passwordImage = canvas.toDataURL("image/png");
}