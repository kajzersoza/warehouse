import { Product } from '../types/product';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '40107-00-33',
    productId: '40107.00.33',
    name: 'N1',
    description: 'F , 2 MOZGÓ ÜLLŐ - Nagy pontosságú professzionális saruzófej ipari krimp alkalmazásokhoz',
    category: 'Saruzófej',
    manufacturer: 'Mecal',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: 'MLS0185-J',
    insulationGripperType: 'F',
    connectorType: 'Standard 2.54',
    terminalType: 'Nyitott saru',
    date: '2026-03-15',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 14,
    location: 'A-01-Polc-3',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40108-12-01',
    productId: '40108.12.01',
    name: 'M2 Compact Fej',
    description: '1 Mozgó üllő, mikro-csatlakozós kivitel oldaladagolással, edzett acél betéttel',
    category: 'Saruzófej',
    manufacturer: 'Mecal',
    feeding: 'Oldal',
    insulationType: 'Gumis',
    factoryCode: 'MLS0290-K',
    insulationGripperType: 'O',
    connectorType: 'JST-XH',
    terminalType: 'Csapos saru',
    date: '2026-02-28',
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 8,
    location: 'A-01-Polc-4',
    updatedAt: new Date().toISOString()
  },
  {
    id: '30205-00-11',
    productId: '30205.00.11',
    name: 'K3 Hátul adagolós szerszám',
    description: 'Nagy terhelhetőségű hátsó szalagadagolású présszerszám autóipari kábelkötegekhez',
    category: 'Présszerszám',
    manufacturer: 'Komax',
    feeding: 'Hátul',
    insulationType: 'Nem Gumis',
    factoryCode: 'KMX-8840',
    insulationGripperType: 'B',
    connectorType: 'Molex Mini-Fit',
    terminalType: 'Gyűrűs saru',
    date: '2026-01-10',
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80'
    ],
    stockQuantity: 5,
    location: 'B-04-Polc-1',
    updatedAt: new Date().toISOString()
  },
  {
    id: '50120-99-44',
    productId: '50120.99.44',
    name: 'TE Ocean 2.0 Fej',
    description: 'Pneumatikus finomállítású univerzális mini applikátor kábelkonfekcionáláshoz',
    category: 'Saruzófej',
    manufacturer: 'TE Connectivity',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: 'OC-2151020-1',
    insulationGripperType: 'F',
    connectorType: 'AMP Superseal',
    terminalType: 'Szigetelt lapos saru',
    date: '2026-03-01',
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 22,
    location: 'C-02-Polc-2',
    updatedAt: new Date().toISOString()
  },
  {
    id: '9099000079-00',
    productId: '9099000079_00',
    name: 'Kábelkorbács Főköteg 79',
    description: 'Autóipari főköteg szerelvény és mérődoboz illesztő modul',
    category: 'Gyártandó termék',
    manufacturer: 'World Wires',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: 'GY-9099-79',
    date: '2026-03-20',
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 45,
    location: 'GY-01-Polc-1',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'XINT000284',
    productId: 'XINT000284',
    name: 'Mérődoboz MD-284 12V/24V',
    description: 'Digitális teszt- és mérőadapter végellenőrzéshez',
    category: 'Mérődoboz',
    manufacturer: 'Mecatec',
    feeding: 'Kézi',
    insulationType: 'Gumis',
    factoryCode: 'MD-284-A',
    date: '2026-03-18',
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 3,
    location: 'M-02-Polc-1',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'XINT0000K6',
    productId: 'XINT0000K6',
    name: 'Mérődoboz K6 Kalibrált',
    description: 'Pneumatikus és elektromos tesztállomás csatlakozó mérődoboz',
    category: 'Mérődoboz',
    manufacturer: 'Komax',
    feeding: 'Kézi',
    insulationType: 'Nem Gumis',
    factoryCode: 'MD-K6-CAL',
    date: '2026-03-19',
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 2,
    location: 'M-02-Polc-2',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2122120061',
    productId: '2122120061',
    name: 'Konnektor 61 (2-Pólusú)',
    description: '2-Pólusú vízálló kábelköteg konnektor csatlakozó ház',
    category: 'Konnektor',
    manufacturer: 'TE Connectivity',
    positionsCount: 2,
    factoryCode: 'CONN-2122-61',
    date: '2026-03-25',
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 150,
    location: 'K-01-Polc-1',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2122120060',
    productId: '2122120060',
    name: 'Konnektor 60 (4-Pólusú)',
    description: '4-Pólusú robusztus konnektor zárómechanizmussal',
    category: 'Konnektor',
    manufacturer: 'TE Connectivity',
    positionsCount: 4,
    factoryCode: 'CONN-2122-60',
    date: '2026-03-25',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 120,
    location: 'K-01-Polc-2',
    updatedAt: new Date().toISOString()
  },
  {
    id: '4030610910',
    productId: '4030610910',
    name: 'Saru 4030610910 (0.5-1.0mm²)',
    description: 'Precíziós krimp saru konnektor érintkezőkhöz, ónozott sárgaréz',
    category: 'Saru',
    manufacturer: 'Mecal',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: 'TERM-4030-910',
    date: '2026-03-25',
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 500,
    location: 'S-02-Polc-3',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107-00-38',
    productId: '40107.00.38',
    name: 'N38',
    description: 'N38 típusú ipari saruzófej mechanikus présekhez (N°38 szerszám beállítás)',
    category: 'Saruzófej',
    manufacturer: 'Mecal',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: 'MLS0038-J',
    insulationGripperType: 'F',
    connectorType: 'Standard 2.54',
    terminalType: 'Nyitott saru',
    date: '2026-03-28',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 11,
    location: 'A-01-Polc-5',
    updatedAt: new Date().toISOString()
  },
  {
    id: '282378-1',
    productId: '282378/1',
    name: 'Saru 282378/1 (2551120022)',
    description: 'Nyitott szalag saru 2551120022, N°38 saruzófejhez illesztve',
    category: 'Saru',
    manufacturer: 'TE Connectivity',
    feeding: 'Oldal',
    insulationType: 'Nem Gumis',
    factoryCode: '2551120022',
    date: '2026-03-28',
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 340,
    location: 'S-03-Polc-2',
    updatedAt: new Date().toISOString()
  },
  {
    id: '284108-1',
    productId: '284108-1',
    name: 'Saru 284108-1 (2551120026.6)',
    description: 'Precíziós saru 2551120026.6, N°38 saruzófejhez',
    category: 'Saru',
    manufacturer: 'TE Connectivity',
    feeding: 'Oldal',
    insulationType: 'Gumis',
    factoryCode: '2551120026.6',
    date: '2026-03-28',
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80'
    ],
    stockQuantity: 520,
    location: 'S-03-Polc-3',
    updatedAt: new Date().toISOString()
  }
];
