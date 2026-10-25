/* Adds one ordinary navigation link; does not alter camera, gestures, voice or agents. */
(()=>{"use strict";
 if(document.getElementById("scottyIndependentBrainLink"))return;
 const left=document.querySelector(".left");
 if(!left)return;
 const link=document.createElement("a");
 link.id="scottyIndependentBrainLink";link.className="nav";
 link.href="/brain-lab";link.setAttribute("aria-label","Open Independent Brain Observatory");
 link.style.textDecoration="none";link.style.display="block";
 const dot=document.createElement("i");dot.setAttribute("aria-hidden","true");
 const title=document.createElement("span");title.textContent="Independent Brain";
 link.append(dot,title);
 const privacy=left.querySelector(".privacy");
 if(privacy)left.insertBefore(link,privacy);else left.append(link);
})();