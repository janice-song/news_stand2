import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'lib', 'data']) await cp(file, `dist/${file}`, { recursive: true });
console.log('Static site built: dist');
