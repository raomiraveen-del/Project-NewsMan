const Parser = require('rss-parser');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/bot.db');

// ============================================================
// 1. ULTRA-STRICT KEYWORD LIST (NO product names – only safety/recall/regulatory)
// ============================================================
const masterKeywords = [
    // Core safety & recall
    'food safety', 'food recall', 'recall', 'withdrawn', 'not to consume', 'warning', 'alert', 'advisory',
    'contamination', 'poisoning', 'outbreak', 'superbug', 'amr', 'antimicrobial resistance',
    'hygiene', 'sanitation', 'food poisoning', 'keselamatan makanan', 'penarikan balik produk',
    'keracunan makanan', 'pencemaran', 'wabak', 'kuman kebal',
    // Regulatory bodies & documents
    'jakim', 'npra', 'moh', 'ministry of health', 'fsqd', 'mesti', 'halal certification', 'sijil halal',
    'regulation', 'amendment', 'standard', 'codex', 'gmp', 'haccp', 'iso 22000', 'akta makanan',
    'peraturan makanan', 'pensijilan', 'permit import', 'permit export', 'food act 1983',
    'food regulations 1985', 'perintah makanan', 'undang-undang', 'pihak berkuasa', 'kementerian kesihatan',
    'bahagian keselamatan makanan', 'majlis keselamatan makanan', 'codex alimentarius', 'ms 1500',
    'sijil analisis', 'coa', 'spm', 'myhalal', 'myhalalingredients',
    // Specific hazards (only dangerous substances, not general food items)
    'salmonella', 'listeria', 'e. coli', 'aflatoxin', 'heavy metal', 'lead', 'mercury', 'cadmium',
    'arsenic', 'pesticide', 'herbicide', 'fungicide', 'melamine', 'plasticizer', 'phthalate', 'bpa',
    'acrylamide', 'dioxin', 'pcb', 'gluten', 'lactose', 'sulphite', 'msg', 'benzoate', 'sorbate',
    'nitrite', 'nitrate', 'campylobacter', 'norovirus', 'hepatitis a',
    // Enforcement & compliance
    'seizure', 'rampasan', 'stop sale', 'larangan', 'not to eat', 'do not consume', 'kesan kesihatan',
    'risiko kesihatan', 'recall list', 'withdrawal list', 'traceability', 'batch recall',
    'expiry date violation', 'cold chain breach', 'cross contamination', 'foreign body', 'metal shard',
    'haccp plan', 'prerequisite program', 'prp', 'oprp', 'ccp', 'critical control point',
    'good manufacturing practice', 'sanitation standard operating procedure', 'ssop',
    'certification', 'license', 'permit', 'illegal', 'unregistered', 'unapproved', 'false claim',
    'export restriction', 'import ban', 'embargo', 'raw material safety', 'ingredient alert',
    'supplier violation', 'procurement issue', 'shortage', 'smes', 'manufacturer recall',
    'production halt', 'processing violation'
    // No generic product names (oil, milk, meat, fish, seafood, dairy, fruit, vegetable, etc.)
];

// ============================================================
// 2. SOURCES – 6 working, legally sound feeds
// ============================================================
const sources = [
    {
        name: 'Google News - Food Safety',
        url: 'https://news.google.com/rss/search?q=malaysia+food+safety&hl=en-MY&gl=MY&ceid=MY:en',
        category: 'news',
        useKeywordFilter: false   // already targeted
    },
    {
        name: 'Google News - Food Recall',
        url: 'https://news.google.com/rss/search?q=malaysia+food+recall&hl=en-MY&gl=MY&ceid=MY:en',
        category: 'alerts',
        useKeywordFilter: false
    },
    {
        name: 'Google News - Halal Food',
        url: 'https://news.google.com/rss/search?q=malaysia+halal+food+safety&hl=en-MY&gl=MY&ceid=MY:en',
        category: 'regulations',
        useKeywordFilter: false
    },
    {
        name: 'Malay Mail',
        url: 'https://www.malaymail.com/feed/rss/malaysia',
        category: 'news',
        useKeywordFilter: true
    },
    {
        name: 'Bernama (English)',
        url: 'https://www.bernama.com/en/rssfeed.php',
        category: 'news',
        useKeywordFilter: true
    },
    {
        name: 'Free Malaysia Today (FMT)',
        url: 'https://www.freemalaysiatoday.com/feed/',
        category: 'news',
        useKeywordFilter: true
    },
    {
        name: 'Google News - The Star (filtered)',
        url: 'https://news.google.com/rss/search?q=site:thestar.com.my+food+safety&hl=en-MY&gl=MY&ceid=MY:en',
        category: 'news',
        useKeywordFilter: true
    }
];

// ============================================================
// 3. HELPER: keyword matching
// ============================================================
function matchesAnyKeyword(title) {
    const lowerTitle = title.toLowerCase();
    return masterKeywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()));
}

// ============================================================
// 4. SCRAPE FUNCTION
// ============================================================
async function scrapeSource(db, source, sourceId) {
    console.log(`\n📡 Fetching: ${source.name}`);
    try {
        const parser = new Parser({
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const feed = await parser.parseURL(source.url);
        console.log(`   Found ${feed.items.length} articles`);

        let inserted = 0;
        for (const item of feed.items.slice(0, 20)) {
            if (source.useKeywordFilter && !matchesAnyKeyword(item.title)) {
                console.log(`   ⏭️ Skipped (no keyword): ${item.title.substring(0, 50)}...`);
                continue;
            }
            const existing = db.prepare('SELECT id FROM articles WHERE url = ?').get(item.link);
            if (existing) {
                console.log(`   ⏭️ Duplicate: ${item.title.substring(0, 50)}...`);
                continue;
            }
            const insert = db.prepare(`
                INSERT INTO articles (source_id, country, url, title, content_text, excerpt, published_at, status, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            insert.run(
                sourceId,
                'MY',
                item.link,
                item.title,
                item.contentSnippet || '',
                item.contentSnippet || '',
                item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                'scraped',
                source.category
            );
            inserted++;
            console.log(`   ✅ Inserted: ${item.title.substring(0, 60)}...`);
        }
        console.log(`   Inserted ${inserted} new relevant articles from ${source.name}`);
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
    }
}

// ============================================================
// 5. MAIN
// ============================================================
async function scrapeAll() {
    const db = new Database(DB_PATH);
    console.log('🇲🇾 Malaysia Food‑Safety Scraper (6 sources, zero‑noise filter)\n');

    for (const src of sources) {
        let sourceRow = db.prepare('SELECT id FROM sources WHERE name = ?').get(src.name);
        if (!sourceRow) {
            const insertSource = db.prepare(`
                INSERT INTO sources (name, country, type, active, created_at)
                VALUES (?, 'MY', 'rss', 1, datetime('now'))
            `);
            insertSource.run(src.name);
            sourceRow = db.prepare('SELECT id FROM sources WHERE name = ?').get(src.name);
        }
        const sourceId = sourceRow.id;
        await scrapeSource(db, src, sourceId);
    }

    db.close();
    console.log('\n🎉 All 6 sources processed. Only strict food‑safety, recall, halal, regulatory articles kept.');
}

scrapeAll().catch(console.error);