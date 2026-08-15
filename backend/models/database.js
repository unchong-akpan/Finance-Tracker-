import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.json');

function readDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ transactions: [], budgets: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    writeDb({ transactions: [], budgets: [] });
    console.log('Database initialized');
  }
}

export function getAll(type) {
  const db = readDb();
  return db[type] || [];
}

export function getById(type, id) {
  const db = readDb();
  return db[type]?.find((item) => item.id === id);
}

export function create(type, item) {
  const db = readDb();
  const newItem = {
    id: Date.now(),
    ...item,
    created_at: new Date().toISOString(),
  };
  db[type].push(newItem);
  writeDb(db);
  return newItem;
}

export function update(type, id, item) {
  const db = readDb();
  const index = db[type]?.findIndex((i) => i.id === id);
  if (index === -1) return null;
  db[type][index] = { ...db[type][index], ...item };
  writeDb(db);
  return db[type][index];
}

export function remove(type, id) {
  const db = readDb();
  const index = db[type]?.findIndex((i) => i.id === id);
  if (index === -1) return false;
  db[type].splice(index, 1);
  writeDb(db);
  return true;
}

export function query(type, filters = {}) {
  const db = readDb();
  let items = db[type] || [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      items = items.filter((item) => item[key] === value);
    }
  });

  return items;
}
