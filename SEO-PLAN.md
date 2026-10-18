# Micronode SEO plan: search intent first

Goal: be found by the right people (engineers and companies who need what we sell), not just more traffic.

## Who we want, what they type, which page answers it

| Audience | What they are really trying to do | Typical searches | Page that answers it today | Gap |
|---|---|---|---|---|
| Engineers / makers using the Nuvoton MG51 | Find a board so they don't solder a TSSOP-20 chip | mg51 ic, mg51fb9ae, nuvoton mg51 dev board, 8051 dev board india | product-mg51.html, FAQ | Needs outside links (GitHub, forums, video) |
| Machine builders, OEMs, makers needing a display + buttons | Find a ready HMI / counter display | hmi display module, production counter display, 6 digit 7 segment display with buttons | product-tm1637.html, FAQ | Needs outside links and a demo video |
| Companies that need a product designed | Hire an engineering partner in Pune | embedded product design company pune, pcb design services pune, firmware development company pune, edge ai product development | index.html only | No dedicated page per service. One page can't rank for all of these |
| Startups wanting their own branded board | White-label / OEM hardware | white label dev board india, custom embedded board oem | Mentioned on home and FAQ only | No page that answers it |

## What the data should drive (Google Search Console, check monthly)

1. Performance > Queries: which searches already show us? Any we want but don't appear for?
2. For each page: impressions vs clicks. High impressions, low clicks means the title/description needs work.
3. Pages report: is every page "Indexed"? Fix any that are not.
4. Look at the queries that bring people who contact us (Lead Feeder is already installed), and write more for those.
5. Ignore raw traffic. Count enquiries and product orders.

## Next content, in priority order

1. One page per service (PCB design, firmware development, Edge AI / product engineering), each answering: what you get, how long it takes, a past example, a clear "Start a project" button.
2. A white-label / custom board page for startups.
3. A short "which dev board for which job" article (8051 projects: LED drivers, motor control, appliances).
4. Outside links and a demo video for both boards (see the to-do list).

## Search term to page (kept in backend files, not shown on the site)

| If someone searches | The page that ranks |
|---|---|
| "MG51", "Nuvoton 8051 board", "MG51 development board" | MG51 page. The part name is in the title, headline, specs and image alt text. |
| "TM1637 display module", "7 segment display with buttons" | TM1637 page |
| "simple HMI", "counter display", "timer display module" | TM1637 page, through its structured FAQ ("Can I use it as an HMI?") and its application keywords |
| "white label electronics", "sell under my brand", "OEM board supply" | white-label.html and the White-label group on faq.html |

Backend files that carry this: sitemap.xml, llms.txt, the JSON-LD blocks and meta keywords in each page head.

## The five services (backend only, by decision)

Electronics Hardware Design and Development; Embedded Systems Design and Development; IoT and IoMT Systems Design and Development;
Firmware Development; Industrial Design. These are NOT shown as pages on the website. They live in backend files only:
- llms.txt and llms-full.txt (full detail for AI assistants)
- the Organization data in index.html: knowsAbout list and hasOfferCatalog (five Service offers, no page links)
If service pages are wanted later, they were built once and can be rebuilt: one page per service plus a hub.

## MG51 blog article backlog (backend planning only, by decision 2026-10-06)

The user supplied this list of candidate article headlines and their target searches. They are kept here as a
content backlog for when articles are written, and their keywords have already been folded into
product-mg51.html's meta keywords and Product JSON-LD `keywords` field (backend, not visible on the page) so
the terms have some presence even before an article exists.

| Headline | What people search | Status |
|---|---|---|
| Nuvoton MG51FB9AE Pinout and Pin Functions, Explained | "mg51fb9ae pinout", "mg51 datasheet" | Not published |
| How to Program the Nuvoton MG51 with SDCC (Free Toolchain) | "mg51 sdcc", "program nuvoton 8051" | Not published |
| **Nuvoton MG51 vs N76E003: Which 8051 to Use in 2026** (highest priority — N76E003 is Nuvoton's best-known 8051 in India; readers searching for it are the most likely to switch to the MG51 once the comparison is explained) | "n76e003 alternative", "mg51 vs n76e003" | Not published |
| MG51 GPIO, Timer and Interrupt Examples in C | "8051 timer interrupt example" | Not published |
| MG51 ADC Example: Reading a Sensor | "mg51 adc example" | Not published |
| MG51 UART Example: Printing to the PC | "8051 uart example sdcc" | Not published |
| Nu-Link Programmer Setup for MG51 | "nu-link mg51", "nuvoton icp programmer" | Not published |
| Best 8051 Development Board in India | "8051 development board india" | Not published |
| Replacing STM8 or PIC with a Low-Cost 8051 | "stm8 alternative", "cheap mcu for production" | **Published 2026-10-08** as `blog/legacy-pic-stm8-8051-to-mg51.html`, byline Rishikesh Das (Co-founder & CTO) |

When the rest are written: publish from `blog/_post-template.html`, link each from the MG51 product page where
relevant (e.g. the N76E003 article from the FAQ's STM8/PIC question — the published PIC/STM8 article is already
linked from product-mg51.html's downloads list), and add each to `sitemap.xml`.
