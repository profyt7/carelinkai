/**
 * Check Addresses Script
 * 
 * This script checks the address data for assisted living homes
 * to help with map implementation.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAddresses() {
  try {
    console.log('🔍 Checking address data for assisted living homes...');
    
    // Get all homes with their addresses
    const homes = await prisma.assistedLivingHome.findMany({
      include: {
        address: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`\n📊 Found ${homes.length} homes with address data:\n`);
    
    // Display address information for each home
    homes.forEach((home, index) => {
      const address = home.address;
      console.log(`${index + 1}. ${home.name}`);
      if (!address) {
        console.log('   ⚠️  No address record found for this home\n');
        return; // Skip further processing for this home
      }

      // Safe‐guard against missing individual fields using optional-chaining
      console.log(
        `   📍 ${address.street || 'N/A'}\n      ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`
      );

      // Check if we have lat/lng coordinates
      if (address.latitude != null && address.longitude != null) {
        console.log(`   🌐 Coordinates: ${address.latitude}, ${address.longitude}`);
      } else {
        console.log('   ⚠️  No coordinates available – will need geocoding');
      }
      
      console.log(''); // Empty line for readability
    });
    
    // Check schema to see if latitude/longitude fields exist
    const addressInfo = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Address' 
      AND (column_name = 'latitude' OR column_name = 'longitude')
    `;
    
    if (addressInfo.length === 0) {
      console.log('⚠️ Note: The Address table does not have latitude/longitude fields.');
      console.log('   You may need to add these fields to the schema for map implementation.');
    } else if (addressInfo.length === 2) {
      console.log('✅ The Address table has latitude/longitude fields.');
    } else {
      console.log('⚠️ Warning: The Address table has only one coordinate field.');
    }
    
  } catch (error) {
    console.error('❌ Error checking addresses:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed.');
  }
}

// Run the function
checkAddresses();
