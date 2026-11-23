'use strict';

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI ;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ;

let client;
let database;

async function connect() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  database = client.db(MONGODB_DB_NAME);
  const matchesCollection = database.collection('matches');

  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('universities').createIndex({ name: 1 }),
    database.collection('campuses').createIndex({ university_id: 1, name: 1 }),
    database.collection('reports').createIndex({ status: 1, moderation_status: 1, created_at: -1 }),
    database.collection('reports').createIndex({ campus_id: 1, type: 1, status: 1, moderation_status: 1 }),
    database.collection('contact_requests').createIndex({ report_id: 1, from_user_id: 1, status: 1 }),
    database.collection('contact_requests').createIndex({ to_user_id: 1, status: 1, created_at: -1 }),
    database.collection('notifications').createIndex({ user_id: 1, read: 1, created_at: -1 }),
  ]);

  // Migrate the original non-unique index created by earlier BagCheck builds.
  // MongoDB cannot change an index's unique option in place, and reusing its
  // generated name causes IndexKeySpecsConflict during application startup.
  const existingIndexes = await matchesCollection.listIndexes().toArray().catch((error) => {
    if (error.code === 26) return []; // A fresh database has no matches collection yet.
    throw error;
  });
  const pairIndex = existingIndexes.find((index) => (
    index.key?.report_a_id === 1 && index.key?.report_b_id === 1
  ));
  if (pairIndex && !pairIndex.unique) {
    await matchesCollection.dropIndex(pairIndex.name);
  }
  await matchesCollection.createIndex(
    { report_a_id: 1, report_b_id: 1 },
    { unique: true, name: 'matches_report_pair_unique' },
  );

  return database;
}

const ready = connect().catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  throw err;
});

function getDb() {
  if (!database) throw new Error('MongoDB is not connected yet');
  return database;
}

function collections() {
  const db = getDb();
  return {
    users: db.collection('users'),
    universities: db.collection('universities'),
    campuses: db.collection('campuses'),
    reports: db.collection('reports'),
    contactRequests: db.collection('contact_requests'),
    notifications: db.collection('notifications'),
    matches: db.collection('matches'),
    counters: db.collection('counters'),
  };
}

async function nextId(sequence) {
  const { counters } = collections();
  const document = await counters.findOneAndUpdate(
    { _id: sequence },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after', includeResultMetadata: false },
  );
  return document.value;
}

async function close() {
  if (client) await client.close();
}

module.exports = { ready, collections, nextId, close, MONGODB_URI, MONGODB_DB_NAME };
