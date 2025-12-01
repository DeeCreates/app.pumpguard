import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your api.ts file
const filePath = path.join(__dirname, 'frontend/src/lib/api.ts');

// Read the file
const content = fs.readFileSync(filePath, 'utf-8');

// Split file into lines
const lines = content.split(/\r?\n/);

// Regex to match method names in classes
const methodRegex = /(?:async|private|public)?\s*(\w+)\s*\(/;

// Map to store method names and their line numbers
const methodMap = Object.create(null); // use a clean object without prototype

lines.forEach((line, index) => {
  const match = line.match(methodRegex);
  if (match && match[1]) {
    const name = match[1];
    if (!methodMap[name]) {
      methodMap[name] = []; // ensure it's an array
    }
    methodMap[name].push(index + 1); // store line number
  }
});

// Filter duplicates
const duplicates = Object.entries(methodMap)
  .filter(([name, occurrences]) => occurrences.length > 1);

if (duplicates.length === 0) {
  console.log('✅ No duplicate methods found!');
} else {
  console.log('⚠️ Duplicate methods found with line numbers:');
  duplicates.forEach(([name, lines]) => {
    console.log(`- ${name}: lines ${lines.join(', ')}`);
  });
}
