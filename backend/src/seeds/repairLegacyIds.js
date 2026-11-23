'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { universities, samples, DEMO_EMAIL } = require('./seed');

const SEQUENCES = ['users', 'universities', 'campuses', 'reports'];

async function repair(database, { apply, session }) {
  const rows = {};
  for (const name of SEQUENCES) {
    rows[name] = await database.collection(name).find({}, { session }).sort({ _id: 1 }).toArray();
  }
  if (SEQUENCES.every((name) => rows[name].every(({ id }) => Number.isSafeInteger(id) && id > 0))) {
    return { status: 'No legacy records found' };
  }

  // Only run on the affected layout. Other records may still have references that need a separate repair.
  for (const name of SEQUENCES) {
    assert(rows[name].every(({ id }) => id == null), `Unexpected existing IDs in ${name}`);
  }
  for (const name of ['matches', 'contact_requests', 'notifications']) {
    assert.equal(await database.collection(name).countDocuments({}, { session, limit: 1 }), 0, `Existing ${name} need review`);
  }
  assert(rows.campuses.every((campus) => campus.university_id == null), 'Unexpected campus links');
  assert(rows.reports.every((report) => report.user_id == null && report.university_id == null && report.campus_id == null), 'Unexpected report links');

  const counters = database.collection('counters');
  const starts = {};
  const updates = {};
  for (const name of SEQUENCES) {
    const counter = await counters.findOne({ _id: name }, { session });
    starts[name] = counter?.value;
    assert(Number.isSafeInteger(starts[name]) && starts[name] >= rows[name].length && Number.isSafeInteger(starts[name] + rows[name].length), `Unexpected ${name} counter`);
    updates[name] = rows[name].map((_, index) => ({ id: starts[name] + index + 1 }));
  }

  const demoIndex = rows.users.findIndex(({ email }) => email === DEMO_EMAIL);
  assert(demoIndex >= 0, 'The seeded demo account could not be identified');
  assert.deepEqual(rows.universities.map(({ name, short_name }) => ({ name, short_name })), universities.map(({ name, short_name }) => ({ name, short_name })), 'University records differ from the original seed');
  const seedCampuses = universities.flatMap(({ short_name, campuses }, universityIndex) => (
    campuses.map(([name, city]) => ({ name, city, short_name, universityIndex }))
  ));
  assert.deepEqual(rows.campuses.map(({ name, city }) => ({ name, city })), seedCampuses.map(({ name, city }) => ({ name, city })), 'Campus records differ from the original seed');

  const campusIds = new Map();
  seedCampuses.forEach(({ short_name, name, universityIndex }, index) => {
    const campus = updates.campuses[index];
    campus.university_id = updates.universities[universityIndex].id;
    campusIds.set(`${short_name}/${name}`, campus);
  });

  for (const [type, title, description, category, shortName, campusName, location, eventDate, contactEmail] of samples) {
    const expected = { type, title, description, category, location, event_date: eventDate, contact_email: contactEmail };
    const indexes = rows.reports.flatMap((report, index) => (
      Object.entries(expected).every(([key, value]) => report[key] === value) ? [index] : []
    ));
    assert.equal(indexes.length, 1, 'A seeded report could not be identified uniquely');
    const campus = campusIds.get(`${shortName}/${campusName}`);
    Object.assign(updates.reports[indexes[0]], {
      user_id: updates.users[demoIndex].id,
      university_id: campus.university_id,
      campus_id: campus.id,
    });
  }

  if (apply) {
    for (const name of SEQUENCES) {
      const writes = rows[name].map(({ _id }, index) => ({
        updateOne: { filter: { _id, id: null }, update: { $set: updates[name][index] } },
      }));
      const result = await database.collection(name).bulkWrite(writes, { session });
      assert.equal(result.modifiedCount, writes.length, `${name} changed during repair`);
      const counter = await counters.updateOne({ _id: name, value: starts[name] }, { $inc: { value: writes.length } }, { session });
      assert.equal(counter.modifiedCount, 1, `${name} counter changed during repair`);
    }
  }

  return {
    status: apply ? 'Repair applied' : 'Dry run',
    assignedIds: Object.fromEntries(SEQUENCES.map((name) => [name, updates[name].length])),
    restoredSeedReportLinks: samples.length,
    reportsWithUnknownOwnerAndCampus: rows.reports.length - samples.length,
  };
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  const [flag, ...extraArgs] = process.argv.slice(2);
  assert((flag === undefined || flag === '--apply') && extraArgs.length === 0, 'Use --apply to write the repair');
  const { MONGODB_URI, MONGODB_DB_NAME } = process.env;
  assert(MONGODB_URI && MONGODB_DB_NAME, 'MONGODB_URI and MONGODB_DB_NAME are required');

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const database = client.db(MONGODB_DB_NAME);
    const result = flag === '--apply'
      ? await client.withSession((session) => session.withTransaction(() => repair(database, { apply: true, session })))
      : await repair(database, { apply: false });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Repair failed:', error.name === 'AssertionError' ? error.message.split('\n')[0] : `${error.name} (${error.code || 'no error code'})`);
    process.exitCode = 1;
  });
}

module.exports = { repair };
