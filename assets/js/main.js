import { hoverChangeExperience } from "./hoverChangeExperience.js";
import { hoverChangeDescription } from "./hoverChangeDescription.js";
import { menu } from "./menu.js";
import { initSmoothHeaderScroll } from "./smoothScroll.js";
import { initSkillsReveal } from "./skillsReveal.js";
import { initProjectsReveal } from "./projectsReveal.js";
import { initServicesReveal } from "./servicesReveal.js";
import { initSectionsReveal } from "./sectionsReveal.js";

// Force the page to the very top before first paint, with no animation, so a
// refresh always shows the home page instantly (no smooth auto-scroll).
function resetScroll() {
  var root = document.documentElement;
  var prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';   // override smooth so the jump is instant
  window.scrollTo(0, 0);
  root.scrollTop = 0;
  document.body.scrollTop = 0;
  root.style.scrollBehavior = prev;
}
resetScroll();
window.addEventListener('DOMContentLoaded', resetScroll);
window.addEventListener('load', resetScroll);
window.addEventListener('pageshow', function (e) {
  if (e.persisted) {
    resetScroll();
  }
});

menu();
initSmoothHeaderScroll();
initSkillsReveal();
initProjectsReveal();
initServicesReveal();
initSectionsReveal();

hoverChangeExperience(
  ".iot",
  `My focus is on offensive security hardware. I design and build devices based on microcontrollers (like the ESP32) for penetration testing and RF analysis. This includes developing WiFi deauthentication tools, RF jammers, and other custom gear for assessing the security of wireless and IoT systems. I'm passionate about creating tangible solutions that demonstrate real-world vulnerabilities.`,
  "IoT Project",
  "Building hacking devices",
  "Jan 2019 - Jan 2025"
);

hoverChangeExperience(
  ".linux",
  `My journey with Linux has been about getting my hands dirty. I didn't just learn how it works, I learned how to make it work for me. That means building a HIDS to watch its every move and figuring out the right mitigations to stop an attack. For me, knowing Linux deep isn't just understanding the engine. It's about building the security system that protects it.`,
  "linux system hacking",
  "Building linux based tools",
  "Jan 2012 - Jan 2025"
);

hoverChangeExperience(
  ".os",
  `I'm really into understanding Windows. I spend my time writing exploits and figuring out bypass methods, not just to break things but to actually learn how the OS works. This hands-on approach is all about finding and understanding security holes.`,
  "Windows System hacking",
  "Building windows exploit and bypass",
  "Jul 2011 - Jan 2025 "
);

hoverChangeExperience(
  ".network",
  `I build offensive security tools to test for vulnerabilities. My process involves diving deep into network systems to find hidden weaknesses and then building proof-of-concept exploits to bring those flaws to life. This approach demonstrates real-world attack scenarios, transforming theoretical risks into actionable insights for strengthening defenses.`,
  "Network hacking",
  "Exploiting network vulnerabilities",
  "Jan 2013 - Jan 2025"
);

hoverChangeDescription(
  ".icon1",
  "Bash scripting, automation, and command-line workflows for Linux environments."
);
hoverChangeDescription(
  ".icon2",
  "Web application security testing and vulnerability assessment with Burp Suite."
);
hoverChangeDescription(
  ".icon3",
  "Network traffic analysis, packet inspection, and protocol-level troubleshooting."
);
hoverChangeDescription(
  ".icon4",
  "OSINT and link analysis for mapping relationships and gathering intelligence."
);
hoverChangeDescription(
  ".icon5",
  "Embedded systems programming and hardware prototyping with Arduino microcontrollers."
);
hoverChangeDescription(
  ".icon6",
  "Systems programming, reverse engineering, and performance-critical applications."
);
hoverChangeDescription(
  ".icon7",
  "Reverse engineering binaries and analyzing malware with Ghidra SRE framework."
);
hoverChangeDescription(
  ".icon8",
  "Rapid prototyping, automation, tooling, and offensive security scripting."
);
hoverChangeDescription(
  ".icon9",
  "High-performance, modern code editor for efficient development workflows."
);
hoverChangeDescription(
  ".icon10",
  "Windows automation, post-exploitation, and administrative task scripting."
);
