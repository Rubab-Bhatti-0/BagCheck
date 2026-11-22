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

  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('universities').createIndex({ name: 1 }),
    database.collection('campuses').createIndex({ university_id: 1, name: 1 }),
    database.collection('reports').createIndex({ status: 1, moderation_status: 1, created_at: -1 }),
    database.collection('reports').createIndex({ campus_id: 1, type: 1, status: 1, moderation_status: 1 }),
    database.collection('matches').createIndex({ report_a_id: 1, report_b_id: 1 }),
  ]);

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
    matches: db.collection('matches'),
    counters: db.collection('counters'),
  };
}

async function nextId(sequence) {
  const { counters } = collections();
  const result = await counters.findOneAndUpdate(
    { _id: sequence },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  const document = result && (result.value || result);
  return document.value;
}

async function close() {
  if (client) await client.close();
}

module.exports = { ready, collections, nextId, close, MONGODB_URI, MONGODB_DB_NAME };
