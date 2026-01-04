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

        // -------------------------------------------------------------------------
        // FIXED: Fetch Rice Stock Movements (Purchase, Sale, Palti)
        // -------------------------------------------------------------------------
        const movementWhereParts = ["rsm.status = 'approved'"];
        if (month) {
            const [year, monthNum] = month.split('-');
            const startDate = `${year}-${monthNum}-01`;
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
            movementWhereParts.push(`rsm.date >= '${startDate}' AND rsm.date <= '${endDate}'`);
        } else if (dateFrom || dateTo) {
            if (dateFrom) movementWhereParts.push(`rsm.date >= '${dateFrom}'`);
            if (dateTo) movementWhereParts.push(`rsm.date <= '${dateTo}'`);
        }
        if (productType) movementWhereParts.push(`rsm.product_type = '${productType}'`);
        if (locationCode) movementWhereParts.push(`rsm.location_code = '${locationCode}'`);

        const [movements] = await sequelize.query(`
            SELECT 
                rsm.id,
                rsm.date,
                rsm.movement_type as "movementType",
                rsm.product_type as "productType",
                rsm.variety,
                rsm.bags,
                rsm.bag_size_kg as "bagSizeKg",
                rsm.quantity_quintals as "quantityQuintals",
                rsm.location_code as "locationCode",
                rsm.from_location,
                rsm.to_location,
                rsm.bill_number as "billNumber",
                rsm.lorry_number as "lorryNumber",
                p1."brandName" as packaging_brand,
                p1."allottedKg" as packaging_kg,
                p2."brandName" as source_packaging_brand,
                p2."allottedKg" as source_packaging_kg,
                p3."brandName" as target_packaging_brand,
                p3."allottedKg" as target_packaging_kg
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p1 ON rsm.packaging_id = p1.id
            LEFT JOIN packagings p2 ON rsm.source_packaging_id = p2.id
            LEFT JOIN packagings p3 ON rsm.target_packaging_id = p3.id
            WHERE ${movementWhereParts.join(' AND ')}
            ORDER BY rsm.date ASC, rsm.created_at ASC
        `);


        // Helper function to create consistent stock grouping key
        // FIXED: Group by 4 conditions: variety (w/ type)-product-packaging-location
        const createStockKey = (prod) => {
            const variety = `${prod.variety || ''} ${prod.type || ''}`.trim() || 'NONE';
            const product = prod.product || 'NONE';
            const packaging = prod.packaging || 'NONE';
            const location = prod.location || 'NONE';
            return `${variety}-${product}-${packaging}-${location}`;
        };

        // Helper function to find matching stock for deductions (ignores location/outturn)
        const findMatchingStockForDeduction = (prod, runningStock) => {
            const searchVariety = `${prod.variety || ''} ${prod.type || ''}`.trim() || 'NONE';
            return Object.keys(runningStock).find(k => {
                const stock = runningStock[k];
                const stockVariety = `${stock.variety || ''} ${stock.type || ''}`.trim() || 'NONE';
                return stockVariety === searchVariety &&
                    stock.product === prod.product &&
                    stock.packaging === prod.packaging;
            });
        };

        // Helper function to format any rice transaction (Production or Movement)
        const formatTransaction = (item) => {
            const isProduction = item.productType !== undefined && item.movementType !== 'purchase' && item.movementType !== 'sale' && item.movementType !== 'palti';

            let variety, type, product, packaging, location, bagSizeKg;
            let displayLocation = 'N/A';
            let displayOutturn = 'N/A';

            if (isProduction) {
                variety = item.outturn ? item.outturn.allottedVariety : null;
                type = item.outturn ? item.outturn.type : null;
                product = item.productType;
                packaging = item.packaging ? item.packaging.brandName : 'N/A';
                bagSizeKg = item.packaging ? parseFloat(item.packaging.allottedKg) : 0;

                if (item.movementType === 'kunchinittu') {
                    displayLocation = item.locationCode ? item.locationCode.toUpperCase() : 'N/A';
                    location = displayLocation;
                } else {
                    displayLocation = `Lorry: ${item.lorryNumber || 'N/A'}, Bill: ${item.billNumber || 'N/A'}`;
                    location = item.locationCode || 'LOADING';
                }
                displayOutturn = item.outturn ? `${item.outturn.code} - ${item.outturn.allottedVariety} ${item.outturn.type}` : 'N/A';
            } else {
                variety = item.variety;
                type = ''; // Movements already have variety strings like "BPT Raw"
                product = item.productType;
                packaging = item.packaging_brand || 'N/A';
                bagSizeKg = parseFloat(item.bagSizeKg) || 0;
                location = item.locationCode || 'N/A';
                displayLocation = location;

                if (item.movementType === 'purchase') {
                    displayLocation = `Purchase: ${item.from_location || 'Supplier'}`;
                } else if (item.movementType === 'sale') {
                    displayLocation = `Sale: ${item.to_location || 'Customer'}`;
                } else if (item.movementType === 'palti') {
                    displayLocation = `Palti: ${item.locationCode || 'Stock'}`;
                }
            }

            return {
                id: item.id,
                date: item.date,
                movementType: item.movementType,
                qtls: parseFloat(item.quantityQuintals) || 0,
                bags: parseInt(item.bags) || 0,
                bagSizeKg,
                variety,
                type,
                product,
                packaging,
                location,
                displayLocation,
                displayOutturn,
                // Palti specific
                source_packaging: item.source_packaging_brand,
                target_packaging: item.target_packaging_brand,
                source_packaging_kg: item.source_packaging_kg,
                target_packaging_kg: item.target_packaging_kg,
                shortage_qtls: (parseFloat(item.conversion_shortage_kg) || 0) / 100
            };
        };


        // Helper function to process a transaction and update running stock
        const processTransaction = (trans, runningStock) => {
            const movementType = trans.movementType;

            if (movementType === 'loading' || movementType === 'sale') {
                // SUBTRACT from existing stock
                const matchingKey = findMatchingStockForDeduction(trans, runningStock);
                if (matchingKey) {
                    runningStock[matchingKey].qtls -= trans.qtls;
                    runningStock[matchingKey].bags -= trans.bags;
                    if (runningStock[matchingKey].qtls <= 0.001) delete runningStock[matchingKey];
                } else {
                    console.warn(`Deduction without matching stock: ${trans.product} ${trans.variety} (${movementType})`);
                }
            } else if (movementType === 'palti') {
                // PALTI: Subtract from source, add to target
                const sourceKey = Object.keys(runningStock).find(k => {
                    const s = runningStock[k];
                    return s.product === trans.product && s.packaging === trans.source_packaging && s.location === trans.location;
                });

                if (sourceKey) {
                    runningStock[sourceKey].qtls -= trans.qtls;
                    runningStock[sourceKey].bags -= trans.bags; // This might be tricky if bag sizes differ
                    if (runningStock[sourceKey].qtls <= 0.001) delete runningStock[sourceKey];
                }

                const targetKey = createStockKey({
                    variety: trans.variety,
                    type: trans.type,
                    product: trans.product,
                    packaging: trans.target_packaging,
                    location: trans.location
                });

                if (!runningStock[targetKey]) {
                    runningStock[targetKey] = {
                        qtls: 0, bags: 0, bagSizeKg: trans.target_packaging_kg,
                        product: trans.product, packaging: trans.target_packaging, location: trans.location,
                        variety: trans.variety, type: trans.type
                    };
                }
                runningStock[targetKey].qtls += (trans.qtls - trans.shortage_qtls);
                runningStock[targetKey].bags += (trans.bags); // Usually palti is bag-to-bag conversion
            } else {
                // ADD to stock (kunchinittu, purchase, etc.)
                const key = createStockKey(trans);
                if (!runningStock[key]) {
                    runningStock[key] = {
                        qtls: 0, bags: 0, bagSizeKg: trans.bagSizeKg,
                        product: trans.product, packaging: trans.packaging, location: trans.location,
                        variety: trans.variety, type: trans.type, outturn: trans.displayOutturn
                    };
                }
                runningStock[key].qtls += trans.qtls;
                runningStock[key].bags += trans.bags;
            }
        };


        // Combine and Sort all transactions
        const allTransactions = [
            ...productions.map(p => formatTransaction(p)),
            ...movements.map(m => formatTransaction(m))
        ].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            // If same date, productions first, then loading/sales
            const order = { 'kunchinittu': 1, 'purchase': 2, 'palti': 3, 'loading': 4, 'sale': 5 };
            return (order[a.movementType] || 9) - (order[b.movementType] || 9);
        });

        // Group by date for the requested range
        const groupedByDate = {};
        allTransactions.forEach(trans => {
            const date = trans.date;
            // Only group transactions that fall within the requested date range
            if (where.date) {
                const startDate = where.date[Op.gte];
                const endDate = where.date[Op.lte];
                if (date < startDate || date > endDate) return;
            }

            if (!groupedByDate[date]) {
                groupedByDate[date] = {
                    date,
                    openingStock: {},
                    productions: [],
                    closingStock: {}
                };
            }
            groupedByDate[date].productions.push(trans);
        });

        const dates = Object.keys(groupedByDate).sort();
        let runningStock = {};

        // Process ALL transactions before the start date to calculate the initial opening stock
        const firstDateRequested = dates.length > 0 ? dates[0] : (dateFrom || '2000-01-01');

        // Productions before range
        const priorProductions = await RiceProduction.findAll({
            where: {
                status: 'approved',
                date: { [Op.lt]: firstDateRequested },
                [Op.or]: [{ locationCode: { [Op.ne]: 'CLEARING' } }, { locationCode: null }]
            },
            include: [
                { model: Outturn, as: 'outturn', attributes: ['allottedVariety', 'type', 'code'] },
                { model: Packaging, as: 'packaging', attributes: ['brandName', 'allottedKg'] }
            ],
            order: [['date', 'ASC']]
        });

        // Movements before range
        const [priorMovements] = await sequelize.query(`
            SELECT 
                rsm.date, rsm.movement_type as "movementType", rsm.product_type as "productType",
                rsm.variety, rsm.bags, rsm.bag_size_kg as "bagSizeKg", rsm.quantity_quintals as "quantityQuintals",
                rsm.location_code as "locationCode", p1."brandName" as packaging_brand
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p1 ON rsm.packaging_id = p1.id
            WHERE rsm.status = 'approved' AND rsm.date < '${firstDateRequested}'
            ORDER BY rsm.date ASC
        `);

        // Combine and process prior transactions
        const priorTransactions = [
            ...priorProductions.map(p => formatTransaction(p)),
            ...priorMovements.map(m => formatTransaction(m))
        ].sort((a, b) => a.date.localeCompare(b.date));

        priorTransactions.forEach(trans => processTransaction(trans, runningStock));


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
