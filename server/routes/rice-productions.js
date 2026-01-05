const express = require('express');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middleware/auth');
const RiceProduction = require('../models/RiceProduction');
const Outturn = require('../models/Outturn');
const Packaging = require('../models/Packaging');
const User = require('../models/User');
const Arrival = require('../models/Arrival');
const ByProduct = require('../models/ByProduct');
const YieldCalculationService = require('../services/YieldCalculationService');

const router = express.Router();

// Helper function to calculate paddy bags deducted from rice quintals
const calculatePaddyBagsDeducted = (quintals, productType) => {
  // No deduction for Bran, Farm Bran, and Faram
  const noDeductionProducts = ['Bran', 'Farm Bran', 'Faram'];
  if (noDeductionProducts.includes(productType)) {
    return 0;
  }

  // For all other products: quintals ÷ 0.47
  const result = quintals / 0.47;

  // Rounding: < 0.5 round down, >= 0.5 round up
  return Math.round(result);
};

// Get all rice productions with pagination - OPTIMIZED WITH CACHING
router.get('/', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { month, dateFrom, dateTo, outturnId, status, limit = 100, page = 1 } = req.query;

    // Create cache key
    const cacheKey = `rice-productions:${page}:${limit}:${outturnId || ''}:${status || ''}:${dateFrom || ''}:${dateTo || ''}:${month || ''}`;

    // Try cache first
    const cached = await require('../services/cacheService').get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      return res.json({ ...cached, performance: { responseTime: `${responseTime}ms`, cached: true } });
    }

    const where = {};

    // Date range filters take priority over Month filter
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    } else if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      where.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    }

    if (outturnId) where.outturnId = outturnId;
    if (status) where.status = status;

    // Pagination setup
    const limitNum = Math.min(parseInt(limit), 500);
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination (only on first page for performance)
    const totalCount = pageNum === 1 ? await RiceProduction.count({ where }) : null;

    const productions = await RiceProduction.findAll({
      where,
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      subQuery: false // Prevent N+1 queries
    });

    const result = {
      productions,
      pagination: {
        totalRecords: totalCount || productions.length,
        recordsReturned: productions.length,
        page: pageNum,
        limit: limitNum,
        totalPages: totalCount ? Math.ceil(totalCount / limitNum) : 1,
        hasNextPage: productions.length === limitNum,
        hasPrevPage: pageNum > 1
      }
    };

    // Cache for 60 seconds
    await require('../services/cacheService').set(cacheKey, result, 60);

    const responseTime = Date.now() - startTime;
    res.json({ ...result, performance: { responseTime: `${responseTime}ms`, cached: false } });
  } catch (error) {
    console.error('Get rice productions error:', error);
    res.status(500).json({ error: 'Failed to fetch rice productions' });
  }
});

// Get rice productions by outturn
router.get('/outturn/:id', auth, async (req, res) => {
  try {
    const productions = await RiceProduction.findAll({
      where: { outturnId: req.params.id },
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ],
      order: [['date', 'DESC']]
    });

    res.json({ productions });
  } catch (error) {
    console.error('Get outturn productions error:', error);
    res.status(500).json({ error: 'Failed to fetch outturn productions' });
  }
});

