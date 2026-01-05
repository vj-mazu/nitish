const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();
const cacheService = require('../services/cacheService');

// Get rice stock movements with filtering and pagination - OPTIMIZED WITH CACHING
router.get('/movements', auth, async (req, res) => {
    const startTime = Date.now();
    try {
        const {
            year,
            month,
            dateFrom,
            dateTo,
            movementType,
            productType,
            approvalStatus,
            page = 1,
            limit = 50
        } = req.query;

        // Create cache key
        const cacheKey = `rice-movements:${page}:${limit}:${year || ''}:${month || ''}:${dateFrom || ''}:${dateTo || ''}:${movementType || ''}:${productType || ''}:${approvalStatus || ''}`;

        // Try cache first (60 second TTL)
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            const responseTime = Date.now() - startTime;
            return res.json({ ...cached, performance: { responseTime: `${responseTime}ms`, cached: true } });
        }

        // Build where clause
        const where = {};

        // Date range filters take priority over Month/Year filter
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date[Op.gte] = dateFrom;
            if (dateTo) where.date[Op.lte] = dateTo;
        } else if (year && month) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
            where.date = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
        }

        // Movement type filtering
        if (movementType) {
            where.movement_type = movementType;
        }

        // Product type filtering
        if (productType) {
            where.product_type = productType;
        }

        // Approval status filtering
        if (approvalStatus) {
            where.status = approvalStatus;
        }

        // Execute query with pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await sequelize.query(`
            SELECT 
                rsm.id,
                rsm.date,
                rsm.movement_type,
                rsm.product_type,
                rsm.variety,
                rsm.bags,
                rsm.bag_size_kg,
                rsm.quantity_quintals,
                rsm.packaging_id,
                rsm.location_code,
                rsm.from_location,
                rsm.to_location,
                rsm.bill_number,
                rsm.lorry_number,
                rsm.source_packaging_id,
                rsm.target_packaging_id,
                rsm.conversion_shortage_kg,
                rsm.conversion_shortage_bags,
                rsm.status,
                rsm.created_at,
                rsm.updated_at,
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
            WHERE ${Object.keys(where).length > 0 ?
                Object.keys(where).map(key => {
                    if (key === 'date' && typeof where[key] === 'object') {
                        const conditions = [];
                        if (where[key][Op.gte]) conditions.push(`rsm.date >= '${where[key][Op.gte]}'`);
                        if (where[key][Op.lte]) conditions.push(`rsm.date <= '${where[key][Op.lte]}'`);
                        return conditions.join(' AND ');
                    }
                    return `rsm.${key} = '${where[key]}'`;
                }).join(' AND ') : '1=1'
            }
            ORDER BY rsm.date DESC, rsm.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${offset}
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        // Get total count only on first page for performance
        let total = result.length;
        let totalPages = 1;

        if (parseInt(page) === 1) {
            const countResult = await sequelize.query(`
                SELECT COUNT(*) as total
                FROM rice_stock_movements rsm
                WHERE ${Object.keys(where).length > 0 ?
                    Object.keys(where).map(key => {
                        if (key === 'date' && typeof where[key] === 'object') {
                            const conditions = [];
                            if (where[key][Op.gte]) conditions.push(`rsm.date >= '${where[key][Op.gte]}'`);
                            if (where[key][Op.lte]) conditions.push(`rsm.date <= '${where[key][Op.lte]}'`);
                            return conditions.join(' AND ');
                        }
                        return `rsm.${key} = '${where[key]}'`;
                    }).join(' AND ') : '1=1'
                }
            `, {
                type: sequelize.QueryTypes.SELECT
            });
            total = parseInt(countResult[0].total);
            totalPages = Math.ceil(total / parseInt(limit));
        }

        const responseData = {
            success: true,
            data: {
                movements: result,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalRecords: total,
                    recordsPerPage: parseInt(limit)
                }
            }
        };

        // Cache for 60 seconds
        await cacheService.set(cacheKey, responseData, 60);

        const responseTime = Date.now() - startTime;
        res.json({ ...responseData, performance: { responseTime: `${responseTime}ms`, cached: false } });
    } catch (error) {
        console.error('Error fetching rice stock movements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rice stock movements'
        });
    }
});

