import { Institution, InstitutionType } from '../types.js';

export const DEFAULT_INSTITUTION_ID = 'fuwukari';
export const DEFAULT_INSTITUTION_CAMPUS = 'Main Campus (Wukari)';

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Institutions' },
  { value: 'Federal University', label: 'Federal Universities' },
  { value: 'State University', label: 'State Universities' },
  { value: 'Private University', label: 'Private Universities' },
  { value: 'Federal Polytechnic', label: 'Federal Polytechnics' },
  { value: 'State Polytechnic', label: 'State Polytechnics' },
  { value: 'Private Polytechnic', label: 'Private Polytechnics' },
  { value: 'College of Education', label: 'Colleges of Education' }
];

export const VERIFIED_NIGERIAN_INSTITUTIONS: Institution[] = [
  // ================= FEDERAL UNIVERSITIES =================
  {
    id: 'fuwukari',
    name: 'Federal University Wukari',
    shortName: 'FUWUKARI',
    type: 'Federal University',
    state: 'Taraba',
    location: 'Wukari',
    campuses: ['Main Campus (Wukari)', 'New Site', 'Wukari Town'],
    campus: 'Main Campus (Wukari)',
    status: 'active',
    isDefault: true
  },
  {
    id: 'unilag',
    name: 'University of Lagos',
    shortName: 'UNILAG',
    type: 'Federal University',
    state: 'Lagos',
    location: 'Akoka, Yaba',
    campuses: ['Akoka Campus', 'Idi-Araba (CMUL)'],
    campus: 'Akoka Campus',
    status: 'active'
  },
  {
    id: 'ui',
    name: 'University of Ibadan',
    shortName: 'UI',
    type: 'Federal University',
    state: 'Oyo',
    location: 'Ibadan',
    campuses: ['Main Campus (Ibadan)', 'UCH Medical Campus'],
    campus: 'Main Campus (Ibadan)',
    status: 'active'
  },
  {
    id: 'abu',
    name: 'Ahmadu Bello University',
    shortName: 'ABU Zaria',
    type: 'Federal University',
    state: 'Kaduna',
    location: 'Zaria',
    campuses: ['Samaru Campus', 'Kongo Campus'],
    campus: 'Samaru Campus',
    status: 'active'
  },
  {
    id: 'unn',
    name: 'University of Nigeria, Nsukka',
    shortName: 'UNN',
    type: 'Federal University',
    state: 'Enugu',
    location: 'Nsukka',
    campuses: ['Nsukka Campus', 'Enugu Campus (UNEC)', 'Ituku-Ozalla'],
    campus: 'Nsukka Campus',
    status: 'active'
  },
  {
    id: 'oau',
    name: 'Obafemi Awolowo University',
    shortName: 'OAU',
    type: 'Federal University',
    state: 'Osun',
    location: 'Ile-Ife',
    campuses: ['Main Campus (Ile-Ife)'],
    campus: 'Main Campus (Ile-Ife)',
    status: 'active'
  },
  {
    id: 'uniben',
    name: 'University of Benin',
    shortName: 'UNIBEN',
    type: 'Federal University',
    state: 'Edo',
    location: 'Benin City',
    campuses: ['Ugbowo Campus', 'Ekehuan Campus'],
    campus: 'Ugbowo Campus',
    status: 'active'
  },
  {
    id: 'unilorin',
    name: 'University of Ilorin',
    shortName: 'UNILORIN',
    type: 'Federal University',
    state: 'Kwara',
    location: 'Ilorin',
    campuses: ['Permanent Site (Tanke)', 'Mini Campus'],
    campus: 'Permanent Site (Tanke)',
    status: 'active'
  },
  {
    id: 'uniport',
    name: 'University of Port Harcourt',
    shortName: 'UNIPORT',
    type: 'Federal University',
    state: 'Rivers',
    location: 'Choba, Port Harcourt',
    campuses: ['Abuja Park', 'Delta Park', 'Choba Park'],
    campus: 'Abuja Park',
    status: 'active'
  },
  {
    id: 'unical',
    name: 'University of Calabar',
    shortName: 'UNICAL',
    type: 'Federal University',
    state: 'Cross River',
    location: 'Calabar',
    campuses: ['Main Campus (Malabor)'],
    campus: 'Main Campus (Malabor)',
    status: 'active'
  },
  {
    id: 'unijos',
    name: 'University of Jos',
    shortName: 'UNIJOS',
    type: 'Federal University',
    state: 'Plateau',
    location: 'Jos',
    campuses: ['Bauchi Road Campus', 'Naraguta (Permanent Site)', 'Lamingo'],
    campus: 'Naraguta (Permanent Site)',
    status: 'active'
  },
  {
    id: 'unimaid',
    name: 'University of Maiduguri',
    shortName: 'UNIMAID',
    type: 'Federal University',
    state: 'Borno',
    location: 'Maiduguri',
    campuses: ['Main Campus (Bama Road)'],
    campus: 'Main Campus (Bama Road)',
    status: 'active'
  },
  {
    id: 'buk',
    name: 'Bayero University, Kano',
    shortName: 'BUK',
    type: 'Federal University',
    state: 'Kano',
    location: 'Kano',
    campuses: ['New Campus (Gwarzo Road)', 'Old Campus (BUC)'],
    campus: 'New Campus (Gwarzo Road)',
    status: 'active'
  },
  {
    id: 'uniabuja',
    name: 'University of Abuja',
    shortName: 'UNIABUJA',
    type: 'Federal University',
    state: 'FCT - Abuja',
    location: 'Gwagwalada, Abuja',
    campuses: ['Main Campus (Airport Road)', 'Mini Campus (Gwagwalada)'],
    campus: 'Main Campus (Airport Road)',
    status: 'active'
  },
  {
    id: 'futa',
    name: 'Federal University of Technology, Akure',
    shortName: 'FUTA',
    type: 'Federal University',
    state: 'Ondo',
    location: 'Akure',
    campuses: ['Obanla Main Campus'],
    campus: 'Obanla Main Campus',
    status: 'active'
  },
  {
    id: 'futminna',
    name: 'Federal University of Technology, Minna',
    shortName: 'FUTMINNA',
    type: 'Federal University',
    state: 'Niger',
    location: 'Minna',
    campuses: ['Gidan Kwano Campus', 'Bosso Campus'],
    campus: 'Gidan Kwano Campus',
    status: 'active'
  },
  {
    id: 'futo',
    name: 'Federal University of Technology, Owerri',
    shortName: 'FUTO',
    type: 'Federal University',
    state: 'Imo',
    location: 'Owerri',
    campuses: ['Ihiagwa Main Campus'],
    campus: 'Ihiagwa Main Campus',
    status: 'active'
  },
  {
    id: 'atbu',
    name: 'Abubakar Tafawa Balewa University',
    shortName: 'ATBU',
    type: 'Federal University',
    state: 'Bauchi',
    location: 'Bauchi',
    campuses: ['Yelwa Campus', 'Gubi Permanent Site'],
    campus: 'Yelwa Campus',
    status: 'active'
  },
  {
    id: 'mautech',
    name: 'Modibbo Adama University, Yola',
    shortName: 'MAU Yola',
    type: 'Federal University',
    state: 'Adamawa',
    location: 'Yola',
    campuses: ['Girei Main Campus'],
    campus: 'Girei Main Campus',
    status: 'active'
  },
  {
    id: 'udusok',
    name: 'Usmanu Danfodiyo University, Sokoto',
    shortName: 'UDUSOK',
    type: 'Federal University',
    state: 'Sokoto',
    location: 'Sokoto',
    campuses: ['Main Campus (Dundaye)', 'City Campus'],
    campus: 'Main Campus (Dundaye)',
    status: 'active'
  },
  {
    id: 'uniuyo',
    name: 'University of Uyo',
    shortName: 'UNIUYO',
    type: 'Federal University',
    state: 'Akwa Ibom',
    location: 'Uyo',
    campuses: ['Main Campus (Nwaniba)', 'Town Campus'],
    campus: 'Main Campus (Nwaniba)',
    status: 'active'
  },
  {
    id: 'unizik',
    name: 'Nnamdi Azikiwe University',
    shortName: 'UNIZIK',
    type: 'Federal University',
    state: 'Anambra',
    location: 'Awka',
    campuses: ['Awka Main Campus', 'Nnewi Campus', 'Agulu Campus'],
    campus: 'Awka Main Campus',
    status: 'active'
  },
  {
    id: 'funaab',
    name: 'Federal University of Agriculture, Abeokuta',
    shortName: 'FUNAAB',
    type: 'Federal University',
    state: 'Ogun',
    location: 'Abeokuta',
    campuses: ['Alabata Campus'],
    campus: 'Alabata Campus',
    status: 'active'
  },
  {
    id: 'mouau',
    name: 'Michael Okpara University of Agriculture, Umudike',
    shortName: 'MOUAU',
    type: 'Federal University',
    state: 'Abia',
    location: 'Umudike, Umuahia',
    campuses: ['Umudike Main Campus'],
    campus: 'Umudike Main Campus',
    status: 'active'
  },
  {
    id: 'joel-tarka',
    name: 'Joseph Sarwuan Tarka University, Makurdi',
    shortName: 'JOSTUM',
    type: 'Federal University',
    state: 'Benue',
    location: 'Makurdi',
    campuses: ['North Core', 'South Core'],
    campus: 'North Core',
    status: 'active'
  },
  {
    id: 'fulafia',
    name: 'Federal University of Lafia',
    shortName: 'FULAFIA',
    type: 'Federal University',
    state: 'Nasarawa',
    location: 'Lafia',
    campuses: ['Permanent Site (Obi Road)', 'Take-Off Site'],
    campus: 'Permanent Site (Obi Road)',
    status: 'active'
  },
  {
    id: 'fulokoja',
    name: 'Federal University Lokoja',
    shortName: 'FULOKOJA',
    type: 'Federal University',
    state: 'Kogi',
    location: 'Lokoja',
    campuses: ['Felele Permanent Site', 'Adankolo Campus'],
    campus: 'Felele Permanent Site',
    status: 'active'
  },
  {
    id: 'fuoye',
    name: 'Federal University Oye-Ekiti',
    shortName: 'FUOYE',
    type: 'Federal University',
    state: 'Ekiti',
    location: 'Oye-Ekiti',
    campuses: ['Oye-Ekiti Campus', 'Ikole-Ekiti Campus'],
    campus: 'Oye-Ekiti Campus',
    status: 'active'
  },
  {
    id: 'fupre',
    name: 'Federal University of Petroleum Resources, Effurun',
    shortName: 'FUPRE',
    type: 'Federal University',
    state: 'Delta',
    location: 'Effurun',
    campuses: ['Ugbomro Main Campus'],
    campus: 'Ugbomro Main Campus',
    status: 'active'
  },
  {
    id: 'fuo',
    name: 'Federal University Otuoke',
    shortName: 'FUOTUOKE',
    type: 'Federal University',
    state: 'Bayelsa',
    location: 'Otuoke',
    campuses: ['Otuoke Main Campus'],
    campus: 'Otuoke Main Campus',
    status: 'active'
  },
  {
    id: 'fud',
    name: 'Federal University Dutse',
    shortName: 'FUD',
    type: 'Federal University',
    state: 'Jigawa',
    location: 'Dutse',
    campuses: ['Ibrahim Aliyu Bye-Pass Campus'],
    campus: 'Ibrahim Aliyu Bye-Pass Campus',
    status: 'active'
  },
  {
    id: 'fudma',
    name: 'Federal University Dutsin-Ma',
    shortName: 'FUDMA',
    type: 'Federal University',
    state: 'Katsina',
    location: 'Dutsin-Ma',
    campuses: ['Permanent Site (Turare)', 'Take-Off Campus'],
    campus: 'Permanent Site (Turare)',
    status: 'active'
  },
  {
    id: 'fubk',
    name: 'Federal University Birnin Kebbi',
    shortName: 'FUBK',
    type: 'Federal University',
    state: 'Kebbi',
    location: 'Birnin Kebbi',
    campuses: ['Kalgo Permanent Site'],
    campus: 'Kalgo Permanent Site',
    status: 'active'
  },
  {
    id: 'fugashua',
    name: 'Federal University Gashua',
    shortName: 'FUGASHUA',
    type: 'Federal University',
    state: 'Yobe',
    location: 'Gashua',
    campuses: ['Main Campus (Sabon Gari)'],
    campus: 'Main Campus (Sabon Gari)',
    status: 'active'
  },
  {
    id: 'fugusau',
    name: 'Federal University Gusau',
    shortName: 'FUGUS',
    type: 'Federal University',
    state: 'Zamfara',
    location: 'Gusau',
    campuses: ['Sabon Gida Main Campus'],
    campus: 'Sabon Gida Main Campus',
    status: 'active'
  },
  {
    id: 'fukashere',
    name: 'Federal University of Kashere',
    shortName: 'FUKASHERE',
    type: 'Federal University',
    state: 'Gombe',
    location: 'Kashere',
    campuses: ['Kashere Main Campus'],
    campus: 'Kashere Main Campus',
    status: 'active'
  },
  {
    id: 'funai',
    name: 'Alex Ekwueme Federal University, Ndufu-Alike',
    shortName: 'AE-FUNAI',
    type: 'Federal University',
    state: 'Ebonyi',
    location: 'Ikwo',
    campuses: ['Ndufu-Alike Main Campus'],
    campus: 'Ndufu-Alike Main Campus',
    status: 'active'
  },
  {
    id: 'noun',
    name: 'National Open University of Nigeria',
    shortName: 'NOUN',
    type: 'Federal University',
    state: 'FCT - Abuja',
    location: 'Jabi, Abuja',
    campuses: ['Abuja Study Centre', 'Lagos Study Centre', 'Nationwide Centres'],
    campus: 'Abuja Study Centre',
    status: 'active'
  },
  {
    id: 'nda',
    name: 'Nigerian Defence Academy',
    shortName: 'NDA',
    type: 'Federal University',
    state: 'Kaduna',
    location: 'Kaduna',
    campuses: ['Afaka Permanent Site', 'Ribadu Campus'],
    campus: 'Afaka Permanent Site',
    status: 'active'
  },

  // ================= STATE UNIVERSITIES =================
  {
    id: 'tsuw',
    name: 'Taraba State University',
    shortName: 'TSU Jalingo',
    type: 'State University',
    state: 'Taraba',
    location: 'Jalingo',
    campuses: ['Jalingo Main Campus'],
    campus: 'Jalingo Main Campus',
    status: 'active'
  },
  {
    id: 'lasu',
    name: 'Lagos State University',
    shortName: 'LASU',
    type: 'State University',
    state: 'Lagos',
    location: 'Ojo, Lagos',
    campuses: ['Ojo Main Campus', 'Epe Campus', 'Ikeja (LASUCOM)'],
    campus: 'Ojo Main Campus',
    status: 'active'
  },
  {
    id: 'lasustech',
    name: 'Lagos State University of Science and Technology',
    shortName: 'LASUSTECH',
    type: 'State University',
    state: 'Lagos',
    location: 'Ikorodu',
    campuses: ['Ikorodu Campus', 'Isolo Campus', 'Surulere Campus'],
    campus: 'Ikorodu Campus',
    status: 'active'
  },
  {
    id: 'eksu',
    name: 'Ekiti State University',
    shortName: 'EKSU',
    type: 'State University',
    state: 'Ekiti',
    location: 'Ado-Ekiti',
    campuses: ['Iworoko Road Campus'],
    campus: 'Iworoko Road Campus',
    status: 'active'
  },
  {
    id: 'oou',
    name: 'Olabisi Onabanjo University',
    shortName: 'OOU',
    type: 'State University',
    state: 'Ogun',
    location: 'Ago-Iwoye',
    campuses: ['Ago-Iwoye Main Campus', 'Ibogun Campus', 'Sagamu Campus'],
    campus: 'Ago-Iwoye Main Campus',
    status: 'active'
  },
  {
    id: 'tasued',
    name: 'Tai Solarin University of Education',
    shortName: 'TASUED',
    type: 'State University',
    state: 'Ogun',
    location: 'Ijagun, Ijebu-Ode',
    campuses: ['Ijagun Main Campus'],
    campus: 'Ijagun Main Campus',
    status: 'active'
  },
  {
    id: 'aaua',
    name: 'Adekunle Ajasin University',
    shortName: 'AAUA',
    type: 'State University',
    state: 'Ondo',
    location: 'Akungba-Akoko',
    campuses: ['Akungba-Akoko Campus'],
    campus: 'Akungba-Akoko Campus',
    status: 'active'
  },
  {
    id: 'delsu',
    name: 'Delta State University',
    shortName: 'DELSU',
    type: 'State University',
    state: 'Delta',
    location: 'Abraka',
    campuses: ['Abraka Campus', 'Oleh Campus'],
    campus: 'Abraka Campus',
    status: 'active'
  },
  {
    id: 'rsu',
    name: 'Rivers State University',
    shortName: 'RSU',
    type: 'State University',
    state: 'Rivers',
    location: 'Nkpolu-Oroworukwo, Port Harcourt',
    campuses: ['Port Harcourt Main Campus'],
    campus: 'Port Harcourt Main Campus',
    status: 'active'
  },
  {
    id: 'iaue',
    name: 'Ignatius Ajuru University of Education',
    shortName: 'IAUE',
    type: 'State University',
    state: 'Rivers',
    location: 'Rumuolumeni, Port Harcourt',
    campuses: ['Rumuolumeni Campus', 'St. Johns Campus'],
    campus: 'Rumuolumeni Campus',
    status: 'active'
  },
  {
    id: 'esut',
    name: 'Enugu State University of Science and Technology',
    shortName: 'ESUT',
    type: 'State University',
    state: 'Enugu',
    location: 'Agbani, Enugu',
    campuses: ['Agbani Permanent Site', 'Enugu Campus'],
    campus: 'Agbani Permanent Site',
    status: 'active'
  },
  {
    id: 'ebsu',
    name: 'Ebonyi State University',
    shortName: 'EBSU',
    type: 'State University',
    state: 'Ebonyi',
    location: 'Abakaliki',
    campuses: ['CAS Campus', 'ISHIEKE Campus', 'Permanent Site'],
    campus: 'Permanent Site',
    status: 'active'
  },
  {
    id: 'imsu',
    name: 'Imo State University',
    shortName: 'IMSU',
    type: 'State University',
    state: 'Imo',
    location: 'Owerri',
    campuses: ['Owerri Main Campus'],
    campus: 'Owerri Main Campus',
    status: 'active'
  },
  {
    id: 'absu',
    name: 'Abia State University',
    shortName: 'ABSU',
    type: 'State University',
    state: 'Abia',
    location: 'Uturu',
    campuses: ['Uturu Main Campus', 'Umuahia Campus'],
    campus: 'Uturu Main Campus',
    status: 'active'
  },
  {
    id: 'coou',
    name: 'Chukwuemeka Odumegwu Ojukwu University',
    shortName: 'COOU',
    type: 'State University',
    state: 'Anambra',
    location: 'Uli / Igbariam',
    campuses: ['Igbariam Campus', 'Uli Campus', 'Awka Medical Campus'],
    campus: 'Igbariam Campus',
    status: 'active'
  },
  {
    id: 'aauekpoma',
    name: 'Ambrose Alli University',
    shortName: 'AAU Ekpoma',
    type: 'State University',
    state: 'Edo',
    location: 'Ekpoma',
    campuses: ['Ekpoma Main Campus'],
    campus: 'Ekpoma Main Campus',
    status: 'active'
  },
  {
    id: 'aksu',
    name: 'Akwa Ibom State University',
    shortName: 'AKSU',
    type: 'State University',
    state: 'Akwa Ibom',
    location: 'Ikot Akpaden',
    campuses: ['Ikot Akpaden Campus', 'Obio Akpa Campus'],
    campus: 'Ikot Akpaden Campus',
    status: 'active'
  },
  {
    id: 'unicross',
    name: 'University of Cross River State',
    shortName: 'UNICROSS',
    type: 'State University',
    state: 'Cross River',
    location: 'Calabar',
    campuses: ['Calabar Main Campus', 'Ogoja Campus', 'Obubra Campus'],
    campus: 'Calabar Main Campus',
    status: 'active'
  },
  {
    id: 'lautech',
    name: 'Ladoke Akintola University of Technology',
    shortName: 'LAUTECH',
    type: 'State University',
    state: 'Oyo',
    location: 'Ogbomoso',
    campuses: ['Ogbomoso Main Campus'],
    campus: 'Ogbomoso Main Campus',
    status: 'active'
  },
  {
    id: 'kwasu',
    name: 'Kwara State University',
    shortName: 'KWASU',
    type: 'State University',
    state: 'Kwara',
    location: 'Malete',
    campuses: ['Malete Main Campus'],
    campus: 'Malete Main Campus',
    status: 'active'
  },
  {
    id: 'bsum',
    name: 'Benue State University',
    shortName: 'BSU Makurdi',
    type: 'State University',
    state: 'Benue',
    location: 'Makurdi',
    campuses: ['Main Campus (Makurdi)'],
    campus: 'Main Campus (Makurdi)',
    status: 'active'
  },
  {
    id: 'nsuk',
    name: 'Nasarawa State University, Keffi',
    shortName: 'NSUK',
    type: 'State University',
    state: 'Nasarawa',
    location: 'Keffi',
    campuses: ['Keffi Main Campus', 'Lafia Campus', 'Pyanku Campus'],
    campus: 'Keffi Main Campus',
    status: 'active'
  },
  {
    id: 'kasu',
    name: 'Kaduna State University',
    shortName: 'KASU',
    type: 'State University',
    state: 'Kaduna',
    location: 'Kaduna',
    campuses: ['Kaduna Main Campus', 'Kafanchan Campus'],
    campus: 'Kaduna Main Campus',
    status: 'active'
  },
  {
    id: 'adsu',
    name: 'Adamawa State University',
    shortName: 'ADSU Mubi',
    type: 'State University',
    state: 'Adamawa',
    location: 'Mubi',
    campuses: ['Mubi Main Campus'],
    campus: 'Mubi Main Campus',
    status: 'active'
  },
  {
    id: 'gsu',
    name: 'Gombe State University',
    shortName: 'GSU',
    type: 'State University',
    state: 'Gombe',
    location: 'Gombe',
    campuses: ['Tudun Wada Main Campus'],
    campus: 'Tudun Wada Main Campus',
    status: 'active'
  },
  {
    id: 'basug',
    name: 'Bauchi State University, Gadau',
    shortName: 'BASUG',
    type: 'State University',
    state: 'Bauchi',
    location: 'Gadau',
    campuses: ['Gadau Main Campus', 'Misau Campus', 'Bauchi Yuli Campus'],
    campus: 'Gadau Main Campus',
    status: 'active'
  },
  {
    id: 'ibbu',
    name: 'Ibrahim Badamasi Babangida University',
    shortName: 'IBBUL',
    type: 'State University',
    state: 'Niger',
    location: 'Lapai',
    campuses: ['Lapai Main Campus'],
    campus: 'Lapai Main Campus',
    status: 'active'
  },
  {
    id: 'umyu',
    name: 'Umaru Musa Yaradua University',
    shortName: 'UMYU',
    type: 'State University',
    state: 'Katsina',
    location: 'Katsina',
    campuses: ['Katsina Main Campus'],
    campus: 'Katsina Main Campus',
    status: 'active'
  },
  {
    id: 'ysu',
    name: 'Yobe State University',
    shortName: 'YSU',
    type: 'State University',
    state: 'Yobe',
    location: 'Damaturu',
    campuses: ['Damaturu Main Campus'],
    campus: 'Damaturu Main Campus',
    status: 'active'
  },
  {
    id: 'ksusta',
    name: 'Kebbi State University of Science and Technology',
    shortName: 'KSUSTA',
    type: 'State University',
    state: 'Kebbi',
    location: 'Aliero',
    campuses: ['Aliero Campus'],
    campus: 'Aliero Campus',
    status: 'active'
  },
  {
    id: 'unimed',
    name: 'University of Medical Sciences, Ondo',
    shortName: 'UNIMED',
    type: 'State University',
    state: 'Ondo',
    location: 'Ondo City',
    campuses: ['Laje Campus', 'Odoshida Campus'],
    campus: 'Laje Campus',
    status: 'active'
  },

  // ================= PRIVATE UNIVERSITIES =================
  {
    id: 'kwararafa',
    name: 'Kwararafa University, Wukari',
    shortName: 'KUW Wukari',
    type: 'Private University',
    state: 'Taraba',
    location: 'Wukari',
    campuses: ['Wukari Main Campus'],
    campus: 'Wukari Main Campus',
    status: 'active'
  },
  {
    id: 'covenant',
    name: 'Covenant University',
    shortName: 'Covenant',
    type: 'Private University',
    state: 'Ogun',
    location: 'Ota',
    campuses: ['Canaanland Campus'],
    campus: 'Canaanland Campus',
    status: 'active'
  },
  {
    id: 'babcock',
    name: 'Babcock University',
    shortName: 'Babcock',
    type: 'Private University',
    state: 'Ogun',
    location: 'Ilishan-Remo',
    campuses: ['Ilishan-Remo Main Campus', 'Iperu Campus'],
    campus: 'Ilishan-Remo Main Campus',
    status: 'active'
  },
  {
    id: 'abuad',
    name: 'Afe Babalola University',
    shortName: 'ABUAD',
    type: 'Private University',
    state: 'Ekiti',
    location: 'Ado-Ekiti',
    campuses: ['Ado-Ekiti Main Campus'],
    campus: 'Ado-Ekiti Main Campus',
    status: 'active'
  },
  {
    id: 'landmark',
    name: 'Landmark University',
    shortName: 'Landmark',
    type: 'Private University',
    state: 'Kwara',
    location: 'Omu-Aran',
    campuses: ['Omu-Aran Campus'],
    campus: 'Omu-Aran Campus',
    status: 'active'
  },
  {
    id: 'bowen',
    name: 'Bowen University',
    shortName: 'Bowen',
    type: 'Private University',
    state: 'Osun',
    location: 'Iwo',
    campuses: ['Iwo Main Campus'],
    campus: 'Iwo Main Campus',
    status: 'active'
  },
  {
    id: 'igbinedion',
    name: 'Igbinedion University, Okada',
    shortName: 'IUO Okada',
    type: 'Private University',
    state: 'Edo',
    location: 'Okada',
    campuses: ['Okada Main Campus'],
    campus: 'Okada Main Campus',
    status: 'active'
  },
  {
    id: 'baze',
    name: 'Baze University',
    shortName: 'Baze Abuja',
    type: 'Private University',
    state: 'FCT - Abuja',
    location: 'Jabi, Abuja',
    campuses: ['Abuja Main Campus'],
    campus: 'Abuja Main Campus',
    status: 'active'
  },
  {
    id: 'nile',
    name: 'Nile University of Nigeria',
    shortName: 'Nile Abuja',
    type: 'Private University',
    state: 'FCT - Abuja',
    location: 'Abuja',
    campuses: ['Jabi Main Campus'],
    campus: 'Jabi Main Campus',
    status: 'active'
  },
  {
    id: 'veritas',
    name: 'Veritas University',
    shortName: 'Veritas Abuja',
    type: 'Private University',
    state: 'FCT - Abuja',
    location: 'Bwari, Abuja',
    campuses: ['Bwari Permanent Site'],
    campus: 'Bwari Permanent Site',
    status: 'active'
  },
  {
    id: 'bingham',
    name: 'Bingham University',
    shortName: 'Bingham',
    type: 'Private University',
    state: 'Nasarawa',
    location: 'Karu',
    campuses: ['Karu Main Campus'],
    campus: 'Karu Main Campus',
    status: 'active'
  },
  {
    id: 'aun',
    name: 'American University of Nigeria',
    shortName: 'AUN Yola',
    type: 'Private University',
    state: 'Adamawa',
    location: 'Yola',
    campuses: ['Yola Main Campus'],
    campus: 'Yola Main Campus',
    status: 'active'
  },
  {
    id: 'redeemers',
    name: "Redeemer's University",
    shortName: 'RUN Ede',
    type: 'Private University',
    state: 'Osun',
    location: 'Ede',
    campuses: ['Ede Main Campus'],
    campus: 'Ede Main Campus',
    status: 'active'
  },
  {
    id: 'pau',
    name: 'Pan-Atlantic University',
    shortName: 'PAU',
    type: 'Private University',
    state: 'Lagos',
    location: 'Ibeju-Lekki',
    campuses: ['Ibeju-Lekki Campus', 'Victoria Island (LBS)'],
    campus: 'Ibeju-Lekki Campus',
    status: 'active'
  },
  {
    id: 'lead-city',
    name: 'Lead City University',
    shortName: 'LCU Ibadan',
    type: 'Private University',
    state: 'Oyo',
    location: 'Ibadan',
    campuses: ['Toll Gate Campus'],
    campus: 'Toll Gate Campus',
    status: 'active'
  },
  {
    id: 'bells',
    name: 'Bells University of Technology',
    shortName: 'BellsTech',
    type: 'Private University',
    state: 'Ogun',
    location: 'Ota',
    campuses: ['Ota Main Campus'],
    campus: 'Ota Main Campus',
    status: 'active'
  },
  {
    id: 'caleb',
    name: 'Caleb University',
    shortName: 'Caleb Lagos',
    type: 'Private University',
    state: 'Lagos',
    location: 'Imota, Ikorodu',
    campuses: ['Imota Main Campus'],
    campus: 'Imota Main Campus',
    status: 'active'
  },
  {
    id: 'madonna',
    name: 'Madonna University',
    shortName: 'Madonna',
    type: 'Private University',
    state: 'Rivers',
    location: 'Elele / Okija',
    campuses: ['Elele Campus', 'Okija Campus', 'Akpugo Campus'],
    campus: 'Elele Campus',
    status: 'active'
  },
  {
    id: 'benson-idaho',
    name: 'Benson Idahosa University',
    shortName: 'BIU Benin',
    type: 'Private University',
    state: 'Edo',
    location: 'Benin City',
    campuses: ['Ugbor Campus', 'Legacy Campus'],
    campus: 'Ugbor Campus',
    status: 'active'
  },
  {
    id: 'al-hikmah',
    name: 'Al-Hikmah University',
    shortName: 'Al-Hikmah',
    type: 'Private University',
    state: 'Kwara',
    location: 'Ilorin',
    campuses: ['Adeta Main Campus'],
    campus: 'Adeta Main Campus',
    status: 'active'
  },

  // ================= FEDERAL POLYTECHNICS =================
  {
    id: 'fedpoly-bali',
    name: 'Federal Polytechnic, Bali',
    shortName: 'FEDPOLY Bali',
    type: 'Federal Polytechnic',
    state: 'Taraba',
    location: 'Bali',
    campuses: ['Bali Main Campus'],
    campus: 'Bali Main Campus',
    status: 'active'
  },
  {
    id: 'yabatech',
    name: 'Yaba College of Technology',
    shortName: 'YABATECH',
    type: 'Federal Polytechnic',
    state: 'Lagos',
    location: 'Yaba, Lagos',
    campuses: ['Yaba Main Campus', 'Epe Campus'],
    campus: 'Yaba Main Campus',
    status: 'active'
  },
  {
    id: 'kadpoly',
    name: 'Kaduna Polytechnic',
    shortName: 'KADPOLY',
    type: 'Federal Polytechnic',
    state: 'Kaduna',
    location: 'Kaduna',
    campuses: ['Tudun Wada Main Campus', 'Barnawa Campus', 'Unguwan Rimi Campus'],
    campus: 'Tudun Wada Main Campus',
    status: 'active'
  },
  {
    id: 'auchipoly',
    name: 'Auchi Polytechnic',
    shortName: 'AUCHIPOLY',
    type: 'Federal Polytechnic',
    state: 'Edo',
    location: 'Auchi',
    campuses: ['Auchi Main Campus'],
    campus: 'Auchi Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-nekede',
    name: 'Federal Polytechnic, Nekede',
    shortName: 'FEDPOLY Nekede',
    type: 'Federal Polytechnic',
    state: 'Imo',
    location: 'Nekede, Owerri',
    campuses: ['Nekede Main Campus'],
    campus: 'Nekede Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-oko',
    name: 'Federal Polytechnic, Oko',
    shortName: 'FEDPOLY Oko',
    type: 'Federal Polytechnic',
    state: 'Anambra',
    location: 'Oko',
    campuses: ['Oko Main Campus', 'Umunze', 'Atani'],
    campus: 'Oko Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-ilaro',
    name: 'Federal Polytechnic, Ilaro',
    shortName: 'FEDPOLY Ilaro',
    type: 'Federal Polytechnic',
    state: 'Ogun',
    location: 'Ilaro',
    campuses: ['Ilaro Main Campus'],
    campus: 'Ilaro Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-ede',
    name: 'Federal Polytechnic, Ede',
    shortName: 'FEDPOLY Ede',
    type: 'Federal Polytechnic',
    state: 'Osun',
    location: 'Ede',
    campuses: ['South Campus', 'North Campus'],
    campus: 'South Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-ado',
    name: 'Federal Polytechnic, Ado-Ekiti',
    shortName: 'FEDPOLY Ado',
    type: 'Federal Polytechnic',
    state: 'Ekiti',
    location: 'Ado-Ekiti',
    campuses: ['Ado-Ekiti Main Campus'],
    campus: 'Ado-Ekiti Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-offa',
    name: 'Federal Polytechnic, Offa',
    shortName: 'FEDPOLY Offa',
    type: 'Federal Polytechnic',
    state: 'Kwara',
    location: 'Offa',
    campuses: ['Permanent Site', 'Mini Campus'],
    campus: 'Permanent Site',
    status: 'active'
  },
  {
    id: 'fedpoly-bida',
    name: 'Federal Polytechnic, Bida',
    shortName: 'FEDPOLY Bida',
    type: 'Federal Polytechnic',
    state: 'Niger',
    location: 'Bida',
    campuses: ['Bida Main Campus'],
    campus: 'Bida Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-idah',
    name: 'Federal Polytechnic, Idah',
    shortName: 'FEDPOLY Idah',
    type: 'Federal Polytechnic',
    state: 'Kogi',
    location: 'Idah',
    campuses: ['Idah Main Campus'],
    campus: 'Idah Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-nasarawa',
    name: 'Federal Polytechnic, Nasarawa',
    shortName: 'FEDPOLY Nasarawa',
    type: 'Federal Polytechnic',
    state: 'Nasarawa',
    location: 'Nasarawa',
    campuses: ['Nasarawa Main Campus'],
    campus: 'Nasarawa Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-bauchi',
    name: 'Federal Polytechnic, Bauchi',
    shortName: 'FEDPOLY Bauchi',
    type: 'Federal Polytechnic',
    state: 'Bauchi',
    location: 'Bauchi',
    campuses: ['Gwallameji Campus'],
    campus: 'Gwallameji Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-mubi',
    name: 'Federal Polytechnic, Mubi',
    shortName: 'FEDPOLY Mubi',
    type: 'Federal Polytechnic',
    state: 'Adamawa',
    location: 'Mubi',
    campuses: ['Mubi Main Campus'],
    campus: 'Mubi Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-damaturu',
    name: 'Federal Polytechnic, Damaturu',
    shortName: 'FEDPOLY Damaturu',
    type: 'Federal Polytechnic',
    state: 'Yobe',
    location: 'Damaturu',
    campuses: ['Damaturu Main Campus'],
    campus: 'Damaturu Main Campus',
    status: 'active'
  },
  {
    id: 'akanu-ibiam-poly',
    name: 'Akanu Ibiam Federal Polytechnic, Unwana',
    shortName: 'AIFPU Unwana',
    type: 'Federal Polytechnic',
    state: 'Ebonyi',
    location: 'Afikpo',
    campuses: ['Unwana Main Campus'],
    campus: 'Unwana Main Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-kaura-namoda',
    name: 'Federal Polytechnic, Kaura Namoda',
    shortName: 'FEDPOLY Kaura',
    type: 'Federal Polytechnic',
    state: 'Zamfara',
    location: 'Kaura Namoda',
    campuses: ['Kaura Namoda Campus'],
    campus: 'Kaura Namoda Campus',
    status: 'active'
  },
  {
    id: 'fedpoly-wannune',
    name: 'Federal Polytechnic, Wannune',
    shortName: 'FEDPOLY Wannune',
    type: 'Federal Polytechnic',
    state: 'Benue',
    location: 'Wannune',
    campuses: ['Wannune Campus'],
    campus: 'Wannune Campus',
    status: 'active'
  },

  // ================= STATE POLYTECHNICS =================
  {
    id: 'taraba-poly',
    name: 'Taraba State Polytechnic',
    shortName: 'TARABAPOLY',
    type: 'State Polytechnic',
    state: 'Taraba',
    location: 'Suntai / Jalingo',
    campuses: ['Jalingo Campus', 'Suntai Campus'],
    campus: 'Jalingo Campus',
    status: 'active'
  },
  {
    id: 'poly-ibadan',
    name: 'The Polytechnic, Ibadan',
    shortName: 'PolyIbadan',
    type: 'State Polytechnic',
    state: 'Oyo',
    location: 'Ibadan',
    campuses: ['North Campus', 'South Campus'],
    campus: 'North Campus',
    status: 'active'
  },
  {
    id: 'mapoly',
    name: 'Moshood Abiola Polytechnic',
    shortName: 'MAPOLY',
    type: 'State Polytechnic',
    state: 'Ogun',
    location: 'Ojere, Abeokuta',
    campuses: ['Ojere Campus'],
    campus: 'Ojere Campus',
    status: 'active'
  },
  {
    id: 'laspotech-isolo',
    name: 'Lagos State Polytechnic (LASUSTECH Annex)',
    shortName: 'LASPOTECH',
    type: 'State Polytechnic',
    state: 'Lagos',
    location: 'Ikorodu',
    campuses: ['Ikorodu Campus', 'Isolo Campus'],
    campus: 'Ikorodu Campus',
    status: 'active'
  },
  {
    id: 'benpoly',
    name: 'Benue State Polytechnic, Ugbokolo',
    shortName: 'BENPOLY',
    type: 'State Polytechnic',
    state: 'Benue',
    location: 'Ugbokolo',
    campuses: ['Ugbokolo Main Campus'],
    campus: 'Ugbokolo Main Campus',
    status: 'active'
  },
  {
    id: 'plateau-poly',
    name: 'Plateau State Polytechnic, Barkin Ladi',
    shortName: 'PLAPOLY',
    type: 'State Polytechnic',
    state: 'Plateau',
    location: 'Barkin Ladi',
    campuses: ['Heipang Main Campus', 'Jos Campus'],
    campus: 'Heipang Main Campus',
    status: 'active'
  },
  {
    id: 'imt-enugu',
    name: 'Institute of Management and Technology',
    shortName: 'IMT Enugu',
    type: 'State Polytechnic',
    state: 'Enugu',
    location: 'Enugu',
    campuses: ['Independence Layout Campus'],
    campus: 'Independence Layout Campus',
    status: 'active'
  },
  {
    id: 'dspz-ozoro',
    name: 'Delta State Polytechnic, Ozoro (SOU)',
    shortName: 'OZOROPOLY',
    type: 'State Polytechnic',
    state: 'Delta',
    location: 'Ozoro',
    campuses: ['Ozoro Main Campus'],
    campus: 'Ozoro Main Campus',
    status: 'active'
  },
  {
    id: 'ogwashi-uku-poly',
    name: 'Delta State Polytechnic, Ogwashi-Uku',
    shortName: 'DSPG',
    type: 'State Polytechnic',
    state: 'Delta',
    location: 'Ogwashi-Uku',
    campuses: ['Ogwashi-Uku Campus'],
    campus: 'Ogwashi-Uku Campus',
    status: 'active'
  },
  {
    id: 'ken-saro-wiwa-poly',
    name: 'Ken Saro-Wiwa Polytechnic, Bori',
    shortName: 'KENPOLY',
    type: 'State Polytechnic',
    state: 'Rivers',
    location: 'Bori',
    campuses: ['Bori Main Campus'],
    campus: 'Bori Main Campus',
    status: 'active'
  },
  {
    id: 'akwapoly',
    name: 'Akwa Ibom State Polytechnic',
    shortName: 'AKWAPOLY',
    type: 'State Polytechnic',
    state: 'Akwa Ibom',
    location: 'Ikot Osurua',
    campuses: ['Ikot Osurua Campus'],
    campus: 'Ikot Osurua Campus',
    status: 'active'
  },
  {
    id: 'abia-poly',
    name: 'Abia State Polytechnic',
    shortName: 'ABIAPOLY',
    type: 'State Polytechnic',
    state: 'Abia',
    location: 'Aba',
    campuses: ['Aba Campus'],
    campus: 'Aba Campus',
    status: 'active'
  },
  {
    id: 'rufus-giwa-poly',
    name: 'Rufus Giwa Polytechnic, Owo',
    shortName: 'RUGIPO',
    type: 'State Polytechnic',
    state: 'Ondo',
    location: 'Owo',
    campuses: ['Owo Main Campus'],
    campus: 'Owo Main Campus',
    status: 'active'
  },
  {
    id: 'ospoly-iree',
    name: 'Osun State Polytechnic, Iree',
    shortName: 'OSPOLY Iree',
    type: 'State Polytechnic',
    state: 'Osun',
    location: 'Iree',
    campuses: ['Iree Main Campus'],
    campus: 'Iree Main Campus',
    status: 'active'
  },
  {
    id: 'kwara-poly',
    name: 'Kwara State Polytechnic',
    shortName: 'KWARAPOLY',
    type: 'State Polytechnic',
    state: 'Kwara',
    location: 'Ilorin',
    campuses: ['Permanent Site (Ilorin)'],
    campus: 'Permanent Site (Ilorin)',
    status: 'active'
  },
  {
    id: 'nuhu-bamalli-poly',
    name: 'Nuhu Bamalli Polytechnic, Zaria',
    shortName: 'NUBAPOLY',
    type: 'State Polytechnic',
    state: 'Kaduna',
    location: 'Zaria',
    campuses: ['Main Campus (Zaria)'],
    campus: 'Main Campus (Zaria)',
    status: 'active'
  },
  {
    id: 'kano-poly',
    name: 'Kano State Polytechnic',
    shortName: 'KANOPOLY',
    type: 'State Polytechnic',
    state: 'Kano',
    location: 'Kano',
    campuses: ['Matan Fada Main Campus'],
    campus: 'Matan Fada Main Campus',
    status: 'active'
  },
  {
    id: 'ramat-poly',
    name: 'Ramat Polytechnic, Maiduguri',
    shortName: 'RAMATPOLY',
    type: 'State Polytechnic',
    state: 'Borno',
    location: 'Maiduguri',
    campuses: ['Maiduguri Campus'],
    campus: 'Maiduguri Campus',
    status: 'active'
  },

  // ================= PRIVATE POLYTECHNICS =================
  {
    id: 'dorben-poly',
    name: 'Dorben Polytechnic, Abuja',
    shortName: 'Dorben Poly',
    type: 'Private Polytechnic',
    state: 'FCT - Abuja',
    location: 'Garam / Abuja',
    campuses: ['Garam Main Campus'],
    campus: 'Garam Main Campus',
    status: 'active'
  },
  {
    id: 'heritage-poly',
    name: 'Heritage Polytechnic, Eket',
    shortName: 'Heritage Poly',
    type: 'Private Polytechnic',
    state: 'Akwa Ibom',
    location: 'Eket',
    campuses: ['Ikot Udota Campus'],
    campus: 'Ikot Udota Campus',
    status: 'active'
  },
  {
    id: 'crown-poly',
    name: 'Crown Polytechnic, Ado-Ekiti',
    shortName: 'Crown Poly',
    type: 'Private Polytechnic',
    state: 'Ekiti',
    location: 'Odo, Ado-Ekiti',
    campuses: ['Ado-Ekiti Campus'],
    campus: 'Ado-Ekiti Campus',
    status: 'active'
  },
  {
    id: 'nacabs-poly',
    name: 'NACABS Polytechnic, Akwanga',
    shortName: 'NACABS Poly',
    type: 'Private Polytechnic',
    state: 'Nasarawa',
    location: 'Akwanga',
    campuses: ['Akwanga Campus'],
    campus: 'Akwanga Campus',
    status: 'active'
  },
  {
    id: 'grace-poly',
    name: 'Grace Polytechnic, Lagos',
    shortName: 'Grace Poly',
    type: 'Private Polytechnic',
    state: 'Lagos',
    location: 'Omu-Ijebu / Lagos',
    campuses: ['Surulere Campus'],
    campus: 'Surulere Campus',
    status: 'active'
  },

  // ================= COLLEGES OF EDUCATION =================
  {
    id: 'coe-zing',
    name: 'College of Education, Zing',
    shortName: 'COE Zing',
    type: 'College of Education',
    state: 'Taraba',
    location: 'Zing',
    campuses: ['Zing Main Campus'],
    campus: 'Zing Main Campus',
    status: 'active'
  },
  {
    id: 'fce-zaria',
    name: 'Federal College of Education, Zaria',
    shortName: 'FCE Zaria',
    type: 'College of Education',
    state: 'Kaduna',
    location: 'Zaria',
    campuses: ['Zaria Main Campus'],
    campus: 'Zaria Main Campus',
    status: 'active'
  },
  {
    id: 'fce-kano',
    name: 'Federal College of Education, Kano',
    shortName: 'FCE Kano',
    type: 'College of Education',
    state: 'Kano',
    location: 'Kano',
    campuses: ['Kano Main Campus'],
    campus: 'Kano Main Campus',
    status: 'active'
  },
  {
    id: 'fce-okene',
    name: 'Federal College of Education, Okene',
    shortName: 'FCE Okene',
    type: 'College of Education',
    state: 'Kogi',
    location: 'Okene',
    campuses: ['Okene Main Campus'],
    campus: 'Okene Main Campus',
    status: 'active'
  },
  {
    id: 'alvan-ikoku',
    name: 'Alvan Ikoku Federal University of Education',
    shortName: 'Alvan Owerri',
    type: 'College of Education',
    state: 'Imo',
    location: 'Owerri',
    campuses: ['Owerri Main Campus'],
    campus: 'Owerri Main Campus',
    status: 'active'
  },
  {
    id: 'fce-pankshin',
    name: 'Federal College of Education, Pankshin',
    shortName: 'FCE Pankshin',
    type: 'College of Education',
    state: 'Plateau',
    location: 'Pankshin',
    campuses: ['Pankshin Main Campus'],
    campus: 'Pankshin Main Campus',
    status: 'active'
  },
  {
    id: 'fce-yola',
    name: 'Federal College of Education, Yola',
    shortName: 'FCE Yola',
    type: 'College of Education',
    state: 'Adamawa',
    location: 'Yola',
    campuses: ['Jimeta Yola Campus'],
    campus: 'Jimeta Yola Campus',
    status: 'active'
  },
  {
    id: 'fce-obudu',
    name: 'Federal College of Education, Obudu',
    shortName: 'FCE Obudu',
    type: 'College of Education',
    state: 'Cross River',
    location: 'Obudu',
    campuses: ['Obudu Main Campus'],
    campus: 'Obudu Main Campus',
    status: 'active'
  },
  {
    id: 'fcet-gombe',
    name: 'Federal College of Education (Technical), Gombe',
    shortName: 'FCET Gombe',
    type: 'College of Education',
    state: 'Gombe',
    location: 'Gombe',
    campuses: ['Gombe Main Campus'],
    campus: 'Gombe Main Campus',
    status: 'active'
  },
  {
    id: 'fce-akoka',
    name: 'Federal College of Education (Technical), Akoka',
    shortName: 'FCET Akoka',
    type: 'College of Education',
    state: 'Lagos',
    location: 'Akoka, Yaba',
    campuses: ['Akoka Campus'],
    campus: 'Akoka Campus',
    status: 'active'
  }
];

