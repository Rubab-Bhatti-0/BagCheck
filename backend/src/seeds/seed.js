'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const db     = require('../db');

async function seed() {
  // Wait for migrations to finish before clearing or inserting data.
  await db.ready;

  // Clear data
  await db('matches').del();
  await db('reports').del();
  await db('campuses').del();
  await db('universities').del();
  await db('users').del();

  // ── Universities & Campuses ──────────────────────────────────────────────
  const universities = [
    { name: 'COMSATS University Islamabad', short_name: 'CUI', campuses: [
        { name: 'Lahore Campus',     city: 'Lahore' },
        { name: 'Islamabad Campus',  city: 'Islamabad' },
        { name: 'Wah Campus',        city: 'Wah Cantt' },
        { name: 'Abbottabad Campus', city: 'Abbottabad' },
    ]},
    { name: 'University of the Punjab', short_name: 'PU', campuses: [
        { name: 'Quaid-e-Azam Campus', city: 'Lahore' },
        { name: 'New Campus',          city: 'Lahore' },
    ]},
    { name: 'NUST', short_name: 'NUST', campuses: [
        { name: 'H-12 Campus',    city: 'Islamabad' },
        { name: 'NUST Islamabad', city: 'Islamabad' },
    ]},
    { name: 'Bahria University', short_name: 'BU', campuses: [
        { name: 'Islamabad Campus', city: 'Islamabad' },
        { name: 'Lahore Campus',    city: 'Lahore' },
        { name: 'Karachi Campus',   city: 'Karachi' },
    ]},
    { name: 'UET Lahore', short_name: 'UET', campuses: [
        { name: 'Main Campus', city: 'Lahore' },
        { name: 'KSK Campus',  city: 'Lahore' },
    ]},
    { name: 'LUMS', short_name: 'LUMS', campuses: [
        { name: 'Main Campus (Lahore)', city: 'Lahore' },
    ]},
    { name: 'Air University', short_name: 'AU', campuses: [
        { name: 'Islamabad Campus', city: 'Islamabad' },
    ]},
  ];

  const uniIds    = {};
  const campusIds = {};

  for (const uni of universities) {
    const [uniId] = await db('universities').insert({ name: uni.name, short_name: uni.short_name });
    uniIds[uni.short_name] = uniId;
    campusIds[uni.short_name] = {};
    for (const campus of uni.campuses) {
      const [cId] = await db('campuses').insert({ university_id: uniId, name: campus.name, city: campus.city });
      campusIds[uni.short_name][campus.name] = cId;
    }
  }
  console.log('✓ Universities and campuses seeded.');

  // ── Demo user ────────────────────────────────────────────────────────────
  const password_hash = await bcrypt.hash('demo1234', 10);
  const [demoUserId]  = await db('users').insert({ name: 'Demo User', email: 'demo@bagcheck.app', password_hash });
  console.log('✓ Demo user: demo@bagcheck.app / demo1234');

  // ── Sample Reports ───────────────────────────────────────────────────────
  const samples = [
    { type:'Lost',  title:'Lost Black Backpack',          description:'Lost a black Nike backpack near the library. Contains laptop and books.',                        category:'General',           uni:'CUI',  campus:'Lahore Campus',         location:'Library Block',          event_date:'2024-10-10', contact:'student1@cui.edu.pk' },
    { type:'Found', title:'Found Student ID Card',        description:'Found a COMSATS student ID card near the cafeteria. Name: Ayesha Khan.',                        category:'Student Cards & IDs', uni:'CUI',  campus:'Islamabad Campus',       location:'Main Cafeteria',         event_date:'2024-10-12', contact:'finder1@cui.edu.pk' },
    { type:'Lost',  title:'Lost iPhone 13 Blue',          description:'Lost my blue iPhone 13 in the CS department hallway. Has a cracked back cover.',                category:'Electronics',         uni:'NUST', campus:'H-12 Campus',            location:'CS Dept 2nd Floor',      event_date:'2024-10-15', contact:'nust_student@nust.edu.pk' },
    { type:'Found', title:'Found Wireless Earbuds',       description:'Found a pair of Samsung Galaxy Buds in a white case near the sports ground.',                   category:'Electronics',         uni:'LUMS', campus:'Main Campus (Lahore)',    location:'Sports Ground',          event_date:'2024-10-14', contact:'lums_finder@lums.edu.pk' },
    { type:'Lost',  title:'Lost Prescription Glasses',    description:'Brown frame prescription glasses lost between the main gate and admin block.',                  category:'General',             uni:'PU',   campus:'Quaid-e-Azam Campus',    location:'Admin Block Road',       event_date:'2024-10-11', contact:'pu_student@pu.edu.pk' },
    { type:'Found', title:'Found Car Keys',               description:'Found a set of car keys (Toyota) near the parking area, Block A.',                              category:'Wallets & Keys',      uni:'BU',   campus:'Islamabad Campus',       location:'Parking Area Block A',   event_date:'2024-10-16', contact:'bu_finder@bahria.edu.pk' },
    { type:'Lost',  title:'Lost Navy Blue Jacket',        description:'Left my navy blue Levis jacket on a bench near Block C classrooms.',                            category:'General',             uni:'UET',  campus:'Main Campus',            location:'Block C Lawn',           event_date:'2024-10-13', contact:'uet_student@uet.edu.pk' },
    { type:'Found', title:'Found Mathematics Textbook',   description:'Found a Calculus textbook by Stewart in the common room. Owner name written inside: Bilal.',    category:'Books & Notes',       uni:'CUI',  campus:'Wah Campus',             location:'Common Room',            event_date:'2024-10-17', contact:'wah_finder@cui.edu.pk' },
    { type:'Lost',  title:'Lost Wallet — Brown Leather',  description:'Lost my brown leather wallet containing NIC, debit card and cash near the food court.',         category:'Wallets & Keys',      uni:'AU',   campus:'Islamabad Campus',       location:'Food Court',             event_date:'2024-10-18', contact:'au_student@au.edu.pk' },
    { type:'Found', title:'Found USB Drive 32GB',         description:'Found a 32GB Kingston USB drive in computer lab (Lab 3). Contains assignment files.',           category:'Electronics',         uni:'BU',   campus:'Lahore Campus',          location:'Computer Lab 3',         event_date:'2024-10-19', contact:'bu_lahore@bahria.edu.pk' },
    { type:'Lost',  title:'Lost Stationery Pouch',        description:'Bright yellow pencil pouch with pens, pencils and a calculator, lost in lecture hall 5.',       category:'Books & Notes',       uni:'NUST', campus:'NUST Islamabad',         location:'Lecture Hall 5',         event_date:'2024-10-20', contact:'nust2@nust.edu.pk' },
    { type:'Found', title:'Found Folding Black Umbrella', description:'Found a folding black umbrella near the main gate guard post after the rainstorm.',              category:'General',             uni:'PU',   campus:'New Campus',             location:'Main Gate',              event_date:'2024-10-21', contact:'pu_finder2@pu.edu.pk' },
  ];

  for (const s of samples) {
    await db('reports').insert({
      user_id:           demoUserId,
      type:              s.type,
      title:             s.title,
      description:       s.description,
      category:          s.category,
      university_id:     uniIds[s.uni],
      campus_id:         campusIds[s.uni][s.campus],
      location:          s.location,
      event_date:        s.event_date,
      contact_email:     s.contact,
      status:            'Active',
      moderation_status: 'Approved',
    });
  }

  console.log(`✓ ${samples.length} sample reports seeded.`);
  console.log('\nSeed complete! Run: npm run dev');
  await db.destroy();
}

seed().catch((err) => { console.error(err); process.exit(1); });
