'use strict';

const path = require('path');
const knex = require('knex');

const DB_PATH = path.join(__dirname, '..', 'bagcheck.db');

const db = knex({
  client: 'sqlite3',
  connection: { filename: DB_PATH },
  useNullAsDefault: true,
  pool: { min: 1, max: 1 },
});

// Run migrations (create tables if not exist).
async function migrate() {
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasUnis = await db.schema.hasTable('universities');
  if (!hasUnis) {
    await db.schema.createTable('universities', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.string('short_name');
    });
  }

  const hasCampuses = await db.schema.hasTable('campuses');
  if (!hasCampuses) {
    await db.schema.createTable('campuses', (t) => {
      t.increments('id').primary();
      t.integer('university_id').references('id').inTable('universities');
      t.string('name').notNullable();
      t.string('city');
    });
  }

  const hasReports = await db.schema.hasTable('reports');
  if (!hasReports) {
    await db.schema.createTable('reports', (t) => {
      t.increments('id').primary();
      t.integer('user_id').references('id').inTable('users');
      t.enu('type', ['Lost', 'Found']).notNullable();
      t.string('title').notNullable();
      t.text('description').notNullable();
      t.string('category').defaultTo('General');
      t.integer('university_id').references('id').inTable('universities');
      t.integer('campus_id').references('id').inTable('campuses');
      t.string('location');
      t.string('event_date');
      t.string('photo_url');
      t.string('status').defaultTo('Active');
      t.string('moderation_status').defaultTo('Pending');
      t.string('contact_email');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasMatches = await db.schema.hasTable('matches');
  if (!hasMatches) {
    await db.schema.createTable('matches', (t) => {
      t.increments('id').primary();
      t.integer('report_a_id').references('id').inTable('reports');
      t.integer('report_b_id').references('id').inTable('reports');
      t.float('score');
      t.string('status').defaultTo('Suggested');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
}

// Consumers such as the HTTP server and seed script can await this promise
// before issuing queries. This avoids a startup race on a fresh database.
const ready = migrate();
ready.catch((err) => console.error('Database migration failed:', err));

module.exports = db;
module.exports.ready = ready;
