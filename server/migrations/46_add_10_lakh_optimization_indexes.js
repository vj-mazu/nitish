/**
 * Migration 46: Add 10 Lakh Record Performance Optimization Indexes
 * 
 * This migration adds comprehensive indexes for handling 1 million+ records
 * with high performance. Indexes are created for the arrivals table which
 * is the most heavily queried table.
 */

const { sequelize } = require('../config/database');

async function up() {
    console.log('🚀 Running 10 Lakh Record Performance Optimization...');

    const indexes = [
        // ====== ARRIVALS TABLE INDEXES ======
        // Primary date index - most queries filter by date
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_date ON arrivals(date DESC);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_year_month ON arrivals(EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));',

        // Status indexes - frequently filtered
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_status ON arrivals(status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_admin_approved ON arrivals("adminApprovedBy");',

        // Movement type index
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_movement_type ON arrivals("movementType");',

        // Variety index
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_variety ON arrivals(variety);',

        // Location foreign key indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_to_kunchinittu ON arrivals("toKunchinintuId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_from_kunchinittu ON arrivals("fromKunchinintuId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_to_warehouse ON arrivals("toWarehouseId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_from_warehouse ON arrivals("fromWarehouseId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_to_warehouse_shift ON arrivals("toWarehouseShiftId");',

        // Outturn index for production tracking
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_outturn ON arrivals("outturnId");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_from_outturn ON arrivals("fromOutturnId");',

        // User tracking indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_created_by ON arrivals("createdBy");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_approved_by ON arrivals("approvedBy");',

        // ====== COMPOSITE INDEXES FOR COMMON QUERY PATTERNS ======
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_date_status ON arrivals(date DESC, status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_movement_status_date ON arrivals("movementType", status, date DESC);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_kunchinittu_date ON arrivals("toKunchinintuId", date DESC);',

        // ====== TEXT SEARCH INDEXES ======
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_sl_no ON arrivals("slNo");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_wb_no ON arrivals("wbNo");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_lorry_number ON arrivals("lorryNumber");',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_broker ON arrivals(broker);'
    ];

    let successCount = 0;
    let existsCount = 0;

    for (const indexQuery of indexes) {
        try {
            await sequelize.query(indexQuery);
            successCount++;
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('already')) {
                existsCount++;
            } else {
                console.log(`⚠️ Index warning: ${error.message}`);
            }
        }
    }

    console.log(`✅ 10 Lakh Optimization: ${successCount} new indexes created, ${existsCount} already existed`);

    // Analyze tables for better query planning
    try {
        await sequelize.query('ANALYZE arrivals;');
        console.log('✅ ANALYZE arrivals completed for optimal query planning');
    } catch (error) {
        console.log('⚠️ ANALYZE warning:', error.message);
    }
}

module.exports = { up };
