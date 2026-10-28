/**
 * Add Coordinates Script
 * 
 * This script adds address and coordinate data for assisted living homes
 * that are missing address records, using approximate coordinates for California cities.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping of California cities to their approximate coordinates
const CALIFORNIA_CITIES = {
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Sacramento': { lat: 38.5816, lng: -121.4944 },
  'Oakland': { lat: 37.8044, lng: -122.2711 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Fresno': { lat: 36.7378, lng: -119.7871 },
  'Long Beach': { lat: 33.7701, lng: -118.1937 },
  'Santa Ana': { lat: 33.7455, lng: -117.8677 },
  'Bakersfield': { lat: 35.3733, lng: -119.0187 },
  'Anaheim': { lat: 33.8366, lng: -117.9143 }
};

// Add a small random offset to coordinates to spread homes around the city
function addRandomOffset(coordinate) {
  // Add random offset between -0.02 and 0.02 (about 1-2 miles)
  return coordinate + (Math.random() * 0.04 - 0.02);
}

// Generate a random street address
function generateStreetAddress() {
  const streetNumbers = [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000];
  const streetNames = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Sunset Blvd', 'Ocean Ave', 'Highland Dr', 'Valley Rd'];
  
  const number = streetNumbers[Math.floor(Math.random() * streetNumbers.length)];
  const name = streetNames[Math.floor(Math.random() * streetNames.length)];
  
  return `${number} ${name}`;
}

// Generate a random ZIP code for California (90000-96699)
function generateCAZipCode() {
  return String(Math.floor(Math.random() * 6700 + 90000));
}

async function addCoordinates() {
  try {
    console.log('🔍 Finding homes without address data...');
    
    // Find all homes that don't have an address
    const homesWithoutAddress = await prisma.assistedLivingHome.findMany({
      where: {
        address: null
      }
    });
    
    console.log(`📊 Found ${homesWithoutAddress.length} homes without address data.`);
    
    if (homesWithoutAddress.length === 0) {
      console.log('✅ All homes already have address data.');
      return;
    }
    
    // Process each home
    for (const home of homesWithoutAddress) {
      console.log(`\n🏠 Processing: ${home.name}`);
      
      // Assign a random California city
      const cityKeys = Object.keys(CALIFORNIA_CITIES);
      const city = cityKeys[Math.floor(Math.random() * cityKeys.length)];
      const baseCoords = CALIFORNIA_CITIES[city];
      
      // Add random offset to coordinates
      const latitude = addRandomOffset(baseCoords.lat);
      const longitude = addRandomOffset(baseCoords.lng);
      
      // Generate street address and ZIP code
      const street = generateStreetAddress();
      const zipCode = generateCAZipCode();
      
      console.log(`   📍 Creating address: ${street}, ${city}, CA ${zipCode}`);
      console.log(`   🌐 Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      // Create the address record
      const address = await prisma.address.create({
        data: {
          street,
          city,
          state: 'CA',
          zipCode,
          country: 'USA',
          latitude,
          longitude,
          home: {
            connect: {
              id: home.id
            }
          }
        }
      });
      
      console.log(`   ✅ Address created and linked to ${home.name}`);
    }
    
    console.log('\n🎉 All missing addresses have been created successfully!');
    
  } catch (error) {
    console.error('❌ Error adding coordinates:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed.');
  }
}

// Run the function
addCoordinates();
