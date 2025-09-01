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

hoverChangeDescription(
  ".icon1",
  "Bash is a Unix shell and command language written by Brian Fox for the GNU Project as a free software replacement for the Bourne shell. First released in 1989, it has been used as the default login shell for most Linux distributions. Bash was one of the first programs Linus Torvalds ported to Linux, alongside GCC."
);
hoverChangeDescription(
  ".icon2",
  "Burp or Burp Suite is a graphical tool for testing Web application security. The tool is written in Java and developed by PortSwigger Security."
);
hoverChangeDescription(
  ".icon3",
  "Wireshark is a free and open-source packet analyzer. It is used for network troubleshooting, analysis, software and communications protocol development, and education. Originally named Ethereal, the project was renamed Wireshark in May 2006 due to trademark issues."
);
hoverChangeDescription(
  ".icon4",
  "Maltego is a software used for open-source intelligence and forensics, developed by Paterva from Pretoria, South Africa. Maltego focuses on providing a library of transforms for discovery of data from open sources, and visualizing that information in a graph format”"
);
hoverChangeDescription(
  ".icon5",
  "The Arduino Integrated Development Environment is a cross-platform application that is written in functions from C and C++. It is used to write and upload programs to Arduino compatible boards, but also, with the help of third-party cores, other vendor development boards."
);
hoverChangeDescription(
  ".icon6",
  "C++ is a high-level general-purpose programming language created by Danish computer scientist Bjarne Stroustrup as an extension of the C programming language, or C with Classes. The language has expanded significantly over time, and modern C++ now has object-oriented, generic, and functional features in addition to facilities for low-level memory manipulation."
);
hoverChangeDescription(
  ".icon7",
  "Ghidra is a free and open source reverse engineering tool developed by the National Security Agency of the United States. The binaries were released at RSA Conference in March 2019; the sources were published one month later on GitHub. Ghidra is seen by many security researchers as a competitor to IDA Pro."
);
hoverChangeDescription(
  ".icon8",
  "Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically-typed and garbage-collected. It supports multiple programming paradigms, including structured, object-oriented and functional programming."
);
