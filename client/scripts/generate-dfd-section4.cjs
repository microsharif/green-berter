/**
 * Generates updated Almadot DFD Section 4 — Claim & Exchange (Give and Take)
 * Reflects requirements from ApplicationFeatureRequirements.md §4
 *   §4.3 – Claim/Exchange State Requirements
 *   §4.4 – Notifications and Audit Trail
 *   §4.5 – Safety and Policy Requirements
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ── Canvas setup ──────────────────────────────────────────────────────────────
const W = 1050;
const H = 820;
const canvas = createCanvas(W, H);
const ctx   = canvas.getContext('2d');

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  bg:          '#ffffff',
  title:       '#111111',
  sectionBg:   '#f9f9f9',
  sectionBdr:  '#444444',
  processBg:   '#2d8a4e',
  processBdr:  '#1a5e32',
  processTxt:  '#ffffff',
  actorBg:     '#ffffff',
  actorBdr:    '#3b5fc0',
  actorTxt:    '#3b5fc0',
  dbBg:        '#f5eeff',
  dbBdr:       '#8b44c8',
  dbTxt:       '#4b1a7a',
  dbDash:      '#c09ae0',
  arrow:       '#222222',
  labelTxt:    '#222222',
  noteBg:      '#fff8e6',
  noteBdr:     '#e6b800',
  safetyBg:    '#fff0f0',
  safetyBdr:   '#c0392b',
  safetyTxt:   '#7b0e0e',
  auditBg:     '#e8f4fd',
  auditBdr:    '#2980b9',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function roundRect(x, y, w, h, r, fill, stroke, lineWidth = 1.5, dash = []) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill;   ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.setLineDash(dash); ctx.stroke(); }
  ctx.restore();
}

function text(str, x, y, font, color, align = 'center', baseline = 'middle') {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function multiText(lines, x, y, font, color, align = 'center', lineH = 16) {
  lines.forEach((l, i) => text(l, x, y + i * lineH, font, color, align));
}

function arrow(x1, y1, x2, y2, label = '', labelSide = 'left') {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const headLen = 10, headAngle = Math.PI / 6;

  ctx.save();
  ctx.strokeStyle = C.arrow;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * (ux * Math.cos(headAngle) - uy * Math.sin(headAngle)),
    y2 - headLen * (uy * Math.cos(headAngle) + ux * Math.sin(headAngle))
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * (ux * Math.cos(headAngle) + uy * Math.sin(headAngle)),
    y2 - headLen * (uy * Math.cos(headAngle) - ux * Math.sin(headAngle))
  );
  ctx.stroke();
  ctx.restore();

  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const off = labelSide === 'left' ? -6 : 6;
    const perpX = -uy * off;
    const perpY =  ux * off;
    const lines = label.split('\n');
    lines.forEach((l, i) => {
      text(l, mx + perpX, my + perpY + (i - (lines.length - 1) / 2) * 14,
        '11px sans-serif', C.labelTxt,
        labelSide === 'left' ? 'right' : 'left');
    });
  }
}

// ── Background ────────────────────────────────────────────────────────────────
ctx.fillStyle = C.bg;
ctx.fillRect(0, 0, W, H);

// ── Title ─────────────────────────────────────────────────────────────────────
text('Almadot DFD — Section 4: Claim & Exchange (Give and Take)',
  W / 2, 30, 'bold 17px sans-serif', C.title);

// ── Section box ───────────────────────────────────────────────────────────────
const SX = 310, SY = 55, SW = 430, SH = 550;
roundRect(SX, SY, SW, SH, 14, C.sectionBg, C.sectionBdr, 2);
text('§4 Claim & exchange', SX + SW / 2, SY + 18,
  '13px sans-serif', '#333', 'center');

// ── Process nodes (green rounded rects) ──────────────────────────────────────
const PW = 220, PH = 52, PX = SX + (SW - PW) / 2;

const procs = [
  { y: SY + 45,  num: '1', lines: ['Submit claim (Give)', 'or proposal (Exchange)'] },
  { y: SY + 155, num: '2', lines: ['Owner review'] },
  { y: SY + 265, num: '3', lines: ['Lifecycle & completion'] },
  { y: SY + 395, num: '4', lines: ['Notify claimer & owner', '(Notifications fan-out)'] },
];

procs.forEach(({ y, num, lines }) => {
  roundRect(PX, y, PW, PH, 22, C.processBg, C.processBdr, 2);
  // circle badge
  ctx.save();
  ctx.beginPath();
  ctx.arc(PX + 28, y + PH / 2, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#1a5e32';
  ctx.fill();
  ctx.restore();
  text(num, PX + 28, y + PH / 2, 'bold 13px sans-serif', '#ffffff');
  multiText(lines, PX + PW / 2 + 10, y + PH / 2 - (lines.length - 1) * 9,
    'bold 12px sans-serif', C.processTxt, 'center', 18);
});

// ── Actor boxes (left column) ─────────────────────────────────────────────────
const AW = 90, AH = 56;
const AX = 50;

// Claimer/buyer (top-left)
const claimerY = SY + 50;
roundRect(AX, claimerY, AW, AH, 6, C.actorBg, C.actorBdr, 2);
multiText(['Claimer /', 'buyer'], AX + AW / 2, claimerY + 17,
  'bold 12px sans-serif', C.actorTxt, 'center', 16);

// Owner/lister (mid-left)
const ownerY = SY + 180;
roundRect(AX, ownerY, AW, AH, 6, C.actorBg, C.actorBdr, 2);
multiText(['Owner /', 'lister'], AX + AW / 2, ownerY + 17,
  'bold 12px sans-serif', C.actorTxt, 'center', 16);

// ── Database (cylinder shape via rounded rect + ellipse) ──────────────────────
const DBX = 790, DBY = 310, DBW = 220, DBH = 230;
roundRect(DBX, DBY, DBW, DBH, 12, C.dbBg, C.dbBdr, 2);
text('D2 — Application database', DBX + DBW / 2, DBY + 20,
  'bold 12px sans-serif', C.dbTxt);

// dashed separator
ctx.save();
ctx.strokeStyle = C.dbDash;
ctx.lineWidth = 1;
ctx.setLineDash([5, 4]);
ctx.beginPath();
ctx.moveTo(DBX + 10, DBY + 120);
ctx.lineTo(DBX + DBW - 10, DBY + 120);
ctx.stroke();
ctx.restore();

const dbLine1 = [
  'All listing / product status,',
  'claims, proposals — every status',
  'change READ & WRITE via database',
  '(no localStorage)',
];
const dbLine2 = [
  'audit / notification log rows',
  'timestamp + actor per event',
  '(stored in same database)',
];
multiText(dbLine1, DBX + DBW / 2, DBY + 46, '10.5px sans-serif', C.dbTxt, 'center', 15);
multiText(dbLine2, DBX + DBW / 2, DBY + 136, '10.5px sans-serif', C.dbTxt, 'center', 15);

// ── Safety/Policy box (§4.5) ──────────────────────────────────────────────────
const SFX = 790, SFY = 555, SFW = 220, SFH = 90;
roundRect(SFX, SFY, SFW, SFH, 8, C.safetyBg, C.safetyBdr, 1.5);
text('§4.5 Safety & Policy', SFX + SFW / 2, SFY + 14, 'bold 11px sans-serif', C.safetyTxt);
multiText([
  '• Authenticated users only',
  '• Prevent duplicate acceptance',
  '• Owner-only approval authority',
  '• Abuse / report option',
], SFX + 12, SFY + 30, '10.5px sans-serif', C.safetyTxt, 'left', 14);

// ── Lifecycle state annotation ────────────────────────────────────────────────
// Small annotation box beside process 3 (inside section box area, to the left)
const LCAX = SX + 10, LCAY = procs[2].y - 2, LCAW = 130, LCAH = 56;
roundRect(LCAX, LCAY, LCAW, LCAH, 5, '#f0fff4', '#2d8a4e', 1, [4, 3]);
multiText([
  'available →',
  'pending →  accepted →',
  'completed / rejected /cancelled',
], LCAX + LCAW / 2, LCAY + 12, '9.5px sans-serif', '#1a5e32', 'center', 14);

// ── Bottom actor boxes (notification recipients) ──────────────────────────────
const BotY = 680;
const claimerBotX = 200, ownerBotX = 480;

roundRect(claimerBotX, BotY, AW, AH, 6, C.actorBg, C.actorBdr, 2);
multiText(['Claimer /', 'buyer'], claimerBotX + AW / 2, BotY + 17,
  'bold 12px sans-serif', C.actorTxt, 'center', 16);

roundRect(ownerBotX, BotY, AW, AH, 6, C.actorBg, C.actorBdr, 2);
multiText(['Owner /', 'lister'], ownerBotX + AW / 2, BotY + 17,
  'bold 12px sans-serif', C.actorTxt, 'center', 16);

// ── Arrows & labels ───────────────────────────────────────────────────────────
const P1Y  = procs[0].y + PH / 2;   // process 1 mid-y
const P2Y  = procs[1].y + PH / 2;   // process 2 mid-y
const P3Y  = procs[2].y + PH / 2;   // process 3 mid-y
const P4Y  = procs[3].y + PH / 2;   // process 4 mid-y
const PLX  = PX;                     // left edge of process nodes
const PRX  = PX + PW;               // right edge

// Claimer → Process 1 (claim/proposal payload)
arrow(AX + AW, claimerY + 14, PLX, procs[0].y + 14,
  'claim or proposal\npayload', 'left');

// Process 1 → Claimer (ack)
arrow(PLX, procs[0].y + PH - 14, AX + AW, claimerY + AH - 14,
  'acknowledgment /\nstatus: submitted', 'left');

// Process 1 → Owner (notify)
arrow(PLX - 18, procs[0].y + PH + 4, AX + AW, ownerY + 4,
  'notify owner / lister:\nnew claim or proposal\n(same event)', 'left');

// Owner → Process 2 (accept/reject/counter)
arrow(AX + AW, ownerY + 14, PLX, procs[1].y + 14,
  'accept / reject /\ncounter', 'left');

// Process 2 → Owner (notify buyer)
arrow(PLX, procs[1].y + PH - 14, AX + AW, ownerY + AH - 14,
  'notify buyer\nof outcome', 'left');

// Process 3 → Owner (confirm)
arrow(PLX, procs[2].y + PH - 14, AX + AW, ownerY + AH,
  'confirm action recorded /\nmirror notification', 'left');

// Vertical arrows between processes (inside section)
const midX = PX + PW / 2;
arrow(midX, procs[0].y + PH, midX, procs[1].y);
arrow(midX, procs[1].y + PH, midX, procs[2].y);
arrow(midX, procs[2].y + PH, midX, procs[3].y);

// Process 1 → DB  (INSERT)
arrow(PRX, procs[0].y + 10, DBX, DBY + 25,
  'INSERT claim/proposal;\nset listing status\ne.g. pending', 'right');

// Process 2 → DB  (UPDATE)
arrow(PRX, procs[1].y + 10, DBX, DBY + 80,
  'UPDATE listing +\nclaim state', 'right');

// Process 3 ↔ DB  (READ/WRITE)
arrow(DBX, DBY + 140, PRX, procs[2].y + 10,
  'READ / WRITE\ntransition available →\npending → accepted →\ncompleted / rejected / cancelled\n(No status in browser storage)', 'right');

// Process 4 → DB
arrow(PRX, procs[3].y + 10, DBX, DBY + 185,
  '', 'right');

// Safety box arrow from DB to safety box
arrow(DBX + DBW / 2, DBY + DBH, SFX + SFW / 2, SFY, '', 'right');

// Process 4 → bottom actors
arrow(PX + 60, procs[3].y + PH, claimerBotX + AW / 2, BotY,
  'push or email\nto claimer', 'left');
arrow(PX + PW - 60, procs[3].y + PH, ownerBotX + AW / 2, BotY,
  'push or email\nto owner / lister', 'right');

// ── Bottom note ───────────────────────────────────────────────────────────────
const noteY = H - 52;
roundRect(30, noteY, W - 60, 40, 6, C.noteBg, C.noteBdr, 1.5);
text(
  'Status + persistence: database only.  Both parties notified on submit and on owner decisions.' +
  '  Claim history + timestamps stored per listing and user (§4.4).  Safety constraints enforced (§4.5).',
  W / 2, noteY + 20, '10.5px sans-serif', '#5a4000'
);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'doc', 'Almadot-DFD-Section4-Claim-Exchange.png');
const buf = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buf);
console.log(`Written: ${outPath}  (${buf.length} bytes)`);
