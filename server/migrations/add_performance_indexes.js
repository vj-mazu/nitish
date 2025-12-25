const { sequelize } = require('../config/database');

/**
 * Migration: Add performance indexes for handling large datasets
 * This will significantly improve query performance for 2 lakh+ records
 */

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  console.log('Adding performance indexes...');
  
  try {
    // Arrivals table indexes
    await queryInterface.addIndex('arrivals', ['date'], {
      name: 'idx_arrivals_date',
      concurrently: true
    });
    
    await queryInterface.addIndex('arrivals', ['status'], {
      name: 'idx_arrivals_status',
      concurrently: true
    });
    
    await queryInterface.addIndex('arrivals', ['movementType'], {
      name: 'idx_arrivals_movement_type',
      concurrently: true
    });
    
    await queryInterface.addIndex('arrivals', ['date', 'status'], {
      name: 'idx_arrivals_date_status',
      concurrently: true
    });
    
    await queryInterface.addIndex('arrivals', ['createdBy'], {
      name: 'idx_arrivals_created_by',
      concurrently: true
    });
    
    await queryInterface.addIndex('arrivals', ['date', 'movementType'], {
      name: 'idx_arrivals_date_movement',
      concurrently: true
    });
    
    // Hamali entries indexes
    await queryInterface.addIndex('hamali_entries', ['date'], {
      name: 'idx_hamali_entries_date',
      concurrently: true
    });
    
    await queryInterface.addIndex('hamali_entries', ['status'], {
      name: 'idx_hamali_entries_status',
      concurrently: true
    });
    
    await queryInterface.addIndex('hamali_entries', ['arrivalId'], {
      name: 'idx_hamali_entries_arrival',
      concurrently: true
    });
    
    await queryInterface.addIndex('hamali_entries', ['date', 'status'], {
      name: 'idx_hamali_entries_date_status',
      concurrently: true
    });
    
    console.log('✅ Performance indexes added successfully!');
  } catch (error) {
    console.error('Error adding indexes:', error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  console.log('Removing performance indexes...');
  
  try {
    // Remove arrivals indexes
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_status');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_movement_type');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date_status');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_created_by');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date_movement');
    
    // Remove hamali entries indexes
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_date');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_status');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_arrival');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_date_status');
    
    console.log('✅ Performance indexes removed successfully!');
  } catch (error) {
    console.error('Error removing indexes:', error);
    throw error;
  }
}

module.exports = { up, down };
