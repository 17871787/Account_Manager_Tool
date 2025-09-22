# The Simon Willison Approach to This Project

*What if we built this like Simon would - pragmatic, explorable, and actually working?*

## The Core Problem

I need to track profitability for dairy accounts. Every Monday, I export CSVs and need to show my boss what's happening. That's it.

## The Simon Solution: Make Data Explorable

### Step 1: SQLite, Not PostgreSQL (5 minutes)

```javascript
// Why PostgreSQL for one user? SQLite is perfect.
import Database from 'better-sqlite3';
const db = new Database('profitability.db');

// That's your entire database setup. Done.
```

### Step 2: Upload CSV, Store It (10 minutes)

```javascript
// app/api/upload/route.js
export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  const csv = await file.text();

  // Parse CSV (using d3-dsv or papaparse)
  const rows = parseCSV(csv);

  // Store in SQLite
  db.exec(`CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY,
    client TEXT,
    revenue REAL,
    costs REAL,
    hours REAL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const insert = db.prepare('INSERT INTO uploads (client, revenue, costs, hours) VALUES (?, ?, ?, ?)');
  for (const row of rows) {
    insert.run(row.client, row.revenue, row.costs, row.hours);
  }

  return Response.json({
    success: true,
    rows: rows.length,
    explore: '/api/explore'
  });
}
```

### Step 3: Make Everything Queryable (15 minutes)

```javascript
// app/api/sql/route.js - The Datasette approach
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || 'SELECT * FROM uploads LIMIT 10';

  // Basic SQL injection protection (in production, use proper parameterization)
  if (query.match(/;|DROP|DELETE|UPDATE|INSERT/i)) {
    return Response.json({ error: 'Read-only queries only' });
  }

  try {
    const results = db.prepare(query).all();
    return Response.json({
      sql: query,
      rows: results,
      count: results.length,
      columns: results[0] ? Object.keys(results[0]) : []
    });
  } catch (error) {
    return Response.json({ error: error.message });
  }
}
```

### Step 4: Simple Explorable UI (20 minutes)

```html
<!-- app/explore/page.js -->
export default function ExplorePage() {
  const [sql, setSql] = useState('SELECT * FROM uploads');
  const [results, setResults] = useState(null);

  const runQuery = async () => {
    const res = await fetch(`/api/sql?q=${encodeURIComponent(sql)}`);
    setResults(await res.json());
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Explore Your Data</h1>

      {/* SQL Input */}
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        style={{ width: '100%', height: '100px' }}
      />
      <button onClick={runQuery}>Run Query</button>

      {/* Common Queries */}
      <div>
        <h3>Quick Queries:</h3>
        <button onClick={() => setSql('SELECT * FROM uploads ORDER BY revenue DESC')}>
          Top Revenue
        </button>
        <button onClick={() => setSql('SELECT client, (revenue - costs) as profit FROM uploads ORDER BY profit DESC')}>
          Most Profitable
        </button>
        <button onClick={() => setSql('SELECT client, revenue/hours as hourly_rate FROM uploads WHERE hours > 0')}>
          Hourly Rates
        </button>
      </div>

      {/* Results Table */}
      {results && (
        <div>
          <h3>Results ({results.count} rows)</h3>
          <table border="1">
            <thead>
              <tr>
                {results.columns?.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.rows?.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## The Debug Page (Simon's Favorite)

```javascript
// app/debug/page.js
export default function DebugPage() {
  const db = new Database('profitability.db');
  const stats = db.prepare('SELECT COUNT(*) as count FROM uploads').get();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

  return (
    <pre>{JSON.stringify({
      environment: process.env.NODE_ENV,
      database: 'SQLite (profitability.db)',
      tables: tables.map(t => t.name),
      totalRows: stats.count,
      lastUpload: new Date().toISOString(),
      diskSize: fs.statSync('profitability.db').size,
      routes: [
        'POST /api/upload - Upload CSV',
        'GET /api/sql?q=... - Run SQL query',
        'GET /api/export - Download SQLite DB',
        'GET /explore - Interactive SQL interface',
        'GET /debug - This page'
      ]
    }, null, 2)}</pre>
  );
}
```

## Progressive Enhancement Dashboard

```javascript
// app/dashboard/page.js - Works without JavaScript!
export default async function Dashboard() {
  const db = new Database('profitability.db');
  const data = db.prepare(`
    SELECT
      client,
      revenue,
      costs,
      (revenue - costs) as profit,
      ROUND((revenue - costs) * 100.0 / revenue, 2) as margin_percent
    FROM uploads
    ORDER BY profit DESC
  `).all();

  return (
    <div>
      <h1>Profitability Dashboard</h1>

      {/* Works without any client-side JS */}
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Revenue</th>
            <th>Costs</th>
            <th>Profit</th>
            <th>Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.client}>
              <td>{row.client}</td>
              <td>${row.revenue}</td>
              <td>${row.costs}</td>
              <td>${row.profit}</td>
              <td>{row.margin_percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Progressive enhancement - charts load if JS is available */}
      <script dangerouslySetInnerHTML={{__html: `
        if (window.Chart) {
          // Add charts here
        }
      `}} />
    </div>
  );
}
```

## The Entire Auth System

```javascript
// middleware.js - Simon wouldn't overcomplicate this
export function middleware(request) {
  const auth = request.headers.get('authorization');

  // Basic auth for simplicity
  if (!auth || auth !== 'Basic ' + btoa('joe:demo2025')) {
    return new Response('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="app"' }
    });
  }
}
```

## Deployment: Just Copy the Files

```bash
# Simon's deployment
scp -r . server:/var/www/profitability-app
ssh server "cd /var/www/profitability-app && npm install && npm run build"

# Or for Vercel (but why?)
git push
```

## The Beautiful Part: Data Portability

```javascript
// app/api/export/route.js
export async function GET() {
  // Just send them the entire database!
  const dbFile = fs.readFileSync('profitability.db');

  return new Response(dbFile, {
    headers: {
      'Content-Type': 'application/x-sqlite3',
      'Content-Disposition': 'attachment; filename="profitability.db"'
    }
  });
}
```

Now anyone can explore your data with:
- SQLite CLI
- DB Browser for SQLite
- Datasette
- Any SQL tool

## Documentation That Matters

```markdown
# How to Use This

1. Upload CSV: `curl -F "file=@data.csv" localhost:3000/api/upload`
2. Query it: `curl "localhost:3000/api/sql?q=SELECT * FROM uploads"`
3. Explore: Visit `/explore` in your browser
4. Export: Download the SQLite file from `/api/export`

## CSV Format
Your CSV needs these columns:
- client: Client name
- revenue: Revenue in dollars
- costs: Costs in dollars
- hours: Hours worked (optional)

## Example Queries

Most profitable clients:
SELECT client, (revenue - costs) as profit
FROM uploads
ORDER BY profit DESC

Margin by client:
SELECT client,
       ROUND((revenue - costs) * 100.0 / revenue, 2) as margin
FROM uploads
WHERE revenue > 0

## Why SQLite?

1. Zero configuration
2. Entire database in one file
3. Can email it, version control it, back it up easily
4. Works everywhere
5. Fast enough for millions of rows
6. Perfect for single-user apps
```

## Simon's Development Philosophy Applied

### 1. Start with the Data
Get the data in, make it queryable, worry about UI later.

### 2. Everything is Explorable
Don't hide the data behind APIs. Let users run SQL directly.

### 3. Progressive Enhancement
Basic HTML tables first, fancy charts only if JavaScript loads.

### 4. Document by Doing
The debug page IS the documentation.

### 5. Data Portability
Users own their data. They can export the entire database.

### 6. Keep It Simple
- No user accounts (just basic auth)
- No complex state management
- No build pipeline if possible
- SQLite over PostgreSQL
- Server-rendered over SPA when possible

## The 1-Hour Version

If you only had 1 hour, build just these three files:

```javascript
// 1. upload.js - Store CSV in SQLite
// 2. query.js - Run SQL queries
// 3. index.html - Table of results
```

Everything else is enhancement.

## What We Should Delete

Looking at our current codebase through Simon's lens:

### Delete:
- [ ] PostgreSQL configuration
- [ ] JWT authentication
- [ ] Session management
- [ ] Complex middleware
- [ ] Most of the test suite
- [ ] Memory optimization code
- [ ] Dual API architecture debates

### Keep:
- [x] CSV parsing
- [x] Basic calculations
- [x] Simple charts
- [x] Vercel hosting (it works)

### Add:
- [x] SQLite database
- [x] SQL query endpoint
- [x] Data export
- [x] Debug page
- [x] Query interface

## The Result

Instead of 10,000 lines of complex enterprise architecture, you get:
- ~500 lines of code
- Everything queryable
- Data portable
- Actually working
- Could rebuild from scratch in an afternoon

## Try It Now

```bash
# Install SQLite
npm install better-sqlite3

# Create the upload endpoint
# Create the query endpoint
# Create the explore page
# Upload your CSV
# Start exploring

# Total time: ~1 hour
```

---

*This is how Simon Willison would build it. Not perfect, but working. Not enterprise, but explorable. Not complex, but comprehensible.*

**The Simon Test**: Can you understand the entire system in 10 minutes? Can you query any data you want? Can you take your data and leave? If yes, you're done.