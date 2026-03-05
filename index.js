const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dbPath = path.join(__dirname, 'eaccountability.db');
const db = new sqlite3.Database(dbPath);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function initDb() {
    await run(`
        CREATE TABLE IF NOT EXISTS budget_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department TEXT NOT NULL,
            program TEXT NOT NULL,
            current_allocation REAL NOT NULL,
            requested_change REAL NOT NULL,
            effective_date TEXT NOT NULL,
            priority TEXT NOT NULL,
            justification TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS procurement_intakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT NOT NULL,
            vendor TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            deadline TEXT NOT NULL,
            status TEXT NOT NULL,
            scope TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS audit_incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reported_by TEXT NOT NULL,
            area TEXT NOT NULL,
            severity TEXT NOT NULL,
            date_observed TEXT NOT NULL,
            details TEXT NOT NULL,
            actions TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS compliance_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id TEXT NOT NULL,
            lead_reviewer TEXT NOT NULL,
            unit_name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            risk_rating TEXT NOT NULL,
            controls_json TEXT NOT NULL,
            findings TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            evidence_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS news_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            published_on TEXT NOT NULL,
            source_url TEXT,
            image_url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const newsColumns = await all(`PRAGMA table_info(news_posts)`);
    if (!newsColumns.some((column) => column.name === 'image_url')) {
        await run(`ALTER TABLE news_posts ADD COLUMN image_url TEXT`);
    }

    const newsCount = await get('SELECT COUNT(*) AS count FROM news_posts');
    if (!newsCount || newsCount.count === 0) {
        await run(
            `INSERT INTO news_posts (title, category, summary, content, author, published_on, source_url, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'Quarterly Accountability Review Published',
                'Policy Update',
                'Agency-wide spending and compliance indicators were published for Q2.',
                'The publication includes budget utilization, procurement cycle health, and audit issue status for public review.',
                'eAccountability Editorial',
                '2026-03-05',
                '',
                'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80'
            ]
        );
    }

    await run(
        `UPDATE news_posts
         SET image_url = ?
         WHERE image_url IS NULL OR TRIM(image_url) = ''`,
        ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80']
    );

    const budgetCount = await get('SELECT COUNT(*) AS count FROM budget_adjustments');
    if (!budgetCount || budgetCount.count === 0) {
        await run(
            `INSERT INTO budget_adjustments
             (department, program, current_allocation, requested_change, effective_date, priority, justification)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['Finance Operations', 'Infrastructure', 4500000, 3400000, '2026-02-01', 'High', 'Bridge rehabilitation acceleration.']
        );
        await run(
            `INSERT INTO budget_adjustments
             (department, program, current_allocation, requested_change, effective_date, priority, justification)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['Community Services', 'Local Health Outreach', 1800000, 1400000, '2026-02-08', 'Medium', 'Expand district clinic operations.']
        );
        await run(
            `INSERT INTO budget_adjustments
             (department, program, current_allocation, requested_change, effective_date, priority, justification)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['Digital Office', 'Records Modernization', 1200000, 950000, '2026-02-14', 'Low', 'Digitize legacy accountability records.']
        );
    }

    const procurementCount = await get('SELECT COUNT(*) AS count FROM procurement_intakes');
    if (!procurementCount || procurementCount.count === 0) {
        await run(
            `INSERT INTO procurement_intakes
             (request_id, vendor, category, amount, deadline, status, scope)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['PR-2301', 'Vertex Systems', 'IT Services', 860000, '2026-03-20', 'Evaluation', 'Cloud migration for agency reporting platform.']
        );
        await run(
            `INSERT INTO procurement_intakes
             (request_id, vendor, category, amount, deadline, status, scope)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['PR-2307', 'Northern Build Corp', 'Public Works', 1420000, '2026-02-22', 'Bid Open', 'District bridge reinforcement package.']
        );
        await run(
            `INSERT INTO procurement_intakes
             (request_id, vendor, category, amount, deadline, status, scope)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['PR-2315', 'CleanGrid Logistics', 'Operations', 470000, '2026-03-11', 'Approved', 'Fleet routing optimization services.']
        );
    }

    const auditCount = await get('SELECT COUNT(*) AS count FROM audit_incidents');
    if (!auditCount || auditCount.count === 0) {
        await run(
            `INSERT INTO audit_incidents
             (reported_by, area, severity, date_observed, details, actions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['auditor@agency.gov', 'Procurement', 'High', '2026-02-25', 'Bid committee approval notes were incomplete for PR-2307.', 'Revalidation assigned to procurement lead.']
        );
        await run(
            `INSERT INTO audit_incidents
             (reported_by, area, severity, date_observed, details, actions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['compliance@agency.gov', 'Budget Transparency', 'Medium', '2026-02-27', 'Two budget lines were posted without narrative annotations.', 'Department heads requested to add missing context.']
        );
        await run(
            `INSERT INTO audit_incidents
             (reported_by, area, severity, date_observed, details, actions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['system', 'Documentation', 'Critical', '2026-03-01', 'Archive snapshot failed for one oversight document set.', 'Manual backup completed; auto-job scheduled for fix.']
        );
    }

    const complianceCount = await get('SELECT COUNT(*) AS count FROM compliance_reviews');
    if (!complianceCount || complianceCount.count === 0) {
        await run(
            `INSERT INTO compliance_reviews
             (review_id, lead_reviewer, unit_name, start_date, end_date, risk_rating, controls_json, findings, recommendations, evidence_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'CR-2026-031',
                'A. Mendoza',
                'Procurement Office - Region R-3',
                '2026-02-01',
                '2026-02-28',
                'High',
                JSON.stringify(['segregation', 'authorization', 'auditTrail']),
                'Escalation pathway for high-value bids lacked dual-review signatures.',
                'Implement mandatory dual-review gate before award recommendation.',
                'compliance-review-evidence.pdf'
            ]
        );
    }
}

