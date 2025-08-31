const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || process.argv[2] || 8080;
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.map': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8'
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

function safeJoin(base, target) {
  const targetPath = path.posix.normalize('/' + target);
  return path.join(base, targetPath);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Default route maps to demo index for convenience
  let filePath = urlPath === '/' ? '/demo/index.html' : urlPath;

  // If requesting a directory, try its index.html
  const absPath = safeJoin(root, filePath);

  fs.stat(absPath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const finalAbsPath = safeJoin(root, filePath);

    fs.readFile(finalAbsPath, (readErr, data) => {
      if (readErr) {
        return send404(res);
      }
      const ext = path.extname(finalAbsPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
  console.log('Serving root:', root);
  console.log('Try opening:');
  console.log(`  - http://localhost:${port}/demo/`);
  console.log(`  - http://localhost:${port}/demo/simple.html`);
});

