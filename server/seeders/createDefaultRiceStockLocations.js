const RiceStockLocation = require('../models/RiceStockLocation');
const User = require('../models/User');

/**
 * Create default rice stock locations for new installations
 */
async function createDefaultRiceStockLocations() {
  try {
    console.log('🏭 Creating default rice stock locations...');
    
    // Check if any rice stock locations already exist
    const existingCount = await RiceStockLocation.count();
    if (existingCount > 0) {
      console.log('✅ Rice stock locations already exist, skipping creation');
      return;
    }
    
    // Find admin user to assign as creator
    const adminUser = await User.findOne({ 
      where: { role: 'admin' },
      order: [['id', 'ASC']] // Get first admin user
    });
    
    if (!adminUser) {
      console.log('⚠️ No admin user found, skipping rice stock locations creation');
      return;
    }
    
    // Default rice stock locations
    const defaultLocations = [
      { code: 'A1', name: 'Warehouse A - Section 1' },
      { code: 'A2', name: 'Warehouse A - Section 2' },
      { code: 'B1', name: 'Warehouse B - Section 1' },
      { code: 'B2', name: 'Warehouse B - Section 2' },
      { code: 'C1', name: 'Warehouse C - Section 1' },
      { code: 'MAIN', name: 'Main Storage Area' },
      { code: 'TEMP', name: 'Temporary Storage' }
    ];
    
    // Create locations
    for (const location of defaultLocations) {
      try {
        await RiceStockLocation.create({
          code: location.code,
          name: location.name,
          createdBy: adminUser.id,
          isActive: true
        });
        console.log(`✅ Created rice stock location: ${location.code} - ${location.name}`);
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️ Location ${location.code} already exists, skipping`);
        } else {
          console.error(`❌ Error creating location ${location.code}:`, error.message);
        }
      }
    }
    
    console.log('✅ Default rice stock locations created successfully');
    
  } catch (error) {
    console.error('❌ Error creating default rice stock locations:', error.message);
    // Don't throw error - this is optional seeding
  }
}

module.exports = createDefaultRiceStockLocations;