const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth } = require('../middleware/auth');
const RiceProduction = require('../models/RiceProduction');
const Outturn = require('../models/Outturn');
const Packaging = require('../models/Packaging');

const router = express.Router();

// Get Rice Stock Report with month-wise pagination
router.get('/', auth, async (req, res) => {
    try {
        const { month, dateFrom, dateTo, productType, locationCode, page, limit } = req.query; // month format: YYYY-MM

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateFrom && !dateRegex.test(dateFrom)) {
            return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD' });
        }
        if (dateTo && !dateRegex.test(dateTo)) {
            return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD' });
        }

        // Validate product type
        const validProductTypes = [
            'Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken',
            'Rejection Broken', 'Broken', 'Zero Broken', 'Faram',
            'Unpolished', 'RJ Rice 1', 'RJ Rice 2'
        ];
        if (productType && !validProductTypes.includes(productType)) {
            return res.status(400).json({ error: 'Invalid product type' });
        }

        const where = {
            status: 'approved'
        };

        // Exclude CLEARING entries - they represent waste/loss, not actual stock
        where[Op.or] = [
            { locationCode: { [Op.ne]: 'CLEARING' } },
            { locationCode: null } // Include loading entries (null locationCode but have lorryNumber/billNumber)
        ];

        // Month-wise filtering
        if (month) {
            const [year, monthNum] = month.split('-');
            const startDate = `${year}-${monthNum}-01`;
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
            where.date = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
        } else if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date[Op.gte] = dateFrom;
            if (dateTo) where.date[Op.lte] = dateTo;
        }

        // Product type filtering
        if (productType) {
            where.productType = productType;
        }

        // Location code filtering
        if (locationCode) {
            where.locationCode = locationCode;
        }

        // Get all rice productions with related data
        const productions = await RiceProduction.findAll({
            where,
            include: [
                {
                    model: Outturn,
                    as: 'outturn',
                    attributes: ['id', 'code', 'allottedVariety', 'type']
                },
                {
                    model: Packaging,
                    as: 'packaging',
                    attributes: ['id', 'brandName', 'code', 'allottedKg']
                }
            ],
            order: [['date', 'ASC'], ['createdAt', 'ASC']]
        });

        // Helper function to create consistent stock grouping key
        // Group by: product-packaging-bagSize-location-outturn
        const createStockKey = (prod) => {
            return `${prod.product}-${prod.packaging}-${prod.bagSizeKg}-${prod.location}-${prod.outturnCode || 'NONE'}`;
        };

        // Helper function to find matching stock for loading (ignores location)
        const findMatchingStockForLoading = (prod, runningStock) => {
            return Object.keys(runningStock).find(k => {
                const stock = runningStock[k];
                return stock.product === prod.product &&
                    stock.packaging === prod.packaging &&
                    stock.bagSizeKg === prod.bagSizeKg &&
                    stock.outturnCode === prod.outturnCode;
            });
        };

        // Helper function to format production data
        const formatProduction = (prod) => {
            // Determine location display based on movement type
            let locationDisplay = 'N/A';
            if (prod.movementType === 'kunchinittu') {
                locationDisplay = prod.locationCode ? prod.locationCode.toUpperCase() : 'N/A';
            } else if (prod.movementType === 'loading') {
                const lorryNum = prod.lorryNumber ? prod.lorryNumber.toUpperCase() : 'N/A';
                const billNum = prod.billNumber ? prod.billNumber.toUpperCase() : 'N/A';
                locationDisplay = `Lorry: ${lorryNum}, Bill: ${billNum}`;
            }

            // Format product name with variety for specific products
            let productDisplay = prod.productType;
            if (prod.outturn && prod.outturn.allottedVariety) {
                const productTypeLower = prod.productType.toLowerCase();
                const variety = prod.outturn.allottedVariety;
                const type = prod.outturn.type || '';

                // Add variety prefix for RJ Rice 1, RJ Rice 2, Bran, and Broken
                if (productTypeLower === 'rj rice 1' || productTypeLower === 'rj rice 2') {
                    productDisplay = `${variety} ${type} ${prod.productType}`.trim();
                } else if (productTypeLower === 'bran') {
                    productDisplay = `${type} ${prod.productType}`.trim();
                } else if (productTypeLower === 'broken') {
                    productDisplay = `${variety} ${type} ${prod.productType}`.trim();
                }
            }

            // Keep all values positive - handle subtraction in running stock calculation
            const qtlsValue = parseFloat(prod.quantityQuintals);
            const bagsValue = parseInt(prod.bags);

            return {
                id: prod.id,
                qtls: qtlsValue,
                bags: bagsValue,
                bagSizeKg: prod.packaging ? parseFloat(prod.packaging.allottedKg) : 0,
                product: productDisplay,
                packaging: prod.packaging ? prod.packaging.brandName : 'N/A',
                location: locationDisplay,
                outturn: prod.outturn ? `${prod.outturn.code} - ${prod.outturn.allottedVariety} ${prod.outturn.type}` : 'N/A',
                outturnCode: prod.outturn ? prod.outturn.code : null,
                outturnId: prod.outturn ? prod.outturn.id : null,
                variety: prod.outturn ? prod.outturn.allottedVariety : null,
                type: prod.outturn ? prod.outturn.type : null,
                movementType: prod.movementType
            };
        };

        // Helper function to process a transaction and update running stock
        const processTransaction = (prod, runningStock) => {
            if (prod.movementType === 'loading') {
                // Loading = Rice being dispatched/sold - SUBTRACT from existing stock
                // Find matching stock entry by product, packaging, bagSize, and outturn (ignore location)
                const matchingKey = findMatchingStockForLoading(prod, runningStock);

                if (matchingKey) {
                    // Subtract from stock
                    runningStock[matchingKey].qtls -= prod.qtls;
                    runningStock[matchingKey].bags -= prod.bags;

                    // Remove from running stock if it reaches zero or negative
                    if (runningStock[matchingKey].qtls <= 0 || runningStock[matchingKey].bags <= 0) {
                        delete runningStock[matchingKey];
                    }
                } else {
                    // Enhanced error logging with available stock keys
                    console.error('Loading transaction without matching stock', {
                        date: prod.date || 'unknown',
                        product: prod.product,
                        packaging: prod.packaging,
                        bagSize: prod.bagSizeKg,
                        outturn: prod.outturnCode,
                        quantity: prod.qtls,
                        availableStockKeys: Object.keys(runningStock),
                        availableStock: Object.values(runningStock).map(s => ({
                            product: s.product,
                            packaging: s.packaging,
                            bagSize: s.bagSizeKg,
                            outturn: s.outturnCode,
                            qtls: s.qtls
                        }))
                    });

                    // CRITICAL: Do not add loading to stock - it should only subtract
                    // If no match found, log error but don't modify stock
                }
            } else {
                // Kunchinittu = Rice being stored - ADD to stock
                const key = createStockKey(prod);

                console.log(`  Adding kunchinittu to stock: key="${key}", qtls=${prod.qtls}`);

                if (!runningStock[key]) {
                    runningStock[key] = {
                        qtls: 0,
                        bags: 0,
                        bagSizeKg: prod.bagSizeKg,
                        product: prod.product,
                        packaging: prod.packaging,
                        location: prod.location,
                        outturn: prod.outturn,
                        outturnCode: prod.outturnCode,
                        variety: prod.variety,
                        type: prod.type
                    };
                    console.log(`  Created new stock entry for key="${key}"`);
                } else {
                    console.log(`  Adding to existing stock entry for key="${key}", current qtls=${runningStock[key].qtls}`);
                }

                runningStock[key].qtls += prod.qtls;
                runningStock[key].bags += prod.bags;
                console.log(`  After adding: key="${key}", new qtls=${runningStock[key].qtls}`);
            }
        };

        // Group by date
        const groupedByDate = {};

        productions.forEach(prod => {
            const date = prod.date;

            if (!groupedByDate[date]) {
                groupedByDate[date] = {
                    date,
                    openingStock: {},
                    productions: [],
                    closingStock: {}
                };
            }

            const formattedProd = formatProduction(prod);
            formattedProd.date = date; // Add date for error logging
            groupedByDate[date].productions.push(formattedProd);
        });

        // Calculate opening and closing stock for each date
        const dates = Object.keys(groupedByDate).sort();

        // Initialize running stock with transactions before the first date
        let runningStock = {};

        if (dates.length > 0) {
            const startDate = dates[0];

            // Fetch all transactions before the start date to calculate initial opening stock
            const priorProductions = await RiceProduction.findAll({
                where: {
                    status: 'approved',
                    date: { [Op.lt]: startDate },
                    [Op.or]: [
                        { locationCode: { [Op.ne]: 'CLEARING' } },
                        { locationCode: null }
                    ]
                },
                include: [
                    {
                        model: Outturn,
                        as: 'outturn',
                        attributes: ['id', 'code', 'allottedVariety', 'type']
                    },
                    {
                        model: Packaging,
                        as: 'packaging',
                        attributes: ['id', 'brandName', 'code', 'allottedKg']
                    }
                ],
                order: [['date', 'ASC'], ['createdAt', 'ASC']]
            });

            // Process prior transactions to build initial running stock
            console.log(`Processing ${priorProductions.length} prior transactions before ${startDate}`);
            priorProductions.forEach(prod => {
                const formattedProd = formatProduction(prod);
                formattedProd.date = prod.date;
                console.log(`Prior transaction: ${prod.date} - ${formattedProd.movementType} - ${formattedProd.product} - ${formattedProd.qtls}Q`);
                processTransaction(formattedProd, runningStock);
            });
            console.log(`Initial running stock total: ${Object.values(runningStock).reduce((sum, s) => sum + s.qtls, 0)}Q`);
        }

        // Process each date and calculate opening/closing stock
        dates.forEach(date => {
            const dayData = groupedByDate[date];

            // Opening stock is a deep copy of the running stock from previous day
            dayData.openingStock = JSON.parse(JSON.stringify(runningStock));
            const openingTotal = Object.values(dayData.openingStock).reduce((sum, s) => sum + s.qtls, 0);
            console.log(`\n${date} - Opening Stock: ${openingTotal}Q`);

            // Process today's production entries
            dayData.productions.forEach(prod => {
                console.log(`  Processing: ${prod.movementType} - ${prod.product} - ${prod.qtls}Q`);
                processTransaction(prod, runningStock);
            });

            // Closing stock is a deep copy of the running stock after today's production
            dayData.closingStock = JSON.parse(JSON.stringify(runningStock));
            const closingTotal = Object.values(dayData.closingStock).reduce((sum, s) => sum + s.qtls, 0);
            console.log(`${date} - Closing Stock: ${closingTotal}Q`);
        });

        // Validate stock continuity between consecutive days
        for (let i = 1; i < dates.length; i++) {
            const prevDate = dates[i - 1];
            const currDate = dates[i];

            const prevClosing = groupedByDate[prevDate].closingStock;
            const currOpening = groupedByDate[currDate].openingStock;

            // Compare stock objects
            const prevKeys = Object.keys(prevClosing).sort();
            const currKeys = Object.keys(currOpening).sort();

            if (JSON.stringify(prevKeys) !== JSON.stringify(currKeys)) {
                console.warn(`Stock continuity warning: ${prevDate} -> ${currDate}`);
                console.warn('Previous closing keys:', prevKeys);
                console.warn('Current opening keys:', currKeys);
            }

            // Compare quantities for matching keys
            prevKeys.forEach(key => {
                if (prevClosing[key] && currOpening[key]) {
                    if (Math.abs(prevClosing[key].qtls - currOpening[key].qtls) > 0.01) {
                        console.warn(`Quantity mismatch for ${key}: ${prevDate} closing=${prevClosing[key].qtls}, ${currDate} opening=${currOpening[key].qtls}`);
                    }
                }
            });
        }

        // Format response - use consistent structure for opening and closing stock
        const allRiceStock = dates.map(date => {
            const dayData = groupedByDate[date];

            return {
                date,
                openingStock: Object.values(dayData.openingStock).map(stock => ({
                    qtls: stock.qtls,
                    bags: stock.bags,
                    bagSizeKg: stock.bagSizeKg,
                    product: stock.product,
                    packaging: stock.packaging,
                    location: stock.location,
                    outturn: stock.outturn
                })),
                productions: dayData.productions,
                closingStock: Object.values(dayData.closingStock).map(stock => ({
                    qtls: stock.qtls,
                    bags: stock.bags,
                    bagSizeKg: stock.bagSizeKg,
                    product: stock.product,
                    packaging: stock.packaging,
                    location: stock.location,
                    outturn: stock.outturn
                })),
                openingStockTotal: Object.values(dayData.openingStock).reduce((sum, s) => sum + s.qtls, 0),
                closingStockTotal: Object.values(dayData.closingStock).reduce((sum, s) => sum + s.qtls, 0)
            };
        });

        // Get available months for pagination
        const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM rice_productions
      WHERE status = 'approved'
      ORDER BY month DESC
    `);

        const availableMonths = monthsQuery[0];

        // Apply pagination only if not using month filter
        let responseData;

        if (month) {
            // Month-wise view: Return all records for the month
            responseData = {
                riceStock: allRiceStock,
                pagination: {
                    currentMonth: month,
                    availableMonths: availableMonths,
                    totalRecords: allRiceStock.length
                }
            };
        } else if (page && limit) {
            // Date range view: Use pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedRiceStock = allRiceStock.slice(startIndex, endIndex);

            responseData = {
                riceStock: paginatedRiceStock,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(allRiceStock.length / limitNum),
                    totalRecords: allRiceStock.length,
                    recordsPerPage: limitNum,
                    availableMonths: availableMonths
                }
            };
        } else {
            // No pagination: Return all records
            responseData = {
                riceStock: allRiceStock,
                pagination: {
                    totalRecords: allRiceStock.length,
                    availableMonths: availableMonths
                }
            };
        }

        res.json(responseData);
    } catch (error) {
        console.error('Get rice stock error:', error);

        // Handle specific error types
        if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeDatabaseError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        res.status(500).json({ error: 'Failed to fetch rice stock' });
    }
});

module.exports = router;
