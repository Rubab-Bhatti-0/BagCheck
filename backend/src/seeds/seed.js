'use strict';

const DEMO_EMAIL = 'demo@bagcheck.app';

const universities = [
  { name: 'COMSATS University Islamabad', short_name: 'CUI', campuses: [['Lahore Campus', 'Lahore'], ['Islamabad Campus', 'Islamabad'], ['Wah Campus', 'Wah Cantt'], ['Abbottabad Campus', 'Abbottabad']] },
  { name: 'University of the Punjab', short_name: 'PU', campuses: [['Quaid-e-Azam Campus', 'Lahore'], ['New Campus', 'Lahore']] },
  { name: 'NUST', short_name: 'NUST', campuses: [['H-12 Campus', 'Islamabad'], ['NUST Islamabad', 'Islamabad']] },
  { name: 'Bahria University', short_name: 'BU', campuses: [['Islamabad Campus', 'Islamabad'], ['Lahore Campus', 'Lahore'], ['Karachi Campus', 'Karachi']] },
  { name: 'UET Lahore', short_name: 'UET', campuses: [['Main Campus', 'Lahore'], ['KSK Campus', 'Lahore']] },
  { name: 'LUMS', short_name: 'LUMS', campuses: [['Main Campus (Lahore)', 'Lahore']] },
  { name: 'Air University', short_name: 'AU', campuses: [['Islamabad Campus', 'Islamabad']] },
];

const samples = [
  ['Lost', 'Lost Black Backpack', 'Lost a black Nike backpack near the library. Contains laptop and books.', 'General', 'CUI', 'Lahore Campus', 'Library Block', '2024-10-10', 'student1@cui.edu.pk'],
  ['Found', 'Found Student ID Card', 'Found a COMSATS student ID card near the cafeteria. Name: Ayesha Khan.', 'Student Cards & IDs', 'CUI', 'Islamabad Campus', 'Main Cafeteria', '2024-10-12', 'finder1@cui.edu.pk'],
  ['Lost', 'Lost iPhone 13 Blue', 'Lost my blue iPhone 13 in the CS department hallway. Has a cracked back cover.', 'Electronics', 'NUST', 'H-12 Campus', 'CS Dept 2nd Floor', '2024-10-15', 'nust_student@nust.edu.pk'],
  ['Found', 'Found Wireless Earbuds', 'Found a pair of Samsung Galaxy Buds in a white case near the sports ground.', 'Electronics', 'LUMS', 'Main Campus (Lahore)', 'Sports Ground', '2024-10-14', 'lums_finder@lums.edu.pk'],
  ['Lost', 'Lost Prescription Glasses', 'Brown frame prescription glasses lost between the main gate and admin block.', 'General', 'PU', 'Quaid-e-Azam Campus', 'Admin Block Road', '2024-10-11', 'pu_student@pu.edu.pk'],
  ['Found', 'Found Car Keys', 'Found a set of car keys (Toyota) near the parking area, Block A.', 'Wallets & Keys', 'BU', 'Islamabad Campus', 'Parking Area Block A', '2024-10-16', 'bu_finder@bahria.edu.pk'],
  ['Lost', 'Lost Navy Blue Jacket', 'Left my navy blue Levis jacket on a bench near Block C classrooms.', 'General', 'UET', 'Main Campus', 'Block C Lawn', '2024-10-13', 'uet_student@uet.edu.pk'],
  ['Found', 'Found Mathematics Textbook', 'Found a Calculus textbook by Stewart in the common room. Owner name written inside: Bilal.', 'Books & Notes', 'CUI', 'Wah Campus', 'Common Room', '2024-10-17', 'wah_finder@cui.edu.pk'],
  ['Lost', 'Lost Wallet — Brown Leather', 'Lost my brown leather wallet containing NIC, debit card and cash near the food court.', 'Wallets & Keys', 'AU', 'Islamabad Campus', 'Food Court', '2024-10-18', 'au_student@au.edu.pk'],
  ['Found', 'Found USB Drive 32GB', 'Found a 32GB Kingston USB drive in computer lab (Lab 3). Contains assignment files.', 'Electronics', 'BU', 'Lahore Campus', 'Computer Lab 3', '2024-10-19', 'bu_lahore@bahria.edu.pk'],
  ['Lost', 'Lost Stationery Pouch', 'Bright yellow pencil pouch with pens, pencils and a calculator, lost in lecture hall 5.', 'Books & Notes', 'NUST', 'NUST Islamabad', 'Lecture Hall 5', '2024-10-20', 'nust2@nust.edu.pk'],
  ['Found', 'Found Folding Black Umbrella', 'Found a folding black umbrella near the main gate guard post after the rainstorm.', 'General', 'PU', 'New Campus', 'Main Gate', '2024-10-21', 'pu_finder2@pu.edu.pk'],
];

async function seed() {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
  const bcrypt = require('bcryptjs');
  const db = require('../db');
  await db.ready;
  const { users, universities: universityCollection, campuses, reports, matches, counters } = db.collections();
  await Promise.all([users.deleteMany({}), universityCollection.deleteMany({}), campuses.deleteMany({}), reports.deleteMany({}), matches.deleteMany({}), counters.deleteMany({})]);

  const universityIds = {};
  const campusIds = {};
  for (const university of universities) {
    const id = await db.nextId('universities');
    universityIds[university.short_name] = id;
    await universityCollection.insertOne({ id, name: university.name, short_name: university.short_name });
    campusIds[university.short_name] = {};
    for (const [name, city] of university.campuses) {
      const campusId = await db.nextId('campuses');
      campusIds[university.short_name][name] = campusId;
      await campuses.insertOne({ id: campusId, university_id: id, name, city });
    }
  }

  const userId = await db.nextId('users');
  await users.insertOne({ id: userId, name: 'Demo User', email: DEMO_EMAIL, password_hash: await bcrypt.hash('demo1234', 10), created_at: new Date() });

  for (const [type, title, description, category, university, campus, location, eventDate, contact] of samples) {
    await reports.insertOne({
      id: await db.nextId('reports'), user_id: userId, type, title, description, category,
      university_id: universityIds[university], campus_id: campusIds[university][campus], location,
      event_date: eventDate, contact_email: contact, photo_url: null, status: 'Active',
      moderation_status: 'Approved', created_at: new Date(),
    });
  }

  console.log(`✓ MongoDB seed complete: ${universities.length} universities and ${samples.length} reports.`);
  console.log('✓ Demo user: demo@bagcheck.app / demo1234');
  await db.close();
}

if (require.main === module) {
  seed().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { universities, samples, DEMO_EMAIL };
