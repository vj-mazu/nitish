/**
 * Professional PDF Generator for Records Section
 * Uses jsPDF with autoTable for perfect A4 portrait layout
 * Font sizes: 10pt content, 13pt headings
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A4 dimensions in mm (portrait)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Font sizes
const HEADING_SIZE = 13;
const SUBHEADING_SIZE = 11;
const CONTENT_SIZE = 10;
const SMALL_SIZE = 8;

// Colors - typed as RGB tuples
const HEADER_BG: [number, number, number] = [68, 114, 196]; // #4472C4
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALTERNATE_ROW: [number, number, number] = [248, 249, 250];
const GREEN_BG: [number, number, number] = [209, 250, 229]; // #d1fae5
const RED_BG: [number, number, number] = [254, 226, 226];   // #fee2e2
const YELLOW_BG: [number, number, number] = [254, 243, 199]; // #fef3c7
const PURPLE_BG: [number, number, number] = [226, 212, 237]; // Shifting row

interface PDFOptions {
    title: string;
    subtitle?: string;
    dateRange?: string;
    filterType?: 'all' | 'day' | 'week' | 'month';
}

interface ColumnDef {
    header: string;
    dataKey: string;
    width?: number;
}

/**
 * Generate PDF for All Arrivals tab
 */
export const generateArrivalsPDF = (
    records: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape', // Changed to landscape to fit all columns
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, options);

    // All columns matching frontend table exactly
    const columns: ColumnDef[] = [
        { header: 'Sl No', dataKey: 'slNo', width: 14 },
        { header: 'Date', dataKey: 'date', width: 18 },
        { header: 'Type', dataKey: 'movementType', width: 18 },
        { header: 'Broker', dataKey: 'broker', width: 16 },
        { header: 'From', dataKey: 'from', width: 20 },
        { header: 'To KN', dataKey: 'toKn', width: 18 },
        { header: 'To WH', dataKey: 'toWh', width: 18 },
        { header: 'Outturn', dataKey: 'outturn', width: 14 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10 },
        { header: 'Moist', dataKey: 'moisture', width: 12 },
        { header: 'Cut', dataKey: 'cutting', width: 10 },
        { header: 'WB No', dataKey: 'wbNo', width: 14 },
        { header: 'Gross', dataKey: 'grossWeight', width: 16 },
        { header: 'Tare', dataKey: 'tareWeight', width: 14 },
        { header: 'Net Wt', dataKey: 'netWeight', width: 16 },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 18 },
        { header: 'Status', dataKey: 'status', width: 16 }
    ];

    const tableData = records.map(record => ({
        slNo: record.slNo || '-',
        date: formatDate(record.date),
        movementType: formatMovementType(record.movementType),
        broker: record.broker || '-',
        from: getFromLocation(record),
        toKn: record.toKunchinittu?.code || '-',
        toWh: record.toWarehouse?.code || record.toWarehouseShift?.code || '-',
        outturn: record.outturn?.code || '-',
        variety: record.variety || '-',
        bags: record.bags || 0,
        moisture: record.moisture ? `${record.moisture}%` : '-',
        cutting: record.cutting || '-',
        wbNo: record.wbNo || '-',
        grossWeight: formatNumber(record.grossWeight),
        tareWeight: formatNumber(record.tareWeight),
        netWeight: formatNumber(record.netWeight),
        lorryNumber: record.lorryNumber || '-',
        status: record.status || '-'
    }));

    generateTable(doc, columns, tableData, 40, records);

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ]);

    addFooter(doc, options);

    const filename = `Arrivals_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for Purchase tab
 */
export const generatePurchasePDF = (
    records: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape', // Changed to landscape to fit all columns
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Purchase Records' });

    // All columns matching frontend Purchase table including Amount columns
    const columns: ColumnDef[] = [
        { header: 'Date', dataKey: 'date', width: 16 },
        { header: 'Type', dataKey: 'type', width: 18 },
        { header: 'Broker', dataKey: 'broker', width: 16 },
        { header: 'From', dataKey: 'from', width: 18 },
        { header: 'To', dataKey: 'to', width: 20 },
        { header: 'Variety', dataKey: 'variety', width: 18 },
        { header: 'Bags', dataKey: 'bags', width: 10 },
        { header: 'Moist', dataKey: 'moisture', width: 10 },
        { header: 'Cut', dataKey: 'cutting', width: 10 },
        { header: 'WB No', dataKey: 'wbNo', width: 12 },
        { header: 'Gross', dataKey: 'grossWeight', width: 14 },
        { header: 'Tare', dataKey: 'tareWeight', width: 12 },
        { header: 'Net Wt', dataKey: 'netWeight', width: 14 },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 16 },
        { header: 'Amount', dataKey: 'amountFormula', width: 18 },
        { header: 'Total Amt', dataKey: 'totalAmount', width: 18 },
        { header: 'Avg Rate', dataKey: 'avgRate', width: 16 }
    ];

    const tableData = records.map(record => {
        // Extract rate data from multiple possible locations
        const purchaseRate = record.purchaseRate || {};
        const totalAmount = purchaseRate.totalAmount || record.totalAmount || 0;
        const avgRate = purchaseRate.averageRate || record.averageRate || 0;
        const amountFormula = purchaseRate.amountFormula || record.amountFormula || '';

        // Get destination - check for outturn first (For Production purchases)
        const destination = record.outturnId
            ? `→ Production (${record.outturn?.code || `OUT${record.outturnId}`})`
            : `${record.toKunchinittu?.code || record.toKunchinittu?.name || '-'} - ${record.toWarehouse?.code || record.toWarehouse?.name || '-'}`;

        return {
            date: formatDate(record.date),
            type: 'Purchase',
            broker: record.broker || '-',
            from: record.fromLocation || '-',
            to: destination,
            variety: record.variety || '-',
            bags: record.bags || 0,
            moisture: record.moisture ? `${record.moisture}%` : '-',
            cutting: record.cutting || '-',
            wbNo: record.wbNo || '-',
            grossWeight: formatNumber(record.grossWeight),
            tareWeight: formatNumber(record.tareWeight),
            netWeight: formatNumber(record.netWeight),
            lorryNumber: record.lorryNumber || '-',
            // Compact horizontal formula - no line breaks
            amountFormula: amountFormula
                ? amountFormula
                    .replace(/\n/g, ',')    // Replace newlines with comma
                    .replace(/\\n/g, ',')   // Handle escaped newlines
                    .replace(/\s+/g, '')    // Remove all spaces for compact display
                    .replace(/,+/g, ',')    // Remove duplicate commas
                    .trim()
                : '-',
            totalAmount: totalAmount > 0 ? `₹${Number(totalAmount).toFixed(2)}` : '-',
            avgRate: avgRate > 0 ? `₹${Number(avgRate).toFixed(2)}` : '-'
        };
    });

    generateTable(doc, columns, tableData, 40, records);

    // Add totals row with actual data
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);
    const totalAmount = records.reduce((sum, r) => {
        const rate = r.purchaseRate || {};
        return sum + (parseFloat(rate.totalAmount || r.totalAmount) || 0);
    }, 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` },
        { label: 'Total Amount', value: `₹${formatNumber(totalAmount)}` }
    ]);

    addFooter(doc, options);

    const filename = `Purchase_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for Shifting tab
 */
export const generateShiftingPDF = (
    records: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape', // Changed to landscape to fit all columns
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Shifting Records' });

    // All columns matching frontend Shifting table
    const columns: ColumnDef[] = [
        { header: 'Date', dataKey: 'date', width: 18 },
        { header: 'Type', dataKey: 'type', width: 22 },
        { header: 'From KN', dataKey: 'fromKn', width: 20 },
        { header: 'From WH', dataKey: 'fromWh', width: 20 },
        { header: 'To KN', dataKey: 'toKn', width: 22 },
        { header: 'To WH', dataKey: 'toWh', width: 20 },
        { header: 'Variety', dataKey: 'variety', width: 22 },
        { header: 'Bags', dataKey: 'bags', width: 12 },
        { header: 'Moist', dataKey: 'moisture', width: 12 },
        { header: 'Cut', dataKey: 'cutting', width: 12 },
        { header: 'WB No', dataKey: 'wbNo', width: 14 },
        { header: 'Gross', dataKey: 'grossWeight', width: 16 },
        { header: 'Tare', dataKey: 'tareWeight', width: 14 },
        { header: 'Net Wt', dataKey: 'netWeight', width: 16 },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 18 }
    ];

    const tableData = records.map(record => ({
        date: formatDate(record.date),
        type: record.movementType === 'production-shifting' ? 'Production-Shifting' :
            record.movementType === 'for-production' ? 'For-Production' : 'Shifting',
        fromKn: record.fromKunchinittu?.code || record.fromKunchinittu?.name || '-',
        fromWh: record.fromWarehouse?.name || record.fromWarehouse?.code || '-',
        toKn: record.movementType === 'production-shifting'
            ? `Production (${record.outturn?.code || '-'})`
            : (record.toKunchinittu?.name || record.toKunchinittu?.code || '-'),
        toWh: record.movementType === 'production-shifting'
            ? (record.toWarehouse?.name || '-')
            : (record.toWarehouseShift?.name || '-'),
        variety: record.variety || '-',
        bags: record.bags || 0,
        moisture: record.moisture ? `${record.moisture}%` : '-',
        cutting: record.cutting || '-',
        wbNo: record.wbNo || '-',
        grossWeight: formatNumber(record.grossWeight),
        tareWeight: formatNumber(record.tareWeight),
        netWeight: formatNumber(record.netWeight),
        lorryNumber: record.lorryNumber || '-'
    }));

    generateTable(doc, columns, tableData, 40, records);

    // Add totals
    const totalBags = records.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.netWeight) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: records.length.toString() },
        { label: 'Total Bags', value: totalBags.toString() },
        { label: 'Total Weight', value: `${formatNumber(totalWeight)} kg` }
    ]);

    addFooter(doc, options);

    const filename = `Shifting_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for Paddy Stock tab
 * Removed emojis to fix encoding issues
 */
