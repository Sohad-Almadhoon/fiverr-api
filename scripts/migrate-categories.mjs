// One-off migration: maps the original 4 category slugs onto the current
// taxonomy in utils/categories.js.
//
// Gigs created before the taxonomy grew still carry values like "design" or
// "animation". Those are no longer offered anywhere in the UI, so such gigs
// never match a category filter and are missing from the home page counts.
//
//   node scripts/migrate-categories.mjs           # dry run, reports only
//   node scripts/migrate-categories.mjs --apply   # writes the changes
import mongoose from "mongoose";
import dotenv from "dotenv";
import { CATEGORIES } from "../utils/categories.js";

dotenv.config();

const LEGACY_MAP = {
  animation: "video-animation",
  design: "graphics-design",
  web: "programming-tech",
  music: "music-audio",
};

const apply = process.argv.includes("--apply");

await mongoose.connect(process.env.MONGODB_URL);
const gigs = mongoose.connection.db.collection("gigs");

const stale = await gigs.find({ cat: { $nin: CATEGORIES } }).toArray();
console.log(`gigs with an unknown category: ${stale.length}`);

let migrated = 0;
let unmapped = [];

for (const gig of stale) {
  const target = LEGACY_MAP[gig.cat];
  if (!target) {
    unmapped.push(gig);
    continue;
  }
  console.log(`  "${gig.title}"  ${gig.cat} -> ${target}`);
  if (apply) {
    await gigs.updateOne({ _id: gig._id }, { $set: { cat: target } });
  }
  migrated++;
}

if (unmapped.length) {
  console.log(`\nno mapping for ${unmapped.length} gig(s) - set these by hand:`);
  unmapped.forEach((g) => console.log(`  "${g.title}" (cat="${g.cat}")`));
}

console.log(
  apply
    ? `\napplied: ${migrated} gig(s) updated`
    : `\ndry run: ${migrated} gig(s) would be updated. Re-run with --apply.`
);

await mongoose.disconnect();