// Get pending rice stock movements (for admin approval)
router.get('/movements/pending', auth, async (req, res) => {
    try {
        // Only admin can see pending movements
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only admin can view pending movements'
            });
        }

        const result = await sequelize.query(`
            SELECT
                rsm.id,
                rsm.date,
                rsm.movement_type,
                rsm.product_type,
                rsm.variety,
                rsm.bags,
                rsm.bag_size_kg,
                rsm.quantity_quintals,
                rsm.packaging_id,
                rsm.location_code,
                rsm.from_location,
                rsm.to_location,
                rsm.bill_number,
                rsm.lorry_number,
                rsm.source_packaging_id,
                rsm.target_packaging_id,
                rsm.conversion_shortage_kg,
                rsm.conversion_shortage_bags,
                rsm.status,
                rsm.created_at,
                rsm.created_by,
                p1."brandName" as packaging_brand,
                p1."allottedKg" as packaging_kg,
                p2."brandName" as source_packaging_brand,
                p2."allottedKg" as source_packaging_kg,
                p3."brandName" as target_packaging_brand,
                p3."allottedKg" as target_packaging_kg,
                u.username as created_by_username
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p1 ON rsm.packaging_id = p1.id
            LEFT JOIN packagings p2 ON rsm.source_packaging_id = p2.id
            LEFT JOIN packagings p3 ON rsm.target_packaging_id = p3.id
            LEFT JOIN users u ON rsm.created_by = u.id
            WHERE rsm.status = 'pending'
            ORDER BY rsm.created_at DESC
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                movements: result,
                count: result.length
            }
        });
    } catch (error) {
        console.error('Error fetching pending rice stock movements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending rice stock movements'
        });
    }
});

// Create new rice stock movement
router.post('/movements', auth, async (req, res) => {
    try {
        const {
            date,
            movementType,
            productType,
            variety,
            bags,
            sourceBags, // For palti operations
            quantityQuintals,
            packagingBrand,
            packagingKg,
            bagSizeKg, // Alternative field name from frontend
            packagingId, // Frontend sends ID, need to resolve to brand
            locationCode,
            fromLocation,
            toLocation,
            billNumber,
            lorryNumber,
            sourcePackagingBrand,
            sourcePackagingKg,
            sourcePackagingId, // Frontend sends ID, need to resolve
            targetPackagingBrand,
            targetPackagingKg,
            targetPackagingId, // Frontend sends ID, need to resolve
            conversionShortageKg: requestedShortageKg, // Direct from frontend
            conversionShortageBags: requestedShortageBags // Direct from frontend
        } = req.body;

        console.log('📥 Rice stock movement creation request:', req.body);


        // Validation
        if (!date || !movementType || !productType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: date, movementType, productType'
            });
        }

        // Validate movement type
        const validMovementTypes = ['purchase', 'sale', 'palti'];
        if (!validMovementTypes.includes(movementType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid movement type. Must be one of: ${validMovementTypes.join(', ')}`
            });
        }

        // STOCK VALIDATION FOR PALTI OPERATIONS
        // Note: This is a soft validation - stock might come from rice_productions or other sources
        if (movementType === 'palti' && sourcePackagingId && sourceBags) {
            try {
                console.log('🔍 Validating palti stock availability (soft check)...');

                // Get current stock for the source packaging - check ALL product types and varieties
                const stockCheckResult = await sequelize.query(`
                    SELECT 
                        COALESCE(SUM(CASE 
                            WHEN movement_type IN ('production', 'purchase') THEN quantity_quintals
                            WHEN movement_type = 'sale' THEN -quantity_quintals
                            WHEN movement_type = 'palti' AND source_packaging_id = :sourcePackagingId THEN -quantity_quintals
                            WHEN movement_type = 'palti' AND target_packaging_id = :sourcePackagingId THEN quantity_quintals
                            ELSE 0
                        END), 0) as available_qtls,
                        COALESCE(SUM(CASE 
                            WHEN movement_type IN ('production', 'purchase') THEN bags
                            WHEN movement_type = 'sale' THEN -bags
                            WHEN movement_type = 'palti' AND source_packaging_id = :sourcePackagingId THEN -bags
                            WHEN movement_type = 'palti' AND target_packaging_id = :sourcePackagingId THEN bags
                            ELSE 0
                        END), 0) as available_bags
                    FROM rice_stock_movements 
                    WHERE status = 'approved' 
                      AND location_code = :locationCode
                      AND (packaging_id = :sourcePackagingId OR source_packaging_id = :sourcePackagingId OR target_packaging_id = :sourcePackagingId)
                `, {
                    replacements: {
                        sourcePackagingId: parseInt(sourcePackagingId),
                        locationCode: locationCode || 'WAREHOUSE1'
                    },
                    type: sequelize.QueryTypes.SELECT
                });

                const currentStock = stockCheckResult[0];
                const availableQtls = parseFloat(currentStock?.available_qtls || 0);
                const availableBags = parseInt(currentStock?.available_bags || 0);
                const requestedBags = parseInt(sourceBags);

                console.log('📊 Stock validation (soft check):', {
                    sourcePackagingId,
                    locationCode: locationCode || 'WAREHOUSE1',
                    availableQtls,
                    availableBags,
                    requestedBags
                });

                // Log warning but DO NOT BLOCK - stock might come from production system
                if (availableBags < requestedBags) {
                    console.log(`⚠️ Stock warning: Available ${availableBags} bags, requested ${requestedBags} bags. Proceeding anyway (stock may come from production).`);
                } else {
                    console.log('✅ Stock validation passed - sufficient stock available');
                }

            } catch (stockError) {
                // Log error but don't block - allow palti to proceed
                console.error('⚠️ Stock validation check failed (proceeding anyway):', stockError.message);
            }
        }

        // Handle different data formats from frontend
        let finalBags = bags || sourceBags;
        let finalPackagingKg = packagingKg || bagSizeKg;
        let finalPackagingBrand = packagingBrand;
        let finalSourcePackagingBrand = sourcePackagingBrand;
        let finalTargetPackagingBrand = targetPackagingBrand;
        let finalQuantityQuintals = quantityQuintals; // Declare this variable early

        console.log('🔍 DEBUG - Initial values:', {
            bags, sourceBags, finalBags,
            packagingKg, bagSizeKg, finalPackagingKg,
            movementType, sourcePackagingId, targetPackagingId
        });

        // For palti operations, use frontend values if provided, or calculate if not
        if (movementType === 'palti' && sourceBags) {
            console.log('🔍 DEBUG - Processing palti operation:', { bags, sourceBags, quantityQuintals });

            // For palti, get packaging info for brand names and calculations
            if (sourcePackagingId && targetPackagingId) {
                try {
                    const [sourcePackagingResult, targetPackagingResult] = await Promise.all([
                        sequelize.query(`SELECT "brandName", "allottedKg" FROM packagings WHERE id = :sourcePackagingId`, {
                            replacements: { sourcePackagingId },
                            type: sequelize.QueryTypes.SELECT
                        }),
                        sequelize.query(`SELECT "brandName", "allottedKg" FROM packagings WHERE id = :targetPackagingId`, {
                            replacements: { targetPackagingId },
                            type: sequelize.QueryTypes.SELECT
                        })
                    ]);

                    if (sourcePackagingResult.length > 0 && targetPackagingResult.length > 0) {
                        const sourceKg = parseFloat(sourcePackagingResult[0].allottedKg);
                        const targetKg = parseFloat(targetPackagingResult[0].allottedKg);

                        // Use frontend-provided values if available, otherwise calculate
                        if (bags && parseInt(bags) > 0) {
                            finalBags = parseInt(bags);
                        } else {
                            const totalKg = parseInt(sourceBags) * sourceKg;
                            finalBags = Math.floor(totalKg / targetKg);
                        }

                        if (quantityQuintals && parseFloat(quantityQuintals) > 0) {
                            finalQuantityQuintals = parseFloat(quantityQuintals);
                        } else {
                            const totalKg = parseInt(sourceBags) * sourceKg;
                            finalQuantityQuintals = totalKg / 100;
                        }

                        finalPackagingKg = targetKg; // Use target packaging kg

                        finalSourcePackagingBrand = sourcePackagingResult[0].brandName;
                        finalTargetPackagingBrand = targetPackagingResult[0].brandName;
                        sourcePackagingKg = sourceKg;
                        targetPackagingKg = targetKg;

                        console.log('📊 Palti conversion processed:', {
                            sourceBags: parseInt(sourceBags),
                            sourceKg,
                            targetBags: finalBags,
                            targetKg,
                            finalQuantityQuintals
                        });
                    } else {
                        console.log('❌ Could not find packaging records');
                    }
                } catch (error) {
                    console.warn('Could not resolve palti packaging conversion:', error.message);
                }
            } else {
                console.log('❌ Missing sourcePackagingId or targetPackagingId');
            }
        }

        // Resolve packaging IDs to brand names if needed
        if (packagingId && !packagingBrand) {
            // Query packaging table to get brand name
            try {
                const packagingResult = await sequelize.query(`
                    SELECT "brandName", "allottedKg" FROM packagings WHERE id = :packagingId
                `, {
                    replacements: { packagingId },
                    type: sequelize.QueryTypes.SELECT
                });

                if (packagingResult.length > 0) {
                    finalPackagingBrand = packagingResult[0].brandName;
                    if (!finalPackagingKg) {
                        finalPackagingKg = packagingResult[0].allottedKg;
                    }
                }
            } catch (error) {
                console.warn('Could not resolve packaging ID:', packagingId);
            }
        }

        // Resolve source packaging ID for palti operations
        if (sourcePackagingId && !sourcePackagingBrand) {
            try {
                const sourcePackagingResult = await sequelize.query(`
                    SELECT "brandName", "allottedKg" FROM packagings WHERE id = :sourcePackagingId
                `, {
                    replacements: { sourcePackagingId },
                    type: sequelize.QueryTypes.SELECT
                });

                if (sourcePackagingResult.length > 0) {
                    finalSourcePackagingBrand = sourcePackagingResult[0].brandName;
                    sourcePackagingKg = sourcePackagingResult[0].allottedKg;
                }
            } catch (error) {
                console.warn('Could not resolve source packaging ID:', sourcePackagingId);
            }
        }

        // Resolve target packaging ID for palti operations
        if (targetPackagingId && !targetPackagingBrand) {
            try {
                const targetPackagingResult = await sequelize.query(`
                    SELECT "brandName", "allottedKg" FROM packagings WHERE id = :targetPackagingId
                `, {
                    replacements: { targetPackagingId },
                    type: sequelize.QueryTypes.SELECT
                });

                if (targetPackagingResult.length > 0) {
                    finalTargetPackagingBrand = targetPackagingResult[0].brandName;
                    targetPackagingKg = targetPackagingResult[0].allottedKg;
                }
            } catch (error) {
                console.warn('Could not resolve target packaging ID:', targetPackagingId);
            }
        }

        // Calculate quantity quintals if not provided
        if (!finalQuantityQuintals && finalBags && finalPackagingKg) {
            finalQuantityQuintals = (parseInt(finalBags) * parseFloat(finalPackagingKg)) / 100;
        }

        // Final validation
        if (!finalBags || !finalQuantityQuintals) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: bags and quantityQuintals (or sufficient data to calculate them)'
            });
        }

        console.log('📊 Processed data for insertion:', {
            date,
            movementType,
            productType,
            variety: variety || 'Sum25 RNR Raw',
            bags: finalBags,
            quantityQuintals: finalQuantityQuintals,
            packagingBrand: finalPackagingBrand || 'White Packet',
            packagingKg: finalPackagingKg || 26,
            locationCode,
            fromLocation,
            toLocation,
            billNumber,
            lorryNumber,
            sourcePackagingBrand: finalSourcePackagingBrand,
            sourcePackagingKg,
            targetPackagingBrand: finalTargetPackagingBrand,
            targetPackagingKg
        });

        // FIXED: Auto-approve if created by admin
        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        console.log(`📊 Setting status to '${status}' for user role: ${req.user.role}`);

        // Insert new movement
        const result = await sequelize.query(`
            INSERT INTO rice_stock_movements (
                date,
                movement_type,
                product_type,
                variety,
                bags,
                bag_size_kg,
                quantity_quintals,
                packaging_id,
                location_code,
                from_location,
                to_location,
                bill_number,
                lorry_number,
                source_packaging_id,
                target_packaging_id,
                conversion_shortage_kg,
                conversion_shortage_bags,
                status,
                created_by,
                created_at,
                updated_at
            ) VALUES (
                :date,
                :movementType,
                :productType,
                :variety,
                :bags,
                :bagSizeKg,
                :quantityQuintals,
                :packagingId,
                :locationCode,
                :fromLocation,
                :toLocation,
                :billNumber,
                :lorryNumber,
                :sourcePackagingId,
                :targetPackagingId,
                :conversionShortageKg,
                :conversionShortageBags,
                :status,
                :createdBy,
                NOW(),
                NOW()
            ) RETURNING id
        `, {
            replacements: {
                date,
                movementType,
                productType,
                variety: variety || 'Sum25 RNR Raw',
                bags: parseInt(finalBags),
                bagSizeKg: finalPackagingKg ? parseFloat(finalPackagingKg) : 26,
                quantityQuintals: parseFloat(finalQuantityQuintals),
                packagingId: packagingId ? parseInt(packagingId) : null,
                locationCode,
                fromLocation: fromLocation || null,
                toLocation: toLocation || null,
                billNumber: billNumber || null,
                lorryNumber: lorryNumber || null,
                sourcePackagingId: sourcePackagingId ? parseInt(sourcePackagingId) : null,
                targetPackagingId: targetPackagingId ? parseInt(targetPackagingId) : null,
                conversionShortageKg: movementType === 'palti' ? (
                    requestedShortageKg !== undefined && requestedShortageKg !== null ? parseFloat(requestedShortageKg) :
                        (sourcePackagingKg && targetPackagingKg ?
                            (parseInt(sourceBags || finalBags) * parseFloat(sourcePackagingKg)) - (parseInt(finalBags) * parseFloat(targetPackagingKg)) : null)
                ) : null,
                conversionShortageBags: movementType === 'palti' ? (
                    requestedShortageBags !== undefined && requestedShortageBags !== null ? parseFloat(requestedShortageBags) :
                        (sourcePackagingKg && targetPackagingKg ?
                            ((parseInt(sourceBags || finalBags) * parseFloat(sourcePackagingKg)) - (parseInt(finalBags) * parseFloat(targetPackagingKg))) / parseFloat(targetPackagingKg) : null)
                ) : null,
                createdBy: req.user.userId,
                status
            },
            type: sequelize.QueryTypes.INSERT
        });

        // Handle different database return formats
        let newId;
        if (result && result[0]) {
            if (Array.isArray(result[0]) && result[0].length > 0) {
                newId = result[0][0].id || result[0][0];
            } else if (result[0].id) {
                newId = result[0].id;
            } else {
                newId = result[0];
            }
        }

        console.log('✅ Rice stock movement created successfully:', { newId, result });

        res.status(201).json({
            success: true,
            data: {
                id: newId,
                message: 'Rice stock movement created successfully'
            }
        });
    } catch (error) {
        console.error('❌ Error creating rice stock movement:', error);

        // Handle specific constraint violations
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error: ' + error.errors.map(e => e.message).join(', ')
            });
        }

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'Duplicate entry: ' + error.errors.map(e => e.message).join(', ')
            });
        }

        // Handle database connection errors
        if (error.name === 'SequelizeConnectionError') {
            return res.status(500).json({
                success: false,
                error: 'Database connection error. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create rice stock movement: ' + error.message
        });
    }
});

