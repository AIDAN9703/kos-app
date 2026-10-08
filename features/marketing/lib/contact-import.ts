/**
 * Turns a CSV export (QuickBooks, a waiver app, a Google Sheet tab…) into
 * clean marketing contacts. Pure and browser-safe: the import sheet previews
 * with it before anything is saved, and the server re-checks with it.
 */

export interface ImportedContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ImportResult {
  contacts: ImportedContact[];
  rows: number;
  skipped: { invalid: number; spam: number; minors: number; duplicates: number };
}

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF or LF, a leading BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** "KOS Email List - QuickBooks.csv" → "QuickBooks" (Google Sheets names exports "Doc - Tab"). */
export function sourceFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const tab = base.includes(" - ") ? base.slice(base.lastIndexOf(" - ") + 3) : base;
  return tab.replace(/[_]+/g, " ").trim() || "Import";
}

const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Common slips in big providers' names, fixed rather than dropped. */
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "iclould.com": "icloud.com",
  "icloud.co": "icloud.com",
};

/** System addresses and throwaway inboxes: never real recipients. */
const SPAM_DOMAINS = [
  "pandadoc.net",
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "10minutemail.com",
  "tempmail.com",
  "example.com",
];
/** Form-spam endings seen in KOS's own inquiry exports. */
const SPAM_TLDS = ["ru"];

type EmailCheck = { ok: true; email: string } | { ok: false; reason: "invalid" | "spam" };

export function cleanEmail(raw: string): EmailCheck {
  let email = raw.trim().toLowerCase().replace(/^mailto:/, "").replace(/[.,;]+$/, "");
  if (email.endsWith(".con")) email = `${email.slice(0, -4)}.com`;
  const at = email.lastIndexOf("@");
  if (at > 0) {
    const domain = email.slice(at + 1);
    if (DOMAIN_FIXES[domain]) email = `${email.slice(0, at)}@${DOMAIN_FIXES[domain]}`;
  }
  if (!EMAIL.test(email)) return { ok: false, reason: "invalid" };
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (SPAM_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`)) || SPAM_TLDS.includes(tld)) {
    return { ok: false, reason: "spam" };
  }
  return { ok: true, email };
}

interface Columns {
  email: number;
  first: number | null;
  last: number | null;
  full: number | null;
  birthday: number | null;
}

/** Finds the email, name and birthday columns from headers, falling back to content. */
function detectColumns(rows: string[][]): Columns | null {
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const find = (test: (h: string) => boolean) => {
    const i = header.findIndex(test);
    return i >= 0 ? i : null;
  };
  let email = find((h) => h.includes("email") || h.includes("e-mail"));
  if (email === null) {
    // No header says email: take the column that most often holds an address.
    const counts = header.map((_, col) => rows.slice(1, 200).filter((r) => (r[col] ?? "").includes("@")).length);
    const best = counts.indexOf(Math.max(...counts, 0));
    email = counts[best] > 0 ? best : null;
  }
  if (email === null) return null;
  const isName = (h: string) => h.includes("name") && !/(company|business|file|user ?name|middle)/.test(h);
  return {
    email,
    first: find((h) => /^(first[ _-]?name|first|given name)$/.test(h)),
    last: find((h) => /^(last[ _-]?name|last|surname|family name)$/.test(h)),
    full: find((h) => /^(full[ _-]?name|name|client|recipient name|customer)$/.test(h)) ?? find(isName),
    birthday: find((h) => /^(birthday|birth ?date|date of birth|dob)$/.test(h)),
  };
}

function splitName(full: string): { firstName: string | null; lastName: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || null };
}

/** Under 18 on a birthday column, in the formats waiver apps export. */
function isMinor(value: string, today = new Date()): boolean {
  const v = value.trim();
  if (!v) return false;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let date: Date | null = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  if (!date) {
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      date = new Date(year > today.getFullYear() ? year - 100 : year, Number(m[1]) - 1, Number(m[2]));
    }
  }
  if (!date || Number.isNaN(date.getTime())) return false;
  const eighteenth = new Date(date.getFullYear() + 18, date.getMonth(), date.getDate());
  return eighteenth > today;
}

const clean = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return t ? t.slice(0, 80) : null;
};

/** One file's rows → deduped, cleaned contacts and counts of what was dropped. */
export function buildImport(rows: string[][]): ImportResult | null {
  const cols = detectColumns(rows);
  if (!cols) return null;
  const seen = new Set<string>();
  const contacts: ImportedContact[] = [];
  const skipped = { invalid: 0, spam: 0, minors: 0, duplicates: 0 };
  for (const row of rows.slice(1)) {
    const raw = row[cols.email] ?? "";
    if (!raw.trim()) continue;
    const check = cleanEmail(raw);
    if (!check.ok) {
      skipped[check.reason]++;
      continue;
    }
    if (cols.birthday !== null && isMinor(row[cols.birthday] ?? "")) {
      skipped.minors++;
      continue;
    }
    if (seen.has(check.email)) {
      skipped.duplicates++;
      continue;
    }
    seen.add(check.email);
    const fromParts = cols.first !== null ? { firstName: clean(row[cols.first]), lastName: cols.last !== null ? clean(row[cols.last]) : null } : null;
    const name = fromParts?.firstName ? fromParts : cols.full !== null ? splitName(row[cols.full] ?? "") : { firstName: null, lastName: null };
    contacts.push({ email: check.email, firstName: clean(name.firstName ?? ""), lastName: clean(name.lastName ?? "") });
  }
  return { contacts, rows: rows.length - 1, skipped };
}
