// store.js — tiny storage layer.
// Uses Upstash Redis (persistent, survives restarts) when UPSTASH_REDIS_REST_URL
// + UPSTASH_REDIS_REST_TOKEN are set. Otherwise falls back to a local JSON file
// (fine for testing on your computer; on Render's free plan a file resets on
// restart, which is exactly why Upstash is recommended).

const fs = require('fs');
const path = require('path');
const { DEFAULT_SEASONS, DEFAULT_ACTIVE } = require('./seasons');

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(URL && TOKEN);
const FILE = path.join(__dirname, 'data.json');
const STAT_FIELDS = ['visits', 'previews', 'purchases', 'revenue', 'freebies'];

async function redis(cmd) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!res.ok) throw new Error('Upstash error ' + res.status);
  const j = await res.json();
  return j.result;
}

function readFile() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return {}; } }
function writeFile(obj) { try { fs.writeFileSync(FILE, JSON.stringify(obj, null, 2)); } catch (e) {} }

async function getConfig() {
  if (useRedis) {
    const s = await redis(['GET', 'npp:config']);
    if (!s) { const def = { active: DEFAULT_ACTIVE, seasons: DEFAULT_SEASONS }; await redis(['SET', 'npp:config', JSON.stringify(def)]); return def; }
    try { return JSON.parse(s); } catch (e) { return { active: DEFAULT_ACTIVE, seasons: DEFAULT_SEASONS }; }
  }
  const d = readFile();
  if (!d.config) { d.config = { active: DEFAULT_ACTIVE, seasons: DEFAULT_SEASONS }; writeFile(d); }
  return d.config;
}

async function saveConfig(cfg) {
  if (useRedis) { await redis(['SET', 'npp:config', JSON.stringify(cfg)]); return; }
  const d = readFile(); d.config = cfg; writeFile(d);
}

async function incr(field, by) {
  by = by || 1;
  if (useRedis) { await redis(['INCRBY', 'npp:stat:' + field, by]); return; }
  const d = readFile(); d.stats = d.stats || {}; d.stats[field] = (d.stats[field] || 0) + by; writeFile(d);
}

async function getStats() {
  const out = {};
  if (useRedis) {
    const res = await redis(['MGET'].concat(STAT_FIELDS.map(function (f) { return 'npp:stat:' + f; })));
    STAT_FIELDS.forEach(function (f, i) { out[f] = parseInt((res && res[i]) || '0', 10); });
    return out;
  }
  const s = (readFile().stats) || {};
  STAT_FIELDS.forEach(function (f) { out[f] = s[f] || 0; });
  return out;
}

// ---- short card links (code -> encoded payload) ----
async function setCard(code, payload) {
  if (useRedis) { await redis(['SET', 'npp:card:' + code, payload, 'EX', 60 * 60 * 24 * 180]); return; } // 180-day expiry
  const d = readFile(); d.cards = d.cards || {}; d.cards[code] = payload; writeFile(d);
}
async function getCard(code) {
  if (useRedis) { return await redis(['GET', 'npp:card:' + code]); }
  const d = readFile(); return (d.cards && d.cards[code]) || null;
}

// ---- per-device free-usage counters ----
async function incrDevice(id) {
  if (useRedis) { return parseInt(await redis(['HINCRBY', 'npp:devices', id, 1]), 10); }
  const d = readFile(); d.devices = d.devices || {}; d.devices[id] = (d.devices[id] || 0) + 1; writeFile(d); return d.devices[id];
}
async function getDeviceCount(id) {
  if (useRedis) { const v = await redis(['HGET', 'npp:devices', id]); return parseInt(v || '0', 10); }
  const d = readFile(); return (d.devices && d.devices[id]) || 0;
}
async function listDevices() {
  if (useRedis) { const a = await redis(['HGETALL', 'npp:devices']); const o = {}; if (Array.isArray(a)) for (let i = 0; i < a.length; i += 2) o[a[i]] = parseInt(a[i + 1] || '0', 10); return o; }
  return (readFile().devices) || {};
}

module.exports = { getConfig, saveConfig, incr, getStats, setCard, getCard, incrDevice, getDeviceCount, listDevices, useRedis };
