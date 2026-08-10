// Dev mock of backend.exe for local testing (macOS/Linux/Windows).
// Reads the same backend/config.json and content/ directory, exposes the same
// POST endpoints, and additionally serves the project statically so index.html
// runs from http:// on the same origin.
//
//   node devserver/server.js
//   open http://127.0.0.1:8084/index.html

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const CONFIG_FILE = path.join(BACKEND_DIR, 'config.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.error('Cant find file config.json: ' + e.message);
    return null;
  }
}

// config.json stores Windows paths ("..\\content\\video") relative to backend/
function resolveConfigPath(p) {
  if (!p) return null;
  return path.resolve(BACKEND_DIR, p.replace(/\\/g, path.sep));
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function listDir(dir, wantDirs) {
  if (!dir) return [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return []; // "no files in folder"
  }
  return entries
    .filter((e) => (wantDirs ? e.isDirectory() : e.isFile()))
    .map((e) => e.name);
}

function readLines(file) {
  try {
    return stripBom(fs.readFileSync(file, 'utf8'))
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '');
  } catch (e) {
    return [];
  }
}

// "12.10:Ronald Montgomery" -> { date: "12.10", fio: "Ronald Montgomery" }
function readBirthdays(cfg) {
  const dir = resolveConfigPath(cfg.path_birthday);
  if (!dir) return [];
  return readLines(path.join(dir, cfg.file_birthday || 'birthday.txt'))
    .map((line) => {
      const i = line.indexOf(':');
      if (i === -1) return null;
      return { date: line.slice(0, i).trim(), fio: line.slice(i + 1).trim() };
    })
    .filter(Boolean);
}

function readHolidays(cfg) {
  const dir = resolveConfigPath(cfg.path_holiday);
  if (!dir) return [];
  return readLines(path.join(dir, cfg.file_holiday || 'holiday.txt'))
    .map((line) => {
      const i = line.indexOf(':');
      if (i === -1) return null;
      return { date: line.slice(0, i).trim(), name: line.slice(i + 1).trim() };
    })
    .filter(Boolean);
}

function matchesDay(dateStr, day, month) {
  const [d, m] = String(dateStr).split('.');
  return Number(d) === Number(day) && Number(m) === Number(month);
}

// Keeps a caller from escaping the configured directory with ../
function safeJoin(base, name) {
  if (!base || !name) return null;
  const target = path.resolve(base, name);
  const rel = path.relative(base, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

function handleApi(route, body, res) {
  const cfg = readConfig();
  if (!cfg) {
    // backend.exe exits when config.json is missing; here we mirror "no data",
    // which is what puts the panel into screensaver mode.
    return sendJson(res, {});
  }

  switch (route) {
    case 'config':
      return sendJson(res, cfg);

    case 'video':
      return sendJson(res, { result: listDir(resolveConfigPath(cfg.path_video), false) });

    // frontend calls /imgs; README documents /img — both accepted here
    case 'imgs':
    case 'img':
      return sendJson(res, { result: listDir(resolveConfigPath(cfg.path_images), false) });

    case 'text': {
      const dir = resolveConfigPath(cfg.path_text);
      if (body.name) {
        const file = safeJoin(dir, body.name);
        return sendJson(res, { result: file ? readLines(file) : [] });
      }
      return sendJson(res, { result: listDir(dir, false) });
    }

    case 'present': {
      const dir = resolveConfigPath(cfg.path_present);
      if (!body.path) {
        return sendJson(res, { result: listDir(dir, true) });
      }
      const sub = safeJoin(dir, body.path);
      if (!sub) return sendJson(res, { result: [] });
      if (body.title === 'true') {
        return sendJson(res, { result: readLines(path.join(sub, 'title.txt')) });
      }
      return sendJson(res, {
        result: listDir(sub, false).filter((n) => n.toLowerCase() !== 'title.txt'),
      });
    }

    case 'birthdays':
      return sendJson(res, { result: readBirthdays(cfg) });

    case 'birthday':
      return sendJson(res, {
        result: readBirthdays(cfg)
          .filter((b) => matchesDay(b.date, body.day, body.month))
          .map((b) => b.fio),
      });

    case 'holiday':
      return sendJson(res, {
        result: readHolidays(cfg)
          .filter((h) => matchesDay(h.date, body.day, body.month))
          .map((h) => h.name),
      });

    default:
      return null; // not an API route — fall through to static
  }
}

function sendJson(res, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
  return true;
}

function serveStatic(pathname, res, rangeHeader) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = safeJoin(ROOT, '.' + rel);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 page not found');
    return;
  }

  const size = fs.statSync(file).size;
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

  // Без поддержки Range браузер не может перемотать видео, не скачав файл целиком.
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || '');
  if (m && (m[1] !== '' || m[2] !== '')) {
    let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
    let end = m[1] === '' || m[2] === '' ? size - 1 : Number(m[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + size });
      res.end();
      return;
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

const API_ROUTES = new Set([
  'config', 'video', 'img', 'imgs', 'text',
  'present', 'birthdays', 'birthday', 'holiday',
]);

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const route = parsed.pathname.replace(/^\/|\/$/g, '');

  if (req.method === 'OPTIONS') {
    return sendJson(res, {});
  }

  if (req.method === 'POST' && API_ROUTES.has(route)) {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      // jQuery sends application/x-www-form-urlencoded
      const body = Object.fromEntries(new URLSearchParams(raw));
      Object.assign(body, parsed.query); // query string also accepted
      if (process.env.VERBOSE) console.log('POST /' + route, body);
      handleApi(route, body, res);
    });
    return;
  }

  serveStatic(parsed.pathname, res, req.headers.range);
});

const cfg = readConfig() || {};
const PORT = cfg.server_port || 8084;
const IP = cfg.server_ip || '127.0.0.1';

server.listen(PORT, IP, () => {
  console.log('Http server is start with ip: ' + IP + ':' + PORT);
  console.log('Open http://' + IP + ':' + PORT + '/index.html');
});
