const { PrismaClient } = require('@prisma/client');

async function checkSearches() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.placementSearch.count();
    console.log(`Total PlacementSearches: ${count}`);
    
    if (count > 0) {
      const searches = await prisma.placementSearch.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          queryText: true,
          status: true,
          searchResults: true,
          createdAt: true,
        }
      });
      
      console.log('\nRecent searches:');
      searches.forEach((search, i) => {
        console.log(`\n${i + 1}. Query: "${search.queryText}"`);
        console.log(`   Status: ${search.status}`);
        console.log(`   Search results type: ${typeof search.searchResults}`);
        if (search.searchResults) {
          const results = search.searchResults;
          console.log(`   Results keys: ${Object.keys(results).join(', ')}`);
          if (results.matches) {
            console.log(`   Matches count: ${results.matches.length}`);
            console.log(`   First match: ${JSON.stringify(results.matches[0] || {}).substring(0, 150)}...`);
          }
        }
      });
    } else {
      console.log('\n⚠️ No placement searches found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSearches();
