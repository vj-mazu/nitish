/**
 * Test file for Records PDF Generator
 * Run with: npx ts-node src/utils/recordsPdfGenerator.test.ts
 * Or test in browser console
 */

// Test data for PDF generation
export const testArrivalsData = [
    {
        slNo: 'SL001',
        date: '2025-12-24',
        movementType: 'purchase',
        broker: 'John Broker',
        fromLocation: 'Warehouse A',
        toKunchinittu: { code: 'KN001', name: 'Kunchinittu 1' },
        toWarehouse: { code: 'WH001', name: 'Warehouse 1' },
        variety: 'IR64',
        bags: 100,
        moisture: 14.5,
        cutting: 'Good',
        wbNo: 'WB12345',
        grossWeight: 5500,
        tareWeight: 200,
        netWeight: 5300,
        lorryNumber: 'TN01AB1234',
        status: 'approved'
    },
    {
        slNo: 'SL002',
        date: '2025-12-24',
        movementType: 'shifting',
        fromKunchinittu: { code: 'KN001', name: 'Kunchinittu 1' },
        fromWarehouse: { code: 'WH001', name: 'Warehouse 1' },
        toKunchinittu: { code: 'KN002', name: 'Kunchinittu 2' },
        toWarehouseShift: { code: 'WH002', name: 'Warehouse 2' },
        variety: 'Sona Masuri',
        bags: 50,
        netWeight: 2500,
        lorryNumber: 'TN02AB5678',
        status: 'pending'
    }
];

export const testPurchaseData = [
    {
        slNo: 'SL003',
        date: '2025-12-23',
        movementType: 'purchase',
        broker: 'Jane Trader',
        fromLocation: 'Farm XYZ',
        toKunchinittu: { code: 'KN003', name: 'Kunchinittu 3' },
        toWarehouse: { code: 'WH003', name: 'Warehouse 3' },
        variety: 'Basmati',
        bags: 200,
        moisture: 13.2,
        netWeight: 10500,
        lorryNumber: 'AP03CD9012',
        purchaseRate: {
            averageRate: 2450.50,
            totalAmount: 257302.50,
            amountFormula: 'Standard'
        },
        status: 'approved'
    }
];

export const testRiceStockMovements = [
    {
        date: '2025-12-24',
        movement_type: 'production',
        product_type: 'Rice',
        variety: 'IR64 Raw',
        bags: 80,
        quantity_quintals: 20.8,
        location_code: 'L01',
        packaging_brand: 'A1 Premium',
        status: 'approved'
    },
    {
        date: '2025-12-24',
        movement_type: 'sale',
        product_type: 'Broken',
        variety: 'Mixed',
        bags: 30,
        quantity_quintals: 7.8,
        location_code: 'L02',
        packaging_brand: 'White Packet',
        status: 'approved'
    },
    {
        date: '2025-12-23',
        movement_type: 'palti',
        product_type: 'Rice',
        variety: 'Sona Raw',
        bags: 100,
        quantity_quintals: 26.0,
        location_code: 'L01',
        packaging_brand: 'A1 Premium',
        status: 'approved'
    }
];

export const testRiceStockData = [
    {
        date: '2025-12-24',
        productions: [
            {
                product: 'Rice',
                variety: 'IR64 Raw',
                location: 'L01',
                bags: 80,
                qtls: 20.8,
                packaging: { brandName: 'A1 Premium' }
            },
            {
                product: 'Broken',
                variety: 'Mixed',
                location: 'L02',
                bags: 30,
                qtls: 7.8,
                packaging: { brandName: 'White Packet' }
            }
        ],
        openingStockTotal: 150.5,
        closingStockTotal: 179.1
    },
    {
        date: '2025-12-23',
        productions: [
            {
                product: 'Rice',
                variety: 'Sona Raw',
                location: 'L01',
                bags: 100,
                qtls: 26.0,
                packaging: { brandName: 'A1 Premium' }
            }
        ],
        openingStockTotal: 124.5,
        closingStockTotal: 150.5
    }
];

// Test runner (run in browser console)
export const runTests = async () => {
    console.log('='.repeat(60));
    console.log('PDF Generator Test Suite');
    console.log('='.repeat(60));

    // Import the PDF generator (browser environment assumed)
    const {
        generateArrivalsPDF,
        generatePurchasePDF,
        generateRiceMovementsPDF,
        generateRiceStockPDF
    } = await import('./recordsPdfGenerator');

    console.log('\nTest 1: Arrivals PDF');
    try {
        generateArrivalsPDF(testArrivalsData, {
            title: 'Test: All Arrivals Report',
            dateRange: '24-12-2025',
            filterType: 'day'
        });
        console.log('✅ Arrivals PDF generated successfully!');
    } catch (error) {
        console.error('❌ Arrivals PDF failed:', error);
    }

    console.log('\nTest 2: Purchase PDF with Totals');
    try {
        generatePurchasePDF(testPurchaseData, {
            title: 'Test: Purchase Records Report',
            dateRange: '23-12-2025',
            filterType: 'day'
        });
        console.log('✅ Purchase PDF generated successfully!');
    } catch (error) {
        console.error('❌ Purchase PDF failed:', error);
    }

    console.log('\nTest 3: Rice Movements PDF');
    try {
        generateRiceMovementsPDF(testRiceStockMovements, {
            title: 'Test: Rice Stock Movements',
            dateRange: '2025-12-23 to 2025-12-24',
            filterType: 'week'
        });
        console.log('✅ Rice Movements PDF generated successfully!');
    } catch (error) {
        console.error('❌ Rice Movements PDF failed:', error);
    }

    console.log('\nTest 4: Rice Stock PDF');
    try {
        generateRiceStockPDF(testRiceStockData, {
            title: 'Test: Rice Stock Report',
            dateRange: 'December 2025',
            filterType: 'month'
        });
        console.log('✅ Rice Stock PDF generated successfully!');
    } catch (error) {
        console.error('❌ Rice Stock PDF failed:', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('All tests completed! Check downloaded PDFs.');
    console.log('='.repeat(60));
};

// Export for use
export default { testArrivalsData, testPurchaseData, testRiceStockMovements, testRiceStockData, runTests };
