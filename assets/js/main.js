import { initScrollReveal } from "./scrollReveal.js";
import { hoverChangeExperience } from "./hoverChangeExperience.js";
import { typeWrite } from "./typeWrite.js";
import { hoverChangeDescription } from "./hoverChangeDescription.js";
import { menu } from "./menu.js";

menu();
initScrollReveal();
typeWrite(document.querySelector(".typewriter"));

hoverChangeExperience(
  ".digitalhouse",
  `Steeped in the realm of IoT hacking, my experience revolves around crafting innovative solutions for interconnected devices. From devising security measures to navigating the intricacies of smart systems, my journey is marked by a passion for ethical hacking in the dynamic landscape of IoT technology.`,
  "IoT hacking",
  "Building hacking device",
  "Jan 2019 - Dec 2023"
);

hoverChangeExperience(
  ".zuplae",
  `In my Linux kernel experience, I've delved into the core of operating system functionality. From kernel customization to driver development, I've honed my skills in optimizing system performance and resolving intricate issues. This journey has equipped me with a deep understanding of the intricate workings of the Linux kernel, empowering me to navigate and contribute to the heart of open-source computing.`,
  "Kernel hacking",
  "Reverse engineering Linux kernel malware",
  "Jan 2019 - Dec 2023"
);

hoverChangeExperience(
  ".codigofontetv",
  `In the domain of network hacking, I've honed my skills in ethical hacking and penetration testing. From identifying vulnerabilities to implementing robust security measures, my experience revolves around ensuring the resilience of networks. I've navigated the intricacies of cybersecurity, employing advanced techniques to uncover and address potential threats, contributing to a fortified and secure network infrastructure.`,
  "Network hacking",
  "Exploiting network vulnerabilities",
  "Jan 2020 - Jan 2023"
);

hoverChangeExperience(
  ".contweb",
  `Specializing in crafting Windows exploits and bypass techniques, I am immersed in the world of Windows operating systems. My expertise extends from enhancing system performance to implementing robust security measures, reflecting my passion for navigating the dynamic landscape of Windows OS technology.`,
  "System hacking",
  "Building windows exploit and bypass",
  "Jan 2019 - Nov 2023 "
);

hoverChangeDescription(
  ".html",
  "Bash is a Unix shell and command language written by Brian Fox for the GNU Project as a free software replacement for the Bourne shell. First released in 1989, it has been used as the default login shell for most Linux distributions. Bash was one of the first programs Linus Torvalds ported to Linux, alongside GCC."
);
hoverChangeDescription(
  ".css",
  "Burp or Burp Suite is a graphical tool for testing Web application security. The tool is written in Java and developed by PortSwigger Security."
);
hoverChangeDescription(
  ".js",
  "Wireshark is a free and open-source packet analyzer. It is used for network troubleshooting, analysis, software and communications protocol development, and education. Originally named Ethereal, the project was renamed Wireshark in May 2006 due to trademark issues."
);
hoverChangeDescription(
  ".sass",
  "Maltego is a software used for open-source intelligence and forensics, developed by Paterva from Pretoria, South Africa. Maltego focuses on providing a library of transforms for discovery of data from open sources, and visualizing that information in a graph format”"
);
hoverChangeDescription(
  ".react",
  "The Arduino Integrated Development Environment is a cross-platform application that is written in functions from C and C++. It is used to write and upload programs to Arduino compatible boards, but also, with the help of third-party cores, other vendor development boards."
);
hoverChangeDescription(
  ".next",
  "C++ is a high-level general-purpose programming language created by Danish computer scientist Bjarne Stroustrup as an extension of the C programming language, or C with Classes. The language has expanded significantly over time, and modern C++ now has object-oriented, generic, and functional features in addition to facilities for low-level memory manipulation."
);
hoverChangeDescription(
  ".styled",
  "Ghidra is a free and open source reverse engineering tool developed by the National Security Agency of the United States. The binaries were released at RSA Conference in March 2019; the sources were published one month later on GitHub. Ghidra is seen by many security researchers as a competitor to IDA Pro."
);
hoverChangeDescription(
  ".tailwind",
  "Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically-typed and garbage-collected. It supports multiple programming paradigms, including structured, object-oriented and functional programming."
);