// Update rice stock movement
router.put('/movements/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            date,
            movementType,
            productType,
            variety,
            bags,
            quantityQuintals,
            packagingBrand,
            packagingKg,
            locationCode,
            fromLocation,
            toLocation,
            billNumber,
            lorryNumber,
            sourcePackagingBrand,
            sourcePackagingKg,
            targetPackagingBrand,
            targetPackagingKg,
            status
        } = req.body;

        // Check if movement exists and get its status
        const existing = await sequelize.query(`
            SELECT id, status FROM rice_stock_movements WHERE id = :id
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Rice stock movement not found'
            });
        }

        const currentStatus = existing[0].status;

        // Status check - Admins can bypass the 'approved' block
        if (currentStatus === 'approved' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Approved rice stock movements cannot be updated by non-admin users'
            });
        }

        // Update movement
        await sequelize.query(`
            UPDATE rice_stock_movements SET
                date = COALESCE(:date, date),
                movement_type = COALESCE(:movementType, movement_type),
                product_type = COALESCE(:productType, product_type),
                variety = COALESCE(:variety, variety),
                bags = COALESCE(:bags, bags),
                quantity_quintals = COALESCE(:quantityQuintals, quantity_quintals),
                packaging_brand = COALESCE(:packagingBrand, packaging_brand),
                packaging_kg = COALESCE(:packagingKg, packaging_kg),
                location_code = COALESCE(:locationCode, location_code),
                from_location = COALESCE(:fromLocation, from_location),
                to_location = COALESCE(:toLocation, to_location),
                bill_number = COALESCE(:billNumber, bill_number),
                lorry_number = COALESCE(:lorryNumber, lorry_number),
                source_packaging_brand = COALESCE(:sourcePackagingBrand, source_packaging_brand),
                source_packaging_kg = COALESCE(:sourcePackagingKg, source_packaging_kg),
                target_packaging_brand = COALESCE(:targetPackagingBrand, target_packaging_brand),
                target_packaging_kg = COALESCE(:targetPackagingKg, target_packaging_kg),
                status = COALESCE(:status, status),
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id,
                date,
                movementType,
                productType,
                variety,
                bags: bags ? parseInt(bags) : null,
                quantityQuintals: quantityQuintals ? parseFloat(quantityQuintals) : null,
                packagingBrand,
                packagingKg: packagingKg ? parseFloat(packagingKg) : null,
                locationCode,
                fromLocation,
                toLocation,
                billNumber,
                lorryNumber,
                sourcePackagingBrand,
                sourcePackagingKg: sourcePackagingKg ? parseFloat(sourcePackagingKg) : null,
                targetPackagingBrand,
                targetPackagingKg: targetPackagingKg ? parseFloat(targetPackagingKg) : null,
                status
            },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({
            success: true,
            data: {
                message: 'Rice stock movement updated successfully'
            }
        });
    } catch (error) {
        console.error('Error updating rice stock movement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update rice stock movement'
        });
    }
});

