window.onload= function()
{
	var thisURL = decodeURI(window.location.href);
	var blockedURL = thisURL.substring(thisURL.indexOf("?")+1);
	var blockedLink = document.querySelector("#siteLink");
	blockedLink.setAttribute("href", blockedURL);
	blockedLink.appendChild(document.createTextNode(blockedURL));
}