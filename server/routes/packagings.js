const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Packaging = require('../models/Packaging');

const router = express.Router();

// Get all packagings (All authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const packagings = await Packaging.findAll({
      where: { isActive: true },
      attributes: ['id', 'brandName', 'code', 'allottedKg'], // Only essential fields
      order: [['brandName', 'ASC']],
      raw: true // Faster
    });

    // Cache headers for 10 minutes
    res.set('Cache-Control', 'public, max-age=600');
    res.json({ packagings });
  } catch (error) {
    console.error('Get packagings error:', error);
    res.status(500).json({ error: 'Failed to fetch packagings' });
  }
});

// Create packaging (Manager/Admin only)
router.post('/', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { brandName, code, allottedKg } = req.body;

    if (!brandName || !code || !allottedKg) {
      return res.status(400).json({ error: 'Brand name, code, and allotted kg are required' });
    }

    // Check for duplicate
    const existing = await Packaging.findOne({
      where: { code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Packaging code already exists' });
    }

    const packaging = await Packaging.create({
      brandName,
      code,
      allottedKg
    });

    res.status(201).json({
      message: 'Packaging created successfully',
      packaging
    });
  } catch (error) {
    console.error('Create packaging error:', error);
    res.status(500).json({ error: 'Failed to create packaging' });
  }
});

// Update packaging (Manager/Admin only)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const packaging = await Packaging.findByPk(req.params.id);
    if (!packaging) {
      return res.status(404).json({ error: 'Packaging not found' });
    }

    const { brandName, code, allottedKg } = req.body;
    const oldAllottedKg = packaging.allottedKg;

    // Check for duplicate code (excluding current packaging)
    if (code && code !== packaging.code) {
      const existing = await Packaging.findOne({
        where: { code, id: { [require('sequelize').Op.ne]: req.params.id } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Packaging code already exists' });
      }
    }

    await packaging.update({ brandName, code, allottedKg });

    // If allottedKg changed, recalculate all rice production records using this packaging
    if (allottedKg && parseFloat(allottedKg) !== parseFloat(oldAllottedKg)) {
      const RiceProduction = require('../models/RiceProduction');
      const { sequelize } = require('../config/database');
      
      // Update all rice production records with this packaging
      // quantityQuintals = (bags × allottedKg) / 100
      await sequelize.query(`
        UPDATE rice_productions
        SET "quantityQuintals" = (bags * :allottedKg) / 100.0,
            "updatedAt" = NOW()
        WHERE "packagingId" = :packagingId
      `, {
        replacements: {
          allottedKg: parseFloat(allottedKg),
          packagingId: req.params.id
        }
      });

      console.log(`✅ Recalculated quantities for all rice productions using packaging ID ${req.params.id}`);
    }

    res.json({
      message: 'Packaging updated successfully and related records recalculated',
      packaging
    });
  } catch (error) {
    console.error('Update packaging error:', error);
    res.status(500).json({ error: 'Failed to update packaging' });
  }
});

// Delete packaging (Manager/Admin only)
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const packaging = await Packaging.findByPk(req.params.id);
    if (!packaging) {
      return res.status(404).json({ error: 'Packaging not found' });
    }

    // Soft delete
    await packaging.update({ isActive: false });

    res.json({ message: 'Packaging deleted successfully' });
  } catch (error) {
    console.error('Delete packaging error:', error);
    res.status(500).json({ error: 'Failed to delete packaging' });
  }
});

module.exports = router;