// Delete rice stock movement
router.delete('/movements/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if movement exists
        const existing = await sequelize.query(`
            SELECT id FROM rice_stock_movements WHERE id = :id
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Rice stock movement not found'
            });
        }

        // Delete movement
        await sequelize.query(`
            DELETE FROM rice_stock_movements WHERE id = :id
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.DELETE
        });

        res.json({
            success: true,
            data: {
                message: 'Rice stock movement deleted successfully'
            }
        });
    } catch (error) {
        console.error('Error deleting rice stock movement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete rice stock movement'
        });
    }
});

// Batch operations for efficiency
router.post('/movements/batch', auth, async (req, res) => {
    try {
        const { movements } = req.body;

        if (!Array.isArray(movements) || movements.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid movements array'
            });
        }

        const results = [];

        // Process each movement in a transaction
        await sequelize.transaction(async (transaction) => {
            for (const movement of movements) {
                const {
                    date,
                    movementType,
                    productType,
                    variety,
                    bags,
                    quantityQuintals,
                    packagingBrand,
                    packagingKg,
                    locationCode,
                    fromLocation,
                    toLocation,
                    billNumber,
                    lorryNumber,
                    sourcePackagingBrand,
                    sourcePackagingKg,
                    targetPackagingBrand,
                    targetPackagingKg
                } = movement;

                const result = await sequelize.query(`
                    INSERT INTO rice_stock_movements (
                        date,
                        movement_type,
                        product_type,
                        variety,
                        bags,
                        quantity_quintals,
                        packaging_brand,
                        packaging_kg,
                        location_code,
                        from_location,
                        to_location,
                        bill_number,
                        lorry_number,
                        source_packaging_brand,
                        source_packaging_kg,
                        target_packaging_brand,
                        target_packaging_kg,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        :date,
                        :movementType,
                        :productType,
                        :variety,
                        :bags,
                        :quantityQuintals,
                        :packagingBrand,
                        :packagingKg,
                        :locationCode,
                        :fromLocation,
                        :toLocation,
                        :billNumber,
                        :lorryNumber,
                        :sourcePackagingBrand,
                        :sourcePackagingKg,
                        :targetPackagingBrand,
                        :targetPackagingKg,
                        'pending',
                        NOW(),
                        NOW()
                    ) RETURNING id
                `, {
                    replacements: {
                        date,
                        movementType,
                        productType,
                        variety: variety || 'Sum25 RNR Raw',
                        bags: parseInt(bags),
                        quantityQuintals: parseFloat(quantityQuintals),
                        packagingBrand: packagingBrand || 'White Packet',
                        packagingKg: packagingKg ? parseFloat(packagingKg) : 26,
                        locationCode,
                        fromLocation,
                        toLocation,
                        billNumber,
                        lorryNumber,
                        sourcePackagingBrand,
                        sourcePackagingKg: sourcePackagingKg ? parseFloat(sourcePackagingKg) : null,
                        targetPackagingBrand,
                        targetPackagingKg: targetPackagingKg ? parseFloat(targetPackagingKg) : null
                    },
                    type: sequelize.QueryTypes.INSERT,
                    transaction
                });

                results.push({ id: result[0][0].id });
            }
        });

        res.status(201).json({
            success: true,
            data: {
                created: results.length,
                movements: results
            }
        });
    } catch (error) {
        console.error('Error creating batch rice stock movements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create batch rice stock movements'
        });
    }
});

