import { initScrollReveal } from "./scrollReveal.js";
import { hoverChangeExperience } from "./hoverChangeExperience.js";
import { typeWrite } from "./typeWrite.js";
import { hoverChangeDescription } from "./hoverChangeDescription.js";
import { menu } from "./menu.js";

menu();
initScrollReveal();
typeWrite(document.querySelector(".typewriter"));

hoverChangeExperience(
  ".iot",
  `My focus is on offensive security hardware. I design and build devices based on microcontrollers (like the ESP32) for penetration testing and RF analysis. This includes developing WiFi deauthentication tools, RF jammers, and other custom gear for assessing the security of wireless and IoT systems. I'm passionate about creating tangible solutions that demonstrate real-world vulnerabilities.`,
  "IoT Project",
  "Building hacking devices",
  "Jan 2019 - Jan 2025"
);

hoverChangeExperience(
  ".linux",
  `My journey with the Linux system has been about getting my hands dirty. I didn't just learn how it works; I learned how to make it work for me. That means I can build a HIDS to watch its every move and engineer the precise mitigations to counter an attack. For me, deep Linux knowledge isn't just about understanding the engine—it's about being able to build the security system that protects it.`,
  "linux system hacking",
  "Building linux based tools",
  "Jan 2012 - Jan 2025"
);

hoverChangeExperience(
  ".os",
  `I'm passionate about truly understanding the Windows OS. I spend my time crafting exploits and designing bypass methods—not just to challenge the system, but to really learn how it works. This hands-on approach is focused on finding and understanding security weaknesses.`,
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
