export type ReportType = 'Lost' | 'Found'

export interface Report {
  id: string
  title: string
  description: string
  type: ReportType
  university: string
  campus: string
  location: string
  eventDate: string
  photo?: string
}

export const sampleReports: Report[] = [
  {
    id: 'report-001',
    title: 'Black wireless earbuds',
    description:
      'Small black wireless earbuds in a charcoal charging case. The case has a tiny blue sticker on the lid.',
    type: 'Lost',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Library, second-floor study area',
    eventDate: '2026-05-14',
  },
  {
    id: 'report-002',
    title: 'Blue water bottle',
    description:
      'Reusable navy-blue steel bottle with a silver cap, left beside the classroom desks.',
    type: 'Found',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Block A, room A-204',
    eventDate: '2026-05-12',
  },
  {
    id: 'report-003',
    title: 'Student ID card',
    description:
      'A student card was found near the main walkway. The card is safely with the campus help desk.',
    type: 'Found',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Main walkway near the cafeteria',
    eventDate: '2026-05-11',
  },
  {
    id: 'report-004',
    title: 'Grey laptop sleeve',
    description:
      'Grey fabric sleeve for a 13-inch laptop, with a small front pocket and no visible label.',
    type: 'Lost',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Computer science lab, Block B',
    eventDate: '2026-05-09',
  },
  {
    id: 'report-005',
    title: 'Set of two keys',
    description:
      'Two silver keys on a plain brass key ring. No keychain or identifying tags attached.',
    type: 'Found',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Outside the student centre',
    eventDate: '2026-05-07',
  },
  {
    id: 'report-006',
    title: 'Brown leather wallet',
    description:
      'Slim brown wallet misplaced after class. It has a stitched edge and contains no cash.',
    type: 'Lost',
    university: 'COMSATS University Islamabad',
    campus: 'Lahore Campus',
    location: 'Block C lecture hall',
    eventDate: '2026-05-05',
  },
  {
    id: 'report-007',
    title: 'White wireless earbuds',
    description:
      'White earbuds in a compact white charging case, found during the afternoon break.',
    type: 'Found',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'Central Library, ground floor',
    eventDate: '2026-05-13',
  },
  {
    id: 'report-008',
    title: 'Green notebook',
    description:
      'A5 green notebook with handwritten lecture notes. The cover has a small leaf design.',
    type: 'Lost',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'Arts faculty lecture rooms',
    eventDate: '2026-05-12',
  },
  {
    id: 'report-009',
    title: 'Black umbrella',
    description:
      'Foldable black umbrella with a curved wooden-look handle, left behind after a class.',
    type: 'Found',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'Student services building entrance',
    eventDate: '2026-05-10',
  },
  {
    id: 'report-010',
    title: 'Silver wristwatch',
    description:
      'A silver analogue wristwatch with a dark face. The clasp appears to be in good condition.',
    type: 'Lost',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'Sports complex seating area',
    eventDate: '2026-05-08',
  },
  {
    id: 'report-011',
    title: 'Red USB flash drive',
    description:
      'Small red USB drive with a black cap. Found near the computer workstations.',
    type: 'Found',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'IT lab, science block',
    eventDate: '2026-05-06',
  },
  {
    id: 'report-012',
    title: 'Canvas tote bag',
    description:
      'Natural-colour canvas tote with a blue printed design. Last seen after a morning lecture.',
    type: 'Lost',
    university: 'University of the Punjab',
    campus: 'Quaid-e-Azam Campus',
    location: 'Near the main auditorium',
    eventDate: '2026-05-03',
  },
]
