# Malaysia Food Safety Scraper (Standalone)

## Purpose
Collects food safety, recall, halal, and regulatory news from 6 Malaysian RSS/Google News feeds.  
Inserts articles into the main bot's SQLite database (`../data/bot.db`).  
Deduplicates automatically. Filters out irrelevant news using a strict keyword list.

## Sources
1. Google News – Food Safety (targeted)
2. Google News – Food Recall
3. Google News – Halal Food
4. Malay Mail (keyword‑filtered)
5. Bernama English (keyword‑filtered)
6. Free Malaysia Today (keyword‑filtered)
7. Google News – The Star (keyword‑filtered)

## Requirements
- Node.js installed
- The main bot's `data/bot.db` must exist (the scraper will create it if missing)
- Run from inside the `Project-NewsMan-main` folder (this folder should be placed as a subfolder there)

## How to run
```bash
cd Project-NewsMan-main/miraveen-malaysia-scraper
node scrape.js