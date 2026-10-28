const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🏠 Generating sample homes...');
  
  // Sample operators data
  const operators = [
    { email: 'sunrise@example.com', name: 'Sunrise Senior Living', company: 'Sunrise Senior Living' },
    { email: 'brookdale@example.com', name: 'Brookdale Communities', company: 'Brookdale Senior Living' },
    { email: 'fivestar@example.com', name: 'Five Star Communities', company: 'Five Star Senior Living' }
  ];
  
  // Create operators
  const createdOperators = [];
  for (const op of operators) {
    const user = await prisma.user.upsert({
      where: { email: op.email },
      update: {},
      create: {
        email: op.email,
        passwordHash: '$2a$12$dummy.hash.for.testing',
        firstName: op.name.split(' ')[0],
        lastName: op.name.split(' ').slice(1).join(' '),
        role: 'OPERATOR',
        status: 'ACTIVE',
        phone: '555-' + Math.floor(Math.random() * 900 + 100) + '-' + Math.floor(Math.random() * 9000 + 1000),
        profileImageUrl: 'https://randomuser.me/api/portraits/men/' + Math.floor(Math.random() * 99) + '.jpg'
      }
    });
    
    const operator = await prisma.operator.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyName: op.company,
        taxId: '12-' + Math.floor(Math.random() * 9000000 + 1000000),
        businessLicense: 'BL-' + Math.floor(Math.random() * 90000 + 10000)
      }
    });
    
    createdOperators.push({ user, operator });
  }
  
  // Sample homes data
  const homes = [
    {
      name: 'Sunrise Manor',
      careLevel: ['ASSISTED', 'MEMORY_CARE'],
      priceMin: 3500,
      priceMax: 5200,
      availability: 8,
      city: 'San Francisco',
      state: 'CA',
      amenities: ['Garden', 'WiFi', 'Transportation', 'Dining', 'Fitness Center']
    },
    {
      name: 'Golden Years Residence',
      careLevel: ['INDEPENDENT', 'ASSISTED'],
      priceMin: 2800,
      priceMax: 4100,
      availability: 12,
      city: 'Los Angeles',
      state: 'CA',
      amenities: ['Pet Friendly', 'WiFi', 'Laundry Service', 'Beauty Salon']
    },
    {
      name: 'Peaceful Pines',
      careLevel: ['MEMORY_CARE', 'SKILLED_NURSING'],
      priceMin: 4200,
      priceMax: 7800,
      availability: 3,
      city: 'Sacramento',
      state: 'CA',
      amenities: ['24/7 Nursing', 'Memory Care Unit', 'Garden', 'Private Rooms']
    },
    {
      name: 'Harbor View Commons',
      careLevel: ['INDEPENDENT'],
      priceMin: 2200,
      priceMax: 3500,
      availability: 15,
      city: 'San Diego',
      state: 'CA',
      amenities: ['Ocean View', 'WiFi', 'Fitness Center', 'Social Activities']
    },
    {
      name: 'Brookdale Heights',
      careLevel: ['ASSISTED'],
      priceMin: 3200,
      priceMax: 4800,
      availability: 6,
      city: 'Oakland',
      state: 'CA',
      amenities: ['Transportation', 'Medication Management', 'Dining', 'Garden']
    },
    {
      name: 'Meadowbrook Care Center',
      careLevel: ['SKILLED_NURSING'],
      priceMin: 5500,
      priceMax: 8200,
      availability: 2,
      city: 'Fresno',
      state: 'CA',
      amenities: ['24/7 Nursing', 'Rehabilitation', 'Private Rooms', 'Family Lounge']
    },
    {
      name: 'Valley Springs',
      careLevel: ['INDEPENDENT', 'ASSISTED'],
      priceMin: 2600,
      priceMax: 4200,
      availability: 10,
      city: 'San Jose',
      state: 'CA',
      amenities: ['WiFi', 'Fitness Center', 'Library', 'Transportation']
    },
    {
      name: 'Sunset Gardens',
      careLevel: ['MEMORY_CARE'],
      priceMin: 4800,
      priceMax: 6500,
      availability: 4,
      city: 'Long Beach',
      state: 'CA',
      amenities: ['Secure Unit', 'Garden Therapy', 'Music Therapy', 'Family Support']
    }
  ];
  
  // Create homes
  for (let i = 0; i < homes.length; i++) {
    const home = homes[i];
    const operator = createdOperators[i % createdOperators.length];
    
    // Create address
    const address = await prisma.address.create({
      data: {
        street: Math.floor(Math.random() * 9999 + 1000) + ' ' + ['Main St', 'Oak Ave', 'Elm Dr', 'Pine Rd', 'Cedar Ln'][Math.floor(Math.random() * 5)],
        city: home.city,
        state: home.state,
        zipCode: String(Math.floor(Math.random() * 90000 + 10000)),
        country: 'United States'
      }
    });
    
    // Create home
    const createdHome = await prisma.assistedLivingHome.create({
      data: {
        name: home.name,
        description: `Beautiful ${home.careLevel.join(' and ').toLowerCase()} community located in ${home.city}, ${home.state}. Offering exceptional care and comfortable living.`,
        careLevel: home.careLevel,
        priceMin: home.priceMin,
        priceMax: home.priceMax,
        capacity: home.availability + Math.floor(Math.random() * 20 + 10),
        currentOccupancy:
          home.availability > 0
            ? Math.max(
                0,
                home.availability +
                  Math.floor(Math.random() * 20 + 10) -
                  home.availability
              )
            : 0,
        amenities: home.amenities,
        status: 'ACTIVE',
        operatorId: operator.operator.id,
        addressId: address.id,
        verified: Math.random() > 0.3, // 70% verified
        licenseNumber: 'LIC-' + Math.floor(Math.random() * 900000 + 100000),
        phoneNumber: '(' + Math.floor(Math.random() * 900 + 100) + ') ' + Math.floor(Math.random() * 900 + 100) + '-' + Math.floor(Math.random() * 9000 + 1000),
        email: home.name.toLowerCase().replace(/\s+/g, '') + '@example.com',
        website: 'https://' + home.name.toLowerCase().replace(/\s+/g, '') + '.com'
      }
    });
    
    console.log('✅ Created home:', createdHome.name);
  }
  
  console.log('🎉 Sample data generation complete!');
  console.log('📊 Created:');
  console.log('  - 3 operators');
  console.log('  - 8 assisted living homes');
  console.log('  - Various care levels and price ranges');
  console.log('  - Ready for search testing!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