export const generatePaddyStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape', // Landscape to fit all columns
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Paddy Stock Report' });

    // Group by date
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    let yPos = 40;

    dates.forEach(date => {
        const dayRecords = groupedByDate[date];

        if (yPos > PAGE_HEIGHT - 60) {
            doc.addPage();
            yPos = MARGIN + 10;
        }

        // Date header
        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(68, 114, 196);
        doc.text(`Date: ${date}`, MARGIN, yPos);
        yPos += 8;

        // 1. Kunchinittu-wise Summary for this day
        const kunchinintuStock: { [key: string]: { bags: number; variety: string; kunchinittu: string; warehouse: string } } = {};
        dayRecords.forEach((item: any) => {
            const kn = item.toKunchinittu?.code || item.fromKunchinittu?.code || '-';
            const wh = item.toWarehouse?.code || item.fromWarehouse?.code || item.toWarehouseShift?.code || '-';
            const variety = item.variety || '-';
            const key = `${variety}-${kn}`;

            if (!kunchinintuStock[key]) {
                kunchinintuStock[key] = { bags: 0, variety, kunchinittu: kn, warehouse: wh };
            }
            // Logic for accumulation depends on movement type
            if (item.movementType === 'purchase' || item.movementType === 'shifting' && item.toKunchinittu) {
                kunchinintuStock[key].bags += (item.bags || 0);
            }
        });

        const summaryData = Object.values(kunchinintuStock).filter(i => i.bags !== 0);

        if (summaryData.length > 0) {
            doc.setFontSize(CONTENT_SIZE);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Kunchinittu-wise Stock', MARGIN + 2, yPos);
            yPos += 5;

            const columns: ColumnDef[] = [
                { header: 'Variety', dataKey: 'variety', width: 40 },
                { header: 'Kunchinittu', dataKey: 'kunchinittu', width: 40 },
                { header: 'Warehouse', dataKey: 'warehouse', width: 40 },
                { header: 'Bags', dataKey: 'bags', width: 20 }
            ];

            autoTable(doc, {
                startY: yPos,
                head: [columns.map(c => c.header)],
                body: summaryData.map((row: any) => columns.map(c => row[c.dataKey])),
                theme: 'grid',
                styles: { fontSize: SMALL_SIZE, cellPadding: 2 },
                headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
                margin: { left: MARGIN, right: MARGIN }
            });
            yPos = (doc as any).lastAutoTable.finalY + 8;
        }

        // 2. Full Transaction Table for the day
        doc.setFontSize(CONTENT_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Daily Transactions', MARGIN + 2, yPos);
        yPos += 5;

        const detailColumns: ColumnDef[] = [
            { header: 'Type', dataKey: 'type', width: 22 },
            { header: 'Broker', dataKey: 'broker', width: 22 },
            { header: 'From', dataKey: 'from', width: 25 },
            { header: 'To KN', dataKey: 'toKn', width: 18 },
            { header: 'To WH', dataKey: 'toWh', width: 18 },
            { header: 'Variety', dataKey: 'variety', width: 25 },
            { header: 'Bags', dataKey: 'bags', width: 12 },
            { header: 'Net Weight', dataKey: 'netWeight', width: 18 },
            { header: 'Lorry No', dataKey: 'lorryNumber', width: 22 },
            { header: 'Status', dataKey: 'status', width: 16 }
        ];

        const detailData = dayRecords.map(r => ({
            type: formatMovementType(r.movementType),
            broker: r.broker || '-',
            from: getFromLocation(r),
            toKn: r.toKunchinittu?.code || '-',
            toWh: r.toWarehouse?.code || r.toWarehouseShift?.code || '-',
            variety: r.variety || '-',
            bags: r.bags || 0,
            netWeight: formatNumber(r.netWeight),
            lorryNumber: r.lorryNumber || '-',
            status: (r.status || 'PENDING').toUpperCase()
        }));

        autoTable(doc, {
            startY: yPos,
            head: [detailColumns.map(c => c.header)],
            body: detailData.map((row: any) => detailColumns.map(c => row[c.dataKey])),
            theme: 'grid',
            styles: { fontSize: SMALL_SIZE, cellPadding: 2 },
            headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT },
            margin: { left: MARGIN, right: MARGIN },
            didDrawCell: (data) => {
                const record = dayRecords[data.row.index];
                if (record && data.section === 'body') {
                    if (record.movementType === 'purchase') data.cell.styles.fillColor = GREEN_BG;
                    else if (record.movementType === 'shifting' || record.movementType === 'production-shifting') data.cell.styles.fillColor = PURPLE_BG;
                }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;
    });

    addFooter(doc, options);

    const filename = `PaddyStock_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for Rice Stock tab
 * Removed emojis to fix encoding issues
 */
export const generateRiceStockPDF = (
    stockData: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape', // Landscape to fit all columns
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Rice Stock Report' });

    // Group by date
    const groupedByDate: { [date: string]: any[] } = {};
    stockData.forEach(item => {
        const date = item.date ? formatDate(item.date) : 'Unknown';
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(item);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => {
        // Sort by date string (DD/MM/YYYY) - latest first
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    let yPos = 40;

    dates.forEach(date => {
        const dayMovements = groupedByDate[date];

        // Ensure page break
        if (yPos > PAGE_HEIGHT - 60) {
            doc.addPage();
            yPos = MARGIN + 10;
        }

        // Date header
        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(68, 114, 196);
        doc.text(`Date: ${date}`, MARGIN, yPos);
        yPos += 8;

        // Group by product type
        const groupedByProduct: { [product: string]: any[] } = {};
        dayMovements.forEach(m => {
            const product = m.productType || m.product_type || m.product || 'Other';
            if (!groupedByProduct[product]) groupedByProduct[product] = [];
            groupedByProduct[product].push(m);
        });

        Object.entries(groupedByProduct).forEach(([product, movements]) => {
            if (yPos > PAGE_HEIGHT - 40) {
                doc.addPage();
                yPos = MARGIN + 10;
            }

            // Product Header
            doc.setFontSize(CONTENT_SIZE);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`${product}`, MARGIN + 2, yPos);
            yPos += 5;

            const columns: ColumnDef[] = [
                { header: 'Type', dataKey: 'type', width: 22 },
                { header: 'Variety', dataKey: 'variety', width: 28 },
                { header: 'Packaging', dataKey: 'packaging', width: 35 },
                { header: 'Bags', dataKey: 'bags', width: 14 },
                { header: 'QTL', dataKey: 'qtls', width: 18 },
                { header: 'From', dataKey: 'from', width: 25 },
                { header: 'To', dataKey: 'to', width: 25 },
                { header: 'Bill No', dataKey: 'billNumber', width: 22 },
                { header: 'Lorry No', dataKey: 'lorryNumber', width: 25 },
                { header: 'Status', dataKey: 'status', width: 16 }
            ];

            const tableData = movements.map(m => {
                const mvmtType = (m.movementType || m.movement_type || '').toLowerCase();
                let packagingDisplay = m.packaging?.brandName || m.packaging_brand || 'A1';

                if (mvmtType === 'palti') {
                    const sourcePkg = m.sourcePackaging?.brandName || m.source_packaging_brand || 'A1';
                    const targetPkg = m.targetPackaging?.brandName || m.target_packaging_brand || 'A1';
                    packagingDisplay = `${sourcePkg} -> ${targetPkg}`;
                }

                return {
                    type: formatMovementType(mvmtType),
                    variety: m.variety || 'Sum25 RNR Raw',
                    packaging: packagingDisplay,
                    bags: m.bags || 0,
                    qtls: formatNumber(m.quantityQuintals || m.quantity_quintals || m.qtls || 0),
                    from: m.from || m.outturn?.code || '-',
                    to: m.to || m.locationCode || m.location_code || '-',
                    billNumber: m.billNumber || m.bill_number || '-',
                    lorryNumber: m.lorryNumber || m.lorry_number || '-',
                    status: (m.status || 'PENDING').toUpperCase()
                };
            });

            autoTable(doc, {
                startY: yPos,
                head: [columns.map(c => c.header)],
                body: tableData.map((row: any) => columns.map(c => row[c.dataKey])),
                theme: 'grid',
                styles: { fontSize: SMALL_SIZE, cellPadding: 2 },
                headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT },
                margin: { left: MARGIN, right: MARGIN },
                didDrawCell: (data) => {
                    const record = movements[data.row.index];
                    if (record && data.section === 'body') {
                        const type = (record.movementType || record.movement_type || '').toLowerCase();
                        if (type === 'purchase') data.cell.styles.fillColor = GREEN_BG;
                        else if (type === 'sale') data.cell.styles.fillColor = RED_BG;
                        else if (type === 'palti') data.cell.styles.fillColor = YELLOW_BG;
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 8;
        });

        yPos += 5;
    });

    addFooter(doc, options);

    const filename = `RiceStock_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for Rice Stock Movement report
 * Matches frontend Rice Stock Movement table
 */
export const generateRiceMovementsPDF = (
    movements: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    addHeader(doc, { ...options, title: options.title || 'Rice Stock Movement Report' });

    const columns: ColumnDef[] = [
        { header: 'Sl No', dataKey: 'slNo', width: 10 },
        { header: 'Date', dataKey: 'date', width: 18 },
        { header: 'Mvmt Type', dataKey: 'mvmtType', width: 18 },
        { header: 'Bill No', dataKey: 'billNumber', width: 18 },
        { header: 'Variety', dataKey: 'variety', width: 22 },
        { header: 'Product Type', dataKey: 'productType', width: 20 },
        { header: 'Bags', dataKey: 'bags', width: 10 },
        { header: 'Bag Size', dataKey: 'bagSize', width: 12 },
        { header: 'QTL', dataKey: 'qtls', width: 12 },
        { header: 'Packaging', dataKey: 'packaging', width: 22 },
        { header: 'From', dataKey: 'from', width: 20 },
        { header: 'To', dataKey: 'to', width: 20 },
        { header: 'Lorry No', dataKey: 'lorryNumber', width: 18 },
        { header: 'Status', dataKey: 'status', width: 14 },
        { header: 'Creator', dataKey: 'creator', width: 15 }
    ];

    const tableData = movements.map((item, index) => {
        const mvmtType = item.movementType || item.movement_type || 'production';
        let packagingDisplay = item.packaging_brand || item.packaging?.brandName || 'A1';

        if (mvmtType === 'palti') {
            const sourcePkg = item.source_packaging_brand || item.sourcePackaging?.brandName || 'A1';
            const targetPkg = item.target_packaging_brand || item.targetPackaging?.brandName || 'A1';
            packagingDisplay = `${sourcePkg} -> ${targetPkg}`;
        }

        return {
            slNo: index + 1,
            date: formatDate(item.date),
            mvmtType: mvmtType === 'production' ? 'Production' :
                mvmtType === 'purchase' ? 'Purchase' :
                    mvmtType === 'sale' ? 'Sale' :
                        mvmtType === 'palti' ? 'Palti' : mvmtType,
            billNumber: item.billNumber || item.bill_number || '-',
            variety: item.variety || 'Sum25 RNR Raw',
            productType: item.product_type || item.productType || item.product || 'Rice',
            bags: item.bags || 0,
            bagSize: item.bagSizeKg || item.bag_size_kg || item.packaging?.allottedKg || 26,
            qtls: formatNumber(item.quantityQuintals || item.quantity_quintals || item.qtls || 0),
            packaging: packagingDisplay,
            from: item.from || item.outturn?.code || '-',
            to: item.to || item.locationCode || item.location_code || '-',
            lorryNumber: item.lorryNumber || item.lorry_number || '-',
            status: (item.status || 'PENDING').toUpperCase(),
            creator: item.creator?.username || '-'
        };
    });

    generateTable(doc, columns, tableData, 40, movements);

    const totalBags = movements.reduce((sum, m) => sum + (m.bags || 0), 0);
    const totalQtls = movements.reduce((sum, m) => sum + (parseFloat(m.quantityQuintals || m.quantity_quintals || m.qtls || 0) || 0), 0);

    addSummary(doc, [
        { label: 'Total Records', value: movements.length.toString() },
        { label: 'Total Bags', value: totalBags.toString() },
        { label: 'Total Quintals', value: formatNumber(totalQtls) }
    ]);

    addFooter(doc, options);

    const filename = `RiceMovements_${options.filterType || 'all'}_${formatFilename()}.pdf`;
    doc.save(filename);
};


/**
 * Generate PDF for Outturn Report tab
 */
export const generateOutturnReportPDF = (
    outturnData: any,
    productionRecords: any[],
    byProducts: any[],
    options: PDFOptions
): void => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const title = `Outturn Report - ${outturnData?.code || 'N/A'}`;
    addHeader(doc, { ...options, title });

    let yPos = 40;

    // Outturn Info
    doc.setFontSize(SUBHEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.text('Outturn Details', MARGIN, yPos);
    yPos += 7;

    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.text(`Code: ${outturnData?.code || '-'}`, MARGIN, yPos);
    doc.text(`Variety: ${outturnData?.allottedVariety || '-'}`, MARGIN + 60, yPos);
    yPos += 5;
    doc.text(`Paddy Date: ${formatDate(outturnData?.paddyDate)}`, MARGIN, yPos);
    doc.text(`Status: ${outturnData?.isCleared ? 'Cleared' : 'Active'}`, MARGIN + 60, yPos);
    yPos += 10;

    // Production Records
    if (productionRecords.length > 0) {
        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.text('Production Records', MARGIN, yPos);
        yPos += 7;

        const prodColumns: ColumnDef[] = [
            { header: 'Date', dataKey: 'date', width: 20 },
            { header: 'Type', dataKey: 'type', width: 25 },
            { header: 'Variety', dataKey: 'variety', width: 30 },
            { header: 'Bags', dataKey: 'bags', width: 15 },
            { header: 'Net Weight', dataKey: 'netWeight', width: 25 },
            { header: 'Lorry', dataKey: 'lorry', width: 25 }
        ];

        const prodData = productionRecords.map(r => ({
            date: formatDate(r.date),
            type: formatMovementType(r.movementType),
            variety: r.variety || '-',
            bags: r.bags || 0,
            netWeight: formatNumber(r.netWeight),
            lorry: r.lorryNumber || '-'
        }));

        autoTable(doc, {
            startY: yPos,
            head: [prodColumns.map(c => c.header)],
            body: prodData.map((row: any) => prodColumns.map(c => row[c.dataKey])),
            theme: 'grid',
            styles: { fontSize: CONTENT_SIZE, cellPadding: 2 },
            headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: ALTERNATE_ROW },
            margin: { left: MARGIN, right: MARGIN }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // By-Products
    if (byProducts.length > 0) {
        if (yPos > PAGE_HEIGHT - 60) {
            doc.addPage();
            yPos = MARGIN;
        }

        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'bold');
        doc.text('By-Products', MARGIN, yPos);
        yPos += 7;

        const bpColumns: ColumnDef[] = [
            { header: 'Date', dataKey: 'date', width: 20 },
            { header: 'Rice', dataKey: 'rice', width: 18 },
            { header: 'RJ Rice', dataKey: 'rjRice', width: 18 },
            { header: 'Broken', dataKey: 'broken', width: 18 },
            { header: 'RJ Broken', dataKey: 'rjBroken', width: 18 },
            { header: 'Faram', dataKey: 'faram', width: 18 },
            { header: 'Bran', dataKey: 'bran', width: 18 }
        ];

        const bpData = byProducts.map(bp => ({
            date: formatDate(bp.date),
            rice: formatNumber(bp.rice),
            rjRice: formatNumber(bp.rejectionRice),
            broken: formatNumber(bp.broken),
            rjBroken: formatNumber(bp.rejectionBroken),
            faram: formatNumber(bp.faram),
            bran: formatNumber(bp.bran)
        }));

        autoTable(doc, {
            startY: yPos,
            head: [bpColumns.map(c => c.header)],
            body: bpData.map((row: any) => bpColumns.map(c => row[c.dataKey])),
            theme: 'grid',
            styles: { fontSize: CONTENT_SIZE, cellPadding: 2 },
            headStyles: { fillColor: [112, 173, 71] as [number, number, number], textColor: HEADER_TEXT, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: ALTERNATE_ROW },
            margin: { left: MARGIN, right: MARGIN }
        });
    }

    addFooter(doc, options);

    const filename = `OutturnReport_${outturnData?.code || 'report'}_${formatFilename()}.pdf`;
    doc.save(filename);
};

// ============ HELPER FUNCTIONS ============

function addHeader(doc: jsPDF, options: PDFOptions): void {
    // Company/Report title
    doc.setFontSize(HEADING_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);
    doc.text(options.title, PAGE_WIDTH / 2, 15, { align: 'center' });

    // Subtitle (date range)
    if (options.subtitle || options.dateRange) {
        doc.setFontSize(SUBHEADING_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(options.subtitle || options.dateRange || '', PAGE_WIDTH / 2, 22, { align: 'center' });
    }

    // Generated timestamp
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(150, 150, 150);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleString('en-GB')}`, PAGE_WIDTH / 2, 28, { align: 'center' });

    // Divider line
    doc.setDrawColor(68, 114, 196);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 32, PAGE_WIDTH - MARGIN, 32);
}

function addFooter(doc: jsPDF, options: PDFOptions): void {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);

        // Page number
        doc.setFontSize(SMALL_SIZE);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            PAGE_WIDTH / 2,
            PAGE_HEIGHT - 10,
            { align: 'center' }
        );

        // Filter type badge
        if (options.filterType && options.filterType !== 'all') {
            doc.setFontSize(SMALL_SIZE);
            doc.text(
                `Filter: ${options.filterType.toUpperCase()}`,
                PAGE_WIDTH - MARGIN,
                PAGE_HEIGHT - 10,
                { align: 'right' }
            );
        }
    }
}

function addSummary(doc: jsPDF, items: { label: string; value: string }[]): void {
    const yPos = (doc as any).lastAutoTable?.finalY + 10 || PAGE_HEIGHT - 50;

    doc.setFontSize(CONTENT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(68, 114, 196);

    let xPos = MARGIN;
    items.forEach((item, index) => {
        doc.text(`${item.label}: ${item.value}`, xPos, yPos);
        xPos += 50;
    });
}

function generateTable(
    doc: jsPDF,
    columns: ColumnDef[],
    data: any[],
    startY: number,
    originalRecords?: any[]
): void {
    autoTable(doc, {
        startY,
        head: [columns.map(c => c.header)],
        body: data.map((row, index) => {
            return columns.map(c => row[c.dataKey]);
        }),
        theme: 'grid',
        styles: {
            fontSize: CONTENT_SIZE,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap'
        },
        headStyles: {
            fillColor: HEADER_BG,
            textColor: HEADER_TEXT,
            fontStyle: 'bold',
            fontSize: CONTENT_SIZE
        },
        alternateRowStyles: {
            fillColor: ALTERNATE_ROW
        },
        columnStyles: columns.reduce((acc, col, index) => {
            if (col.width) {
                acc[index] = { cellWidth: col.width };
            }
            return acc;
        }, {} as any),
        margin: { left: MARGIN, right: MARGIN },
        didDrawCell: (data: any) => {
            // Color code rows based on movement type if original records provided
            if (originalRecords && data.section === 'body') {
                const record = originalRecords[data.row.index];
                if (record) {
                    if (record.movementType === 'purchase' || record.movement_type === 'purchase') {
                        data.cell.styles.fillColor = GREEN_BG;
                    } else if (record.movementType === 'sale' || record.movement_type === 'sale') {
                        data.cell.styles.fillColor = RED_BG;
                    } else if (record.movementType === 'palti' || record.movement_type === 'palti') {
                        data.cell.styles.fillColor = YELLOW_BG;
                    } else if (record.movementType === 'shifting' || record.movementType === 'production-shifting') {
                        data.cell.styles.fillColor = PURPLE_BG;
                    }
                }
            }
        }
    });
}

function formatDate(date: string | Date): string {
    if (!date) return '-';
    try {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
}

function formatNumber(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toFixed(2);
}

function formatMovementType(type: string): string {
    if (!type) return '-';
    const typeMap: { [key: string]: string } = {
        'purchase': 'Purchase',
        'shifting': 'Shifting',
        'production-shifting': 'Prod. Shifting',
        'loose': 'Loose',
        'production': 'Production',
        'sale': 'Sale',
        'palti': 'Palti'
    };
    return typeMap[type.toLowerCase()] || type;
}

function formatFilename(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function getFromLocation(record: any): string {
    if (record.movementType === 'purchase') {
        return record.fromLocation || '-';
    }
    if (record.fromKunchinittu?.code) {
        return `${record.fromKunchinittu.code} (${record.fromWarehouse?.code || '-'})`;
    }
    return '-';
}

function getToLocation(record: any): string {
    if (record.toKunchinittu?.code) {
        const warehouse = record.toWarehouse?.code || record.toWarehouseShift?.code || '-';
        return `${record.toKunchinittu.code} (${warehouse})`;
    }
    if (record.outturn?.code) {
        return record.outturn.code;
    }
    return '-';
}

export default {
    generateArrivalsPDF,
    generatePurchasePDF,
    generateShiftingPDF,
    generatePaddyStockPDF,
    generateRiceStockPDF,
    generateRiceMovementsPDF,
    generateOutturnReportPDF
};
