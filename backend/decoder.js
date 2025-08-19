// build_teams_json.js
// Usage: node build_teams_json.js /path/to/Filtered_Model_Ready_Features.csv ./teams_encodings.json
// Requires: npm i csv-parse

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const inPath = process.argv[2] || path.join(__dirname, 'Filtered_Model_Ready_Features.csv');
const outPath = process.argv[3] || path.join(__dirname, 'teams_encodings.json');

function toNum(x) {
  if (x === null || x === undefined) return null;
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
}

function addTeam(store, teamName, enc, divEnc) {
  if (!teamName) return;
  if (!store[teamName]) {
    store[teamName] = { encodings: new Set(), divs: new Set() };
  }
  if (enc !== null) store[teamName].encodings.add(enc);
  if (divEnc !== null) store[teamName].divs.add(divEnc);
}

function finalize(store) {
  const arr = Object.entries(store).map(([team, { encodings, divs }]) => {
    const encList = [...encodings].sort((a, b) => a - b);
    const divList = [...divs].sort((a, b) => a - b);

    return {
      team,
      enc: encList.length <= 1 ? encList[0] ?? null : encList,
      div_enc: divList.length <= 1 ? divList[0] ?? null : divList,
      _meta: {
        enc_count: encList.length,
        div_count: divList.length
      }
    };
  });

  // Sort by team name for readability
  arr.sort((a, b) => a.team.localeCompare(b.team));
  // Strip _meta if you don’t want it in the final file:
  return arr.map(({ _meta, ...rest }) => rest);
}

(function main() {
  const csvBuf = fs.readFileSync(inPath);
  const records = parse(csvBuf, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Expected columns (case/space tolerant):
  // HomeTeam_enc, AwayTeam_enc, HomeTeam, AwayTeam, div_enc
  const teams = {};

  for (const row of records) {
    const homeTeam = row.HomeTeam ?? row['HomeTeam '] ?? row[' HomeTeam'] ?? row['HomeTeam\t'] ?? row['HomeTeam'];
    const awayTeam = row.AwayTeam ?? row['AwayTeam '] ?? row[' AwayTeam'] ?? row['AwayTeam\t'] ?? row['AwayTeam'];

    const homeEnc = toNum(row.HomeTeam_enc ?? row['HomeTeam_enc '] ?? row[' HomeTeam_enc']);
    const awayEnc = toNum(row.AwayTeam_enc ?? row['AwayTeam_enc '] ?? row[' AwayTeam_enc']);
    const divEnc  = toNum(row.div_enc ?? row['div_enc '] ?? row[' div_enc']);

    // If your dataset truly has no -1 div_enc, the guard below is harmless.
    const safeDiv = divEnc === -1 ? null : divEnc;

    addTeam(teams, homeTeam, homeEnc, safeDiv);
    addTeam(teams, awayTeam, awayEnc, safeDiv);
  }

  const out = finalize(teams);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');

  // Quick summary to console
  const multiEnc = out.filter(t => Array.isArray(t.enc));
  const multiDiv = out.filter(t => Array.isArray(t.div_enc));
  console.log(`Teams written: ${out.length}`);
  console.log(`Teams with multiple enc values: ${multiEnc.length}`);
  console.log(`Teams with multiple div_enc values: ${multiDiv.length}`);
  console.log(`Output -> ${outPath}`);
})();
