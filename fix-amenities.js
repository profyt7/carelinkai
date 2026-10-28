const fs = require('fs');
const path = require('path');

// Path to the SearchFilters.tsx file
const filePath = path.join(__dirname, 'src', 'components', 'search', 'SearchFilters.tsx');

console.log('🔍 Reading SearchFilters.tsx file...');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading file:', err);
    return;
  }

  console.log('✅ File read successfully');
  console.log('🔧 Fixing amenities section layout...');

  // Find and replace the amenities section
  const updatedContent = data.replace(
    // Find the amenities section
    /{\s*\/\* Amenities Section \*\/\s*}\s*<div className="mt-6">([\s\S]*?)<div className="flex justify-between items-center mb-2">([\s\S]*?)<\/div>\s*{showAmenities && \(\s*<div\s*id="amenities-section"\s*className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"\s*>/m,
    
    // Replace with card-based layout
    `{/* Amenities Section */}
        <div className="mt-6">
          <hr className="mb-4 border-gray-200" />
          <div className="flex justify-between items-center mb-2">$2</div>
          
          {showAmenities && (
            <div 
              id="amenities-section"
              className="min-w-[230px] flex-1 rounded-lg border border-gray-200 p-4"
            >
              <div className="flex flex-wrap gap-3">`
  );

  // Replace the closing div of the amenities section
  const finalContent = updatedContent.replace(
    /<\/div>\s*\)\}/m,
    `              </div>
            </div>
          )}`
  );

  // Write the updated content back to the file
  fs.writeFile(filePath, finalContent, 'utf8', (err) => {
    if (err) {
      console.error('❌ Error writing file:', err);
      return;
    }
    
    console.log('✅ Amenities section fixed successfully!');
    console.log('🎉 SearchFilters.tsx has been updated with a card-based amenities layout');
  });
});