function safeNum(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

app.post('/api/forms/budget-adjustment', async (req, res) => {
    try {
        const {
            department,
            program,
            currentAllocation,
            requestedChange,
            effectiveDate,
            priority,
            justification
        } = req.body;
        await run(
            `INSERT INTO budget_adjustments
             (department, program, current_allocation, requested_change, effective_date, priority, justification)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                department || '',
                program || '',
                safeNum(currentAllocation),
                safeNum(requestedChange),
                effectiveDate || '',
                priority || '',
                justification || ''
            ]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.post('/api/forms/procurement-intake', async (req, res) => {
    try {
        const { requestId, vendor, category, amount, deadline, status, scope } = req.body;
        await run(
            `INSERT INTO procurement_intakes
             (request_id, vendor, category, amount, deadline, status, scope)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [requestId || '', vendor || '', category || '', safeNum(amount), deadline || '', status || '', scope || '']
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.post('/api/forms/audit-incident', async (req, res) => {
    try {
        const { reportedBy, area, severity, dateObserved, details, actions } = req.body;
        await run(
            `INSERT INTO audit_incidents
             (reported_by, area, severity, date_observed, details, actions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reportedBy || '', area || '', severity || '', dateObserved || '', details || '', actions || '']
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.post('/api/forms/compliance-review', async (req, res) => {
    try {
        const {
            reviewId,
            leadReviewer,
            unit,
            startDate,
            endDate,
            riskRating,
            controls,
            findings,
            recommendations,
            evidenceName
        } = req.body;
        const controlsList = Array.isArray(controls) ? controls : controls ? [controls] : [];
        await run(
            `INSERT INTO compliance_reviews
             (review_id, lead_reviewer, unit_name, start_date, end_date, risk_rating, controls_json, findings, recommendations, evidence_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reviewId || '',
                leadReviewer || '',
                unit || '',
                startDate || '',
                endDate || '',
                riskRating || '',
                JSON.stringify(controlsList),
                findings || '',
                recommendations || '',
                evidenceName || ''
            ]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.post('/api/forms/news-post', async (req, res) => {
    try {
        const { title, category, summary, content, author, publishedOn, sourceUrl, imageUrl } = req.body;
        await run(
            `INSERT INTO news_posts
             (title, category, summary, content, author, published_on, source_url, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title || '',
                category || 'General',
                summary || '',
                content || '',
                author || 'Anonymous',
                publishedOn || '',
                sourceUrl || '',
                imageUrl || ''
            ]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.get('/api/budget-transparency', async (_req, res) => {
    try {
        const rows = await all(
            `SELECT id, department, program, current_allocation, requested_change, effective_date, priority, created_at
             FROM budget_adjustments
             ORDER BY id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/procurement-tracker', async (_req, res) => {
    try {
        const rows = await all(
            `SELECT id, request_id, vendor, category, amount, deadline, status, scope, created_at
             FROM procurement_intakes
             ORDER BY id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/audit-logs', async (_req, res) => {
    try {
        const incidents = await all(
            `SELECT id, date_observed AS event_date, reported_by AS actor, details AS action, area AS scope, severity AS result
             FROM audit_incidents`
        );
        const reviews = await all(
            `SELECT id + 100000 AS id, end_date AS event_date, lead_reviewer AS actor, findings AS action, unit_name AS scope, risk_rating AS result
             FROM compliance_reviews`
        );
        const rows = [...incidents, ...reviews]
            .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)));
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/alert-notifications', async (_req, res) => {
    try {
        const highIncidents = await all(
            `SELECT details, reported_by, severity, date_observed
             FROM audit_incidents
             WHERE severity IN ('High', 'Critical')
             ORDER BY id DESC
             LIMIT 12`
        );
        const overdueProcurements = await all(
            `SELECT request_id, vendor, status, deadline
             FROM procurement_intakes
             WHERE deadline < date('now') AND status != 'Approved'
             ORDER BY id DESC
             LIMIT 12`
        );

        const alerts = [
            ...highIncidents.map((item) => ({
                priority: item.severity === 'Critical' ? 'High' : 'Medium',
                alert: item.details,
                owner: item.reported_by,
                status: `Observed ${item.date_observed}`
            })),
            ...overdueProcurements.map((item) => ({
                priority: 'Medium',
                alert: `${item.request_id} (${item.vendor}) is overdue.`,
                owner: 'Procurement Office',
                status: item.status
            }))
        ];

        const severity = {
            active: alerts.length,
            investigating: highIncidents.length,
            high: alerts.filter((a) => a.priority === 'High').length,
            resolved: 0
        };

        res.json({ severity, alerts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/news', async (_req, res) => {
    try {
        const rows = await all(
            `SELECT id, title, category, summary, content, author, published_on, source_url, image_url
             FROM news_posts
             ORDER BY published_on DESC, id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await get(
            `SELECT id, title, category, summary, content, author, published_on, source_url, image_url
             FROM news_posts
             WHERE id = ?`,
            [id]
        );
        if (!row) return res.status(404).json({ error: 'Post not found' });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard', async (_req, res) => {
    try {
        const budgetRows = await all(
            `SELECT current_allocation, requested_change, effective_date, priority FROM budget_adjustments ORDER BY id DESC`
        );
        const procurementRows = await all(
            `SELECT amount, status, deadline FROM procurement_intakes ORDER BY id DESC`
        );
        const auditRows = await all(
            `SELECT severity, details, area, actions, reported_by, date_observed FROM audit_incidents ORDER BY id DESC`
        );
        const complianceRows = await all(
            `SELECT review_id, lead_reviewer, risk_rating, recommendations, findings FROM compliance_reviews ORDER BY id DESC`
        );

        const pv = budgetRows.reduce((sum, row) => sum + safeNum(row.current_allocation), 0);
        const ev = budgetRows.reduce((sum, row) => sum + safeNum(row.requested_change), 0);
        const ac = procurementRows.reduce((sum, row) => sum + safeNum(row.amount), 0);

        const cpi = ac > 0 ? ev / ac : 0;
        const spi = pv > 0 ? ev / pv : 0;
        const highRiskCount = auditRows.filter((row) => row.severity === 'High' || row.severity === 'Critical').length;
        const activeProjects = procurementRows.length;

        const riskItemsFromAudits = auditRows.slice(0, 4).map((row) => ({
            description: row.details,
            likelihood: row.severity,
            mitigation: row.actions || 'Pending mitigation plan',
            responsible: row.reported_by || 'Unassigned'
        }));

        const riskItemsFromReviews = complianceRows.slice(0, 4).map((row) => ({
            description: row.findings,
            likelihood: row.risk_rating,
            mitigation: row.recommendations,
            responsible: row.lead_reviewer
        }));

        const riskItems = [...riskItemsFromAudits, ...riskItemsFromReviews].slice(0, 8);

        let ragStatus = 'Green';
        if (cpi < 0.9 || spi < 0.9 || highRiskCount > 3) ragStatus = 'Amber';
        if (cpi < 0.75 || spi < 0.75 || highRiskCount > 6) ragStatus = 'Red';

        const points = ['W1', 'W2', 'W3', 'W4'];
        const chart = points.map((label, idx) => ({
            label,
            pv: Math.max(0, pv * (0.35 + idx * 0.18)),
            ev: Math.max(0, ev * (0.28 + idx * 0.2)),
            ac: Math.max(0, ac * (0.3 + idx * 0.19))
        }));

        res.json({
            kpis: {
                totalBudget: pv,
                earnedValue: ev,
                actualCost: ac,
                activeProjects,
                highRiskCount
            },
            chart,
            indicators: {
                cpi,
                spi
            },
            riskItems,
            ragStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard-overview', async (_req, res) => {
    try {
        const budget = await get(
            `SELECT
                COALESCE(SUM(current_allocation), 0) AS total_allocation,
                COALESCE(SUM(requested_change), 0) AS total_requested,
                COUNT(*) AS adjustment_count
             FROM budget_adjustments`
        );
        const procurement = await get(
            `SELECT
                COUNT(*) AS total_projects,
                SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_projects,
                SUM(CASE WHEN status != 'Approved' AND deadline < date('now') THEN 1 ELSE 0 END) AS overdue_projects
             FROM procurement_intakes`
        );
        const audits = await get(
            `SELECT
                COUNT(*) AS audit_count,
                SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) AS high_issues
             FROM audit_incidents`
        );
        const compliance = await get(
            `SELECT
                COUNT(*) AS review_count,
                SUM(CASE WHEN risk_rating IN ('High', 'Critical') THEN 1 ELSE 0 END) AS high_reviews
             FROM compliance_reviews`
        );
        const news = await get(`SELECT COUNT(*) AS post_count FROM news_posts`);

        const recentProcurement = await all(
            `SELECT request_id, vendor, category, amount, status, deadline
             FROM procurement_intakes
             ORDER BY id DESC
             LIMIT 6`
        );
        const recentAudit = await all(
            `SELECT date_observed, reported_by, details, severity
             FROM audit_incidents
             ORDER BY id DESC
             LIMIT 6`
        );

        const totalRisks = Number(audits.high_issues || 0) + Number(compliance.high_reviews || 0);
        const overdue = Number(procurement.overdue_projects || 0);
        let ragStatus = 'Green';
        if (totalRisks >= 3 || overdue >= 2) ragStatus = 'Amber';
        if (totalRisks >= 6 || overdue >= 4) ragStatus = 'Red';

        res.json({
            kpis: {
                totalAllocation: Number(budget.total_allocation || 0),
                totalRequested: Number(budget.total_requested || 0),
                activeProjects: Number(procurement.total_projects || 0),
                approvedProjects: Number(procurement.approved_projects || 0),
                overdueProjects: Number(procurement.overdue_projects || 0),
                highIssues: Number(audits.high_issues || 0),
                complianceReviews: Number(compliance.review_count || 0),
                newsPosts: Number(news.post_count || 0)
            },
            recentProcurement,
            recentAudit,
            ragStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', (_req, res) => {
    res.json({ loggedIn: false });
});

app.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
});

app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`eAccountability running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    });
