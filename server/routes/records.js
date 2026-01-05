const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const Arrival = require('../models/Arrival');
const { Warehouse, Kunchinittu } = require('../models/Location');
const User = require('../models/User');
const Outturn = require('../models/Outturn');
const PurchaseRate = require('../models/PurchaseRate');

const router = express.Router();

// Get day-wise arrivals with month-wise pagination
router.get('/arrivals', auth, async (req, res) => {
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      status,
      movementType,
      outturnId,
      limit
    } = req.query;

    const where = {};

    // Filter by movement type if provided
    if (movementType) {
      where.movementType = movementType;
    }

    // Filter by outturn if provided
    if (outturnId) {
      where.outturnId = outturnId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    } else if (req.user.role === 'staff') {
      // Staff sees their own entries + approved entries
      where[Op.or] = [
        { createdBy: req.user.userId },
        { status: 'approved' }
      ];
    }

    // Date Range filtering takes priority over Month-wise filtering
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
    } else if (!outturnId) {
      // CLOUD FIX: If no date filter provided AND no outturnId, default to last 30 days to prevent timeout
      // When outturnId is specified, we want ALL records for that outturn regardless of date
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.date = {
        [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
      };
    }

    // Safety limit: Default to 2000 if no limit provided, max 5000
    const limitNum = limit ? Math.min(parseInt(limit), 5000) : 2000;

    const rows = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'averageRate'], required: false },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum
    });

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // Get available months for pagination
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE 1=1
        ${movementType ? `AND "movementType" = '${movementType}'` : ''}
        ${status ? `AND status = '${status}'` : ''}
      ORDER BY month DESC
    `);

    const availableMonths = monthsQuery[0];

    res.json({
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: availableMonths,
        totalRecords: rows.length,
        limit: limitNum,
        truncated: rows.length === limitNum
      }
    });
  } catch (error) {
    console.error('Get arrivals records error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    // Return error with details for debugging in cloud
    res.status(500).json({
      error: 'Failed to fetch arrivals',
      message: error.message,
      records: {},
      pagination: {
        currentMonth: null,
        availableMonths: [],
        totalRecords: 0
      }
    });
  }
});

// Get purchase records with month-wise pagination
router.get('/purchase', auth, async (req, res) => {
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      page,
      limit
    } = req.query;

    const where = {
      movementType: 'purchase',
      status: 'approved'
    };

    // Date Range filtering takes priority over Month-wise filtering
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

    // Pagination setup
    const queryOptions = {
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'], required: false },
        {
          model: PurchaseRate,
          as: 'purchaseRate',
          attributes: ['amountFormula', 'totalAmount', 'averageRate'],
          required: false
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    };

    // Enhanced pagination: Support up to 10,000 records per page
    const pageNum = parseInt(page) || 1;
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    queryOptions.limit = limitNum;
    queryOptions.offset = offset;

    const rows = await Arrival.findAll(queryOptions);

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // Get available months for pagination
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE "movementType" = 'purchase' AND status = 'approved'
      ORDER BY month DESC
    `);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: monthsQuery[0],
        totalRecords: totalCount,
        recordsReturned: rows.length,
        limit: limitNum,
        page: pageNum,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        truncated: false
      }
    });
  } catch (error) {
    console.error('Get purchase records error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase records' });
  }
});

// Get shifting records with month-wise pagination
router.get('/shifting', auth, async (req, res) => {
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      page,
      limit
    } = req.query;

    const where = {
      movementType: { [Op.in]: ['shifting', 'production-shifting', 'for-production'] },
      status: 'approved'
    };

    // Date Range filtering takes priority over Month-wise filtering
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

    // Pagination setup
    const queryOptions = {
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    };

    // Enhanced pagination: Support up to 10,000 records per page
    const pageNum = parseInt(page) || 1;
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    queryOptions.limit = limitNum;
    queryOptions.offset = offset;

    const rows = await Arrival.findAll(queryOptions);

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // Get available months for pagination
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE "movementType" IN ('shifting', 'production-shifting', 'for-production') AND status = 'approved'
      ORDER BY month DESC
    `);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: monthsQuery[0],
        totalRecords: totalCount,
        recordsReturned: rows.length,
        limit: limitNum,
        page: pageNum,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        truncated: false
      }
    });
  } catch (error) {
    console.error('Get shifting records error:', error);
    res.status(500).json({ error: 'Failed to fetch shifting records' });
  }
});

// Get paddy stock - OPTIMIZED with month-wise pagination
router.get('/stock', auth, async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      limit
    } = req.query;

    const where = {
      status: 'approved',
      adminApprovedBy: { [Op.not]: null }, // Only admin-approved records
      movementType: { [Op.ne]: 'loose' } // Exclude loose (loss) entries from stock
    };

    // Date Range filtering takes priority over Month-wise filtering
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
    // If no date filters provided, show all data (no default filter)

    // OPTIMIZATION: Only select needed attributes
    // Enhanced pagination: Support up to 10,000 records per page for large datasets
    // Default to 250 for performance, but allow up to 10,000 for comprehensive views
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;

    // Add pagination support with offset
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    const rows = await Arrival.findAll({
      where,
      attributes: [
        'id', 'date', 'bags', 'netWeight', 'variety', 'movementType',
        'wbNo', 'lorryNumber', 'broker', 'fromLocation', 'outturnId', 'createdAt'
      ],
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: User, as: 'approver', attributes: ['username'] },
        { model: User, as: 'adminApprover', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'isCleared', 'clearedAt'], required: false },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset
    });

    // Filter out arrivals with cleared outturns ONLY for dates AFTER the clearing date
    const filteredRows = rows.filter(arrival => {
      // If arrival has an outturn and it's cleared
      if (arrival.outturn && arrival.outturn.isCleared && arrival.outturn.clearedAt) {
        // Get the clearing date (just the date part, not time)
        const clearedDate = new Date(arrival.outturn.clearedAt).toISOString().split('T')[0];
        const arrivalDate = arrival.date;

        // Only exclude if arrival date is AFTER the clearing date
        // Keep arrivals from before and on the clearing date
        if (arrivalDate > clearedDate) {
          return false; // Exclude from stock
        }
      }
      return true; // Keep in stock
    });

    // Group by date
    const groupedByDate = filteredRows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // Get available months for pagination
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE status = 'approved' 
        AND "adminApprovedBy" IS NOT NULL 
        AND "movementType" != 'loose'
      ORDER BY month DESC
    `);

    const responseTime = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: monthsQuery[0],
        totalRecords: totalCount,
        recordsReturned: filteredRows.length,
        limit: limitNum,
        page: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        truncated: false // No longer truncating, using proper pagination
      },
      performance: {
        responseTime: `${responseTime}ms`,
        recordsReturned: filteredRows.length
      }
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Update arrival (Manager/Admin only)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const arrival = await Arrival.findByPk(req.params.id);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    await arrival.update(req.body);

    const updatedArrival = await Arrival.findByPk(arrival.id, {
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] }
      ]
    });

    res.json({
      message: 'Arrival updated successfully',
      arrival: updatedArrival
    });
  } catch (error) {
    console.error('Update arrival error:', error);
    res.status(500).json({ error: 'Failed to update arrival' });
  }
});

// Delete arrival (Manager/Admin only)
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const arrival = await Arrival.findByPk(req.params.id);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    await arrival.destroy();

    res.json({ message: 'Arrival deleted successfully' });
  } catch (error) {
    console.error('Delete arrival error:', error);
    res.status(500).json({ error: 'Failed to delete arrival' });
  }
});

module.exports = router;
