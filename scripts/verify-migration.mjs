import fs from 'node:fs';
import path from 'node:path';

const sqlPath = path.resolve('packages/db/prisma/migrations/20260921000000_init_metrology_models/migration.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const tableMatches = [...sql.matchAll(/CREATE TABLE "([a-z_]+)"/g)];
const tables = tableMatches.map(m => m[1]);

const decimalMatches = [...sql.matchAll(/DECIMAL\(16,8\)/g)];
const pkMatches = [...sql.matchAll(/PRIMARY KEY/g)];
const fkMatches = [...sql.matchAll(/ADD CONSTRAINT .+ FOREIGN KEY/g)];
const indexMatches = [...sql.matchAll(/CREATE (?:UNIQUE )?INDEX/g)];

console.log('--- Migration Analysis ---');
console.log(`Total Tables: ${tables.length}`);
console.log(`Total DECIMAL(16,8) Columns: ${decimalMatches.length}`);
console.log(`Total Primary Keys: ${pkMatches.length}`);
console.log(`Total Foreign Keys: ${fkMatches.length}`);
console.log(`Total Indexes: ${indexMatches.length}`);
console.log('\nTables created:');
tables.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${t}`));