// Get pending rice stock movements for approval
router.get('/movements/pending', auth, async (req, res) => {
    try {
        console.log('🔍 Fetching pending rice stock movements...');

        const result = await sequelize.query(`
            SELECT 
                rsm.id,
                rsm.date,
                rsm.movement_type,
                rsm.product_type,
                rsm.variety,
                rsm.bags,
                rsm.bag_size_kg,
                rsm.quantity_quintals,
                rsm.location_code,
                rsm.from_location,
                rsm.to_location,
                rsm.bill_number,
                rsm.lorry_number,
                rsm.party_name,
                rsm.rate_per_bag,
                rsm.total_amount,
                rsm.status,
                rsm.created_at,
                p1."brandName" as packaging_brand,
                p1."allottedKg" as packaging_kg,
                u.username as created_by_username
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p1 ON rsm.packaging_id = p1.id
            LEFT JOIN users u ON rsm.created_by = u.id
            WHERE rsm.status = 'pending'
            ORDER BY rsm.created_at DESC
            LIMIT 200
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`✅ Found ${result.length} pending movements`);

        res.json({
            success: true,
            data: {
                movements: result
            }
        });
    } catch (error) {
        console.error('Error fetching pending movements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending movements'
        });
    }
});

// Update rice stock movement status (approve/reject)
router.patch('/movements/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const userId = req.user.userId;

        console.log(`🔄 Updating movement ${id} status to ${status} by user ${userId}`);

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        // Check if movement exists
        const [movement] = await sequelize.query(`
            SELECT id, status, created_by 
            FROM rice_stock_movements 
            WHERE id = :id
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!movement) {
            return res.status(404).json({
                success: false,
                error: 'Movement not found'
            });
        }

        // Check if already processed
        if (movement.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Movement is already ${movement.status}`
            });
        }

        // Update the movement status
        const updateFields = {
            status,
            approved_by: userId,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Add rejection reason if provided
        if (status === 'rejected' && rejectionReason) {
            updateFields.rejection_reason = rejectionReason;
        }

        const setClause = Object.keys(updateFields)
            .map(key => `${key} = :${key}`)
            .join(', ');

        await sequelize.query(`
            UPDATE rice_stock_movements 
            SET ${setClause}
            WHERE id = :id
        `, {
            replacements: { ...updateFields, id }
        });

        console.log(`✅ Movement ${id} ${status} successfully`);

        res.json({
            success: true,
            message: `Movement ${status} successfully`,
            data: {
                id: parseInt(id),
                status,
                approvedBy: userId,
                approvedAt: updateFields.approved_at
            }
        });

    } catch (error) {
        console.error('Error updating movement status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update movement status'
        });
    }
});

module.exports = router;