#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const ideas = JSON.parse(await readFile(new URL('../assets/ideas.json', import.meta.url), 'utf8'));
const query = process.argv[2];
if (!query) console.log(ideas.map(x => `${x.id} ${x.title} (${x.platform})`).join('\n'));
else {
  const idea = ideas.find(x => x.id === query.padStart(3, '0') || x.slug === query);
  if (!idea) { console.error('001〜100のIDを指定してください。'); process.exitCode = 1; }
  else console.log(JSON.stringify(idea, null, 2));
}
