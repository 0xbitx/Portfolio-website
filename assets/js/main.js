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
  `IoT devices are small computers, usually running Linux, that are performing a certain function. Like any other internet/ cloud connected device these can be hacked. What’s worse, is that most devices lack proper UI and come with default passwords that make it easy for people from remote to hack them.`,
  "IoT hacking",
  "Weak authentication",
  "Jan 2019 - Dec 2023"
);

hoverChangeExperience(
  ".zuplae",
  `Kernel is a program, in short. It’s the root of all the operating systems all over the world. No matter what operating system you’re using, there’s always a kernel working from the root level to make everything function as it was meant to be. It’s the most fundamental part of any OS.`,
  "Kernel hacking",
  "SCI exploit",
  "Jan 2019 - Dec 2023"
);

hoverChangeExperience(
  ".codigofontetv",
  `Bluetooth hacking is a technique used to get information from another Bluetooth enabled device without any permissions from the host. This event takes place due to security flaws in Bluetooth technology. Bluetooth hacking is not limited to cell phones, but is also used to hack laptops, mobiles and desktop computers.`,
  "Bluetooth hacking",
  "Invalid Req",
  "Jan 2020 - Jan 2023"
);

hoverChangeExperience(
  ".contweb",
  `System hacking is defined as the compromise between computer systems and software to access the target computer and steal or misuse their sensitive information. The malware and the attacker identify and exploit the vulnerability of the computer system to gain unauthorized access.`,
  "System hacking",
  "WinExP",
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