export const INSTITUTION_STATES: string[] = Array.from(
  new Set(VERIFIED_NIGERIAN_INSTITUTIONS.map((inst) => inst.state))
).sort((a, b) => a.localeCompare(b));

export function getInstitutionSlug(institution: Pick<Institution, 'id' | 'name'>): string {
  const slug = String(institution.name || institution.id || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || institution.id;
}

export function getInstitutionBySlugOrId(
  slugOrId?: string | null,
  customInstitutions?: Institution[]
): Institution | undefined {
  const clean = String(slugOrId || '').trim().toLowerCase();
  if (!clean) return undefined;
  const list = customInstitutions && customInstitutions.length > 0
    ? customInstitutions
    : VERIFIED_NIGERIAN_INSTITUTIONS;
  return list.find(
    (inst) =>
      inst.id.toLowerCase() === clean ||
      inst.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === clean ||
      getInstitutionSlug(inst) === clean
  );
}

export function getInstitutionById(
  institutionId?: string | null,
  customInstitutions?: Institution[]
): Institution {
  const found = getInstitutionBySlugOrId(institutionId, customInstitutions);
  if (found) return found;
  const list = customInstitutions && customInstitutions.length > 0
    ? customInstitutions
    : VERIFIED_NIGERIAN_INSTITUTIONS;
  return list.find((i) => i.id === DEFAULT_INSTITUTION_ID) || VERIFIED_NIGERIAN_INSTITUTIONS[0];
}

export function belongsToInstitution(
  recordInstitutionId?: string | null,
  selectedInstitutionId: string = DEFAULT_INSTITUTION_ID
): boolean {
  const normalizedSelected = String(selectedInstitutionId || DEFAULT_INSTITUTION_ID).trim().toLowerCase();
  if (!normalizedSelected || normalizedSelected === 'all') return true;
  // Legacy records without institutionId default cleanly to FUWUKARI so existing data stays preserved
  const normalizedRecord = String(recordInstitutionId || DEFAULT_INSTITUTION_ID).trim().toLowerCase();
  return normalizedRecord === normalizedSelected;
}
