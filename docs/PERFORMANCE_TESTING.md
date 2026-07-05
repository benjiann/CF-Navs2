# Performance Testing

This project includes a real-browser audit script for the production site or any deployed CF-Navs origin.

Read `docs/PERFORMANCE_CONTRACT.md` before changing data freshness, icon loading, Service Worker caching, or admin loading behavior.

## Chrome Setup

Start Chrome with a DevTools endpoint, or reuse an existing Chrome that already exposes one.

Default endpoint:

```powershell
http://127.0.0.1:9223
```

The script opens or reuses a tab for `BASE_URL`, logs in through the page, runs the audit, prints JSON metrics, and removes `cf-navs.auth` from localStorage before exit.

## Run

```powershell
$env:BASE_URL = 'https://navs.bjlius.com'
$env:CHROME_DEBUG_PORT = '9223'
$env:ADMIN_USER = '<admin user>'
$env:ADMIN_PASS = '<admin password>'
npm run perf:audit
```

Optional:

```powershell
$env:PERF_AUDIT_ALLOW_FAILURES = '1'
```

Use this only when collecting diagnostics from a known-bad run. By default, the script exits non-zero if it sees failed network requests or cannot complete a core scenario.

Thresholds can be tuned per deployment:

```powershell
$env:PERF_MAX_FAILED_REQUESTS = '0'
$env:PERF_MAX_ADMIN_DATA_TRANSFER = '60000'
$env:PERF_MAX_CACHE_BYTES = '5242880'
$env:PERF_MIN_BOOKMARK_CARDS = '300'
$env:PERF_MAX_ICON_REQUESTS = '260'
```

The JSON output includes a `checks` array with pass/fail status, actual values, and expected thresholds.

## Covered Scenarios

- Authenticated home reload.
- Full-page scroll to trigger lazy bookmark icons.
- Rapid home search input and clear.
- Admin entry from the home toolbar.
- Admin bookmark search input and clear.
- Network request summary, including `/api/admin/data`, `/api/icon/*`, `/api/iconify/*`, and failed requests.
- Storage summary for `navigator.storage.estimate()` and Cache Storage entries.

## Request Discipline

The audit intentionally exercises the same user-facing flows used during manual performance tuning. It does not call save, import, sort-save, or icon-cache refresh endpoints. That keeps it suitable for regression checks without modifying cloud data or increasing request volume beyond the measured browsing scenarios.