// Get available bags for outturn
router.get('/outturn/:id/available-bags', auth, async (req, res) => {
  try {
    const outturnId = req.params.id;

    console.log('🔍 Fetching available bags for outturn:', outturnId);

    // First, check if outurn is cleared
    const outturn = await Outturn.findByPk(outturnId);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // If outurn is cleared, return zero available bags with cleared status
    if (outturn.isCleared) {
      console.log('🔒 Outturn is cleared, returning zero available bags');
      return res.json({
        availableBags: 0,
        totalBags: 0,
        usedBags: 0,
        isCleared: true,
        clearedAt: outturn.clearedAt,
        remainingBags: outturn.remainingBags
      });
    }

    // Get total bags for this outturn (production-shifting + for-production purchases)
    const productionShiftingBags = await Arrival.sum('bags', {
      where: {
        outturnId: outturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    console.log('📊 Total paddy bags found:', productionShiftingBags);

    // Get total paddy bags already DEDUCTED from productions
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: outturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    console.log('📊 Used paddy bags (deducted):', usedPaddyBagsDeducted);

    // Calculate available bags (Total - Paddy Bags Deducted)
    const availableBags = productionShiftingBags - usedPaddyBagsDeducted;

    res.json({
      availableBags,
      totalBags: productionShiftingBags,
      usedBags: usedPaddyBagsDeducted,
      isCleared: false
    });
  } catch (error) {
    console.error('Get available bags error:', error);
    res.status(500).json({ error: 'Failed to fetch available bags' });
  }
});

// Get available paddy bags for outturn
router.get('/outturn/:id/available-paddy-bags', auth, async (req, res) => {
  try {
    const outturnId = req.params.id;

    console.log('🔍 Fetching available paddy bags for outturn:', outturnId);

    // First, check if outurn is cleared
    const outturn = await Outturn.findByPk(outturnId);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // If outurn is cleared, return zero available bags with cleared status
    if (outturn.isCleared) {
      console.log('🔒 Outturn is cleared, returning zero available bags');
      return res.json({
        availablePaddyBags: 0,
        totalPaddyBags: 0,
        usedPaddyBags: 0,
        isCleared: true,
        clearedAt: outturn.clearedAt,
        remainingBags: outturn.remainingBags
      });
    }

    // Get total paddy bags for this outturn (production-shifting + for-production purchases)
    const totalPaddyBags = await Arrival.sum('bags', {
      where: {
        outturnId: outturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    console.log('📊 Total paddy bags found:', totalPaddyBags);

    // Get total paddy bags already DEDUCTED from productions
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: outturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    console.log('📊 Used paddy bags (deducted):', usedPaddyBagsDeducted);

    // Calculate available paddy bags (Total Paddy - Already Deducted)
    const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

    res.json({
      availablePaddyBags,
      totalPaddyBags,
      usedPaddyBags: usedPaddyBagsDeducted, // Return deducted bags for frontend
      isCleared: false
    });
  } catch (error) {
    console.error('Get available paddy bags error:', error);
    res.status(500).json({ error: 'Failed to fetch available paddy bags' });
  }
});

// Validate rice production date - validation removed, always return valid
router.post('/validate-date', auth, async (req, res) => {
  try {
    // Date validation removed - allow any date for rice production entry
    res.json({ valid: true });
  } catch (error) {
    console.error('Validate date error:', error);
    res.status(500).json({ error: 'Failed to validate date' });
  }
});

// Create rice production
router.post('/', auth, async (req, res) => {
  try {
    const {
      outturnId,
      outturnNumber,
      date,
      productType,
      bags,
      packagingId,
      movementType,
      locationCode,
      lorryNumber,
      billNumber
    } = req.body;

    // DETAILED LOGGING FOR SIZER BROKEN
    if (productType === 'Sizer Broken') {
      console.log('🔍 SERVER: SIZER BROKEN RECEIVED:');
      console.log('  - Product Type:', productType);
      console.log('  - Product Type Length:', productType.length);
      console.log('  - Product Type Char Codes:', Array.from(productType).map(c => c.charCodeAt(0)));
      console.log('  - Exact Match Test:', productType === 'Sizer Broken');
      console.log('  - Full Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Convert outturnNumber to outturnId if needed
    let finalOutturnId = outturnId;
    if (!finalOutturnId && outturnNumber) {
      const outturn = await Outturn.findOne({ where: { code: outturnNumber } });
      if (!outturn) {
        return res.status(400).json({ error: 'Invalid outturn number' });
      }
      finalOutturnId = outturn.id;
    }

    // Validate required fields
    if (!finalOutturnId || !date || !productType || !bags || !packagingId || !movementType) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if outurn is cleared
    const outturn = await Outturn.findByPk(finalOutturnId);
    if (!outturn) {
      return res.status(400).json({ error: 'Outturn not found' });
    }

    if (outturn.isCleared) {
      return res.status(400).json({
        error: `Cannot create rice production for cleared outurn ${outturn.code}. This outurn was cleared on ${new Date(outturn.clearedAt).toLocaleDateString()}.`,
        isCleared: true,
        clearedAt: outturn.clearedAt
      });
    }

    // Validate movement type specific fields
    if (movementType === 'kunchinittu' && !locationCode) {
      return res.status(400).json({ error: 'Location code is required for kunchinittu movement' });
    }

    if (movementType === 'loading' && (!lorryNumber || !billNumber)) {
      return res.status(400).json({ error: 'Lorry number and bill number are required for loading movement' });
    }

    // Get packaging details for calculation
    const packaging = await Packaging.findByPk(packagingId);
    if (!packaging) {
      return res.status(400).json({ error: 'Invalid packaging selected' });
    }

    // Calculate quintals: (bags × kg_per_bag) / 100
    const bagsNum = parseFloat(bags);
    const kgPerBag = parseFloat(packaging.allottedKg);
    const quantityQuintals = (bagsNum * kgPerBag) / 100;

    // Calculate paddy bags deducted using new formula
    const paddyBagsDeducted = calculatePaddyBagsDeducted(quantityQuintals, productType);

    // Validate available paddy bags for this outturn
    // Get total paddy bags for this outturn (production-shifting + for-production purchases)
    const totalPaddyBags = await Arrival.sum('bags', {
      where: {
        outturnId: finalOutturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    // Get total paddy bags already DEDUCTED (not user-entered bags)
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: finalOutturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    // Calculate available paddy bags (Total - Already Deducted)
    const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

    // Check if NEW paddyBagsDeducted would exceed available paddy bags
    // FIX: Compare deducted bags, not user-entered bags
    if (paddyBagsDeducted > availablePaddyBags) {
      return res.status(400).json({
        error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${paddyBagsDeducted} bags (for ${bags} rice bags)`,
        availablePaddyBags,
        requiredPaddyBags: paddyBagsDeducted
      });
    }

    // Date validation removed - allow any date for rice production entry

    // Create rice production
    const production = await RiceProduction.create({
      outturnId: finalOutturnId,
      date,
      productType,
      quantityQuintals,
      packagingId,
      bags: bagsNum,
      paddyBagsDeducted,
      movementType,
      locationCode: movementType === 'kunchinittu' ? locationCode : null,
      lorryNumber: movementType === 'loading' ? lorryNumber : null,
      billNumber: movementType === 'loading' ? billNumber : null,
      createdBy: req.user.userId,
      status: 'pending'
    });

    // Automatically create or update by-product record with the produced quantity
    // This ensures every rice production has a corresponding by-product entry
    // Check if by-product entry already exists for this outturn and date
    let existingByProduct = await ByProduct.findOne({
      where: { outturnId: finalOutturnId, date: date }
    });

    // Determine which field to update based on product type
    const productTypeLower = productType.toLowerCase();
    let fieldToUpdate = 'rice'; // default

    console.log('🔍 Product Type:', productType);
    console.log('🔍 Product Type Lower:', productTypeLower);

    if (productTypeLower === 'rj rice 1') {
      console.log('✅ Matched RJ Rice 1');
      fieldToUpdate = 'rjRice1';
    } else if (productTypeLower === 'rj rice 2') {
      console.log('✅ Matched RJ Rice 2');
      fieldToUpdate = 'rjRice2';
    } else if (productTypeLower.includes('rice') && !productTypeLower.includes('rejection') && !productTypeLower.includes('sizer')) {
      fieldToUpdate = 'rice';
    } else if ((productTypeLower.includes('rejection') && productTypeLower.includes('rice')) || (productTypeLower.includes('sizer') && productTypeLower.includes('broken'))) {
      // Handle both "Rejection Rice" (old) and "Sizer Broken" (new) -> maps to rejectionRice field
      fieldToUpdate = 'rejectionRice';
    } else if (productTypeLower.includes('broken') && !productTypeLower.includes('rejection') && !productTypeLower.includes('zero') && !productTypeLower.includes('sizer')) {
      fieldToUpdate = 'broken';
    } else if (productTypeLower.includes('rejection') && productTypeLower.includes('broken')) {
      fieldToUpdate = 'rejectionBroken';
    } else if (productTypeLower.includes('zero') && productTypeLower.includes('broken')) {
      fieldToUpdate = 'zeroBroken';
    } else if (productTypeLower.includes('faram')) {
      fieldToUpdate = 'faram';
    } else if (productTypeLower.includes('bran')) {
      fieldToUpdate = 'bran';
    } else if (productTypeLower.includes('unpolished')) {
      fieldToUpdate = 'unpolished';
    }

    console.log('📊 Field to update:', fieldToUpdate);
    console.log('📊 Quantity:', quantityQuintals);

    if (existingByProduct) {
      // Update existing by-product - ADD to the existing value
      const currentValue = parseFloat(existingByProduct[fieldToUpdate]) || 0;
      const newValue = currentValue + quantityQuintals;
      await existingByProduct.update({ [fieldToUpdate]: newValue });
    } else {
      // Create new by-product entry
      const byProductData = {
        outturnId: finalOutturnId,
        date: date,
        rice: 0,
        rejectionRice: 0,
        rjRice1: 0,
        rjRice2: 0,
        broken: 0,
        rejectionBroken: 0,
        zeroBroken: 0,
        faram: 0,
        bran: 0,
        unpolished: 0,
        createdBy: req.user.userId
      };
      byProductData[fieldToUpdate] = quantityQuintals;
      await ByProduct.create(byProductData);
    }

    // Automatically recalculate yield percentage for this outturn
    await YieldCalculationService.calculateAndUpdateYield(finalOutturnId);

    // Fetch with associations
    const createdProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ]
    });

    res.status(201).json({
      message: 'Rice production entry created successfully (by-product auto-recorded)',
      production: createdProduction
    });
  } catch (error) {
    console.error('Create rice production error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql || 'N/A'
    });

    // Write error to file for debugging
    const fs = require('fs');
    const errorLog = `
=== Rice Production Error ===
Time: ${new Date().toISOString()}
Message: ${error.message}
Name: ${error.name}
SQL: ${error.sql || 'N/A'}
Stack: ${error.stack}
========================
`;
    fs.appendFileSync('rice-production-errors.log', errorLog);

    res.status(500).json({
      error: 'Failed to create rice production entry',
      details: error.message
    });
  }
});

// Approve rice production (Manager/Admin only)
router.post('/:id/approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    if (production.status === 'approved') {
      return res.status(400).json({ error: 'This entry is already approved' });
    }

    await production.update({
      status: 'approved',
      approvedBy: req.user.userId,
      approvedAt: new Date()
    });

    const approvedProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ]
    });

    res.json({
      message: 'Rice production entry approved successfully',
      production: approvedProduction
    });
  } catch (error) {
    console.error('Approve rice production error:', error);
    res.status(500).json({ error: 'Failed to approve rice production entry' });
  }
});

// Update rice production
router.put('/:id', auth, async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    // Only creator or manager/admin can update
    if (production.createdBy !== req.user.userId &&
      req.user.role !== 'manager' &&
      req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this production entry' });
    }

    // Status check - Admins can bypass the 'approved' block
    if (production.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Approved production entries cannot be updated by non-admin users' });
    }

    const {
      outturnId,
      date,
      productType,
      bags,
      packagingId,
      movementType,
      locationCode,
      lorryNumber,
      billNumber
    } = req.body;

    // If outturnId is being changed, check if new outurn is cleared
    if (outturnId && outturnId !== production.outturnId) {
      const newOutturn = await Outturn.findByPk(outturnId);
      if (!newOutturn) {
        return res.status(400).json({ error: 'Outturn not found' });
      }

      if (newOutturn.isCleared) {
        return res.status(400).json({
          error: `Cannot update rice production to cleared outurn ${newOutturn.code}. This outurn was cleared on ${new Date(newOutturn.clearedAt).toLocaleDateString()}.`,
          isCleared: true,
          clearedAt: newOutturn.clearedAt
        });
      }
    }

    // Recalculate quintals and paddy bags if bags or packaging changed
    let quantityQuintals = production.quantityQuintals;
    let paddyBagsDeducted = production.paddyBagsDeducted;
    let finalBags = bags !== undefined ? parseFloat(bags) : production.bags;

    if (bags !== undefined || packagingId) {
      const packaging = await Packaging.findByPk(packagingId || production.packagingId);
      if (!packaging) {
        return res.status(400).json({ error: 'Invalid packaging selected' });
      }

      const kgPerBag = parseFloat(packaging.allottedKg);

      // Calculate quintals: (bags × kg_per_bag) / 100
      quantityQuintals = (finalBags * kgPerBag) / 100;

      // Calculate paddy bags deducted using new formula
      paddyBagsDeducted = calculatePaddyBagsDeducted(quantityQuintals, productType || production.productType);

      // Validate available paddy bags (excluding current production's deduction)
      const totalPaddyBags = await Arrival.sum('bags', {
        where: {
          outturnId: production.outturnId,
          movementType: { [Op.in]: ['production-shifting', 'purchase'] }
        }
      }) || 0;

      // Get total paddy bags already DEDUCTED (excluding current production)
      const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
        where: {
          outturnId: production.outturnId,
          status: { [Op.in]: ['pending', 'approved'] },
          id: { [Op.ne]: production.id } // Exclude current production
        }
      }) || 0;

      const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

      // FIX: Compare deducted bags, not user-entered bags
      if (paddyBagsDeducted > availablePaddyBags) {
        return res.status(400).json({
          error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${paddyBagsDeducted} bags (for ${finalBags} rice bags)`,
          availablePaddyBags,
          requiredPaddyBags: paddyBagsDeducted
        });
      }
    }

    await production.update({
      date: date || production.date,
      productType: productType || production.productType,
      quantityQuintals,
      packagingId: packagingId || production.packagingId,
      bags: finalBags,
      paddyBagsDeducted,
      movementType: movementType || production.movementType,
      locationCode: movementType === 'kunchinittu' ? locationCode : null,
      lorryNumber: movementType === 'loading' ? lorryNumber : null,
      billNumber: movementType === 'loading' ? billNumber : null
    });

    const updatedProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ]
    });

    res.json({
      message: 'Rice production entry updated successfully',
      production: updatedProduction
    });
  } catch (error) {
    console.error('Update rice production error:', error);
    res.status(500).json({ error: 'Failed to update rice production entry' });
  }
});

// Delete rice production
router.delete('/:id', auth, async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    // Only creator or manager/admin can delete
    if (production.createdBy !== req.user.userId &&
      req.user.role !== 'manager' &&
      req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    // Cannot delete approved entries
    if (production.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Only admins can delete approved entries' });
    }

    await production.destroy();

    res.json({ message: 'Rice production entry deleted successfully' });
  } catch (error) {
    console.error('Delete rice production error:', error);
    res.status(500).json({ error: 'Failed to delete rice production entry' });
  }
});

module.exports = router;
