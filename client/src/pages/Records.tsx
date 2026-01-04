import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { NotificationMessages } from '../utils/notificationMessages';
import { useAuth } from '../contexts/AuthContext';
import EditArrivalModal from '../components/EditArrivalModal';
import InlineHamaliForm from '../components/InlineHamaliForm';
import InlineRiceHamaliForm from '../components/InlineRiceHamaliForm';

import AddPaddyHamaliModal from '../components/AddPaddyHamaliModal';
import EnhancedPaltiModal from '../components/EnhancedPaltiModal';
import SimplePurchaseModal from '../components/SimplePurchaseModal';
import SimpleSaleModal from '../components/SimpleSaleModal';
import {
  generateArrivalsPDF,
  generatePurchasePDF,
  generateShiftingPDF,
  generatePaddyStockPDF,
  generateRiceStockPDF,
  generateRiceMovementsPDF,
  generateOutturnReportPDF
} from '../utils/recordsPdfGenerator';
import PaginationControls from '../components/PaginationControls';

const Container = styled.div`
  animation: fadeIn 0.5s ease-in;
`;

const Title = styled.h1`
  color: #ffffff;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6'};
    color: ${props => props.$active ? 'white' : '#374151'};
  }
`;

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
`;

const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
  }

  &.success {
    background: #10b981;
    color: white;
  }

  &.secondary {
    background: #6b7280;
    color: white;
  }

  &.danger {
    background: #ef4444;
    color: white;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const RecordsContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
`;

const DateGroup = styled.div<{ expanded: boolean }>`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const DateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f3f4f6;
  }
`;

const DateTitle = styled.h3`
  color: #1f2937;
  font-size: 1.1rem;
  margin: 0;
`;

const RecordCount = styled.span`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  width: 100%;
  margin: 0;
  padding: 0;
  
  /* Ensure table extends to edges */
  table {
    margin: 0;
    border-left: none;
    border-right: none;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 0.9rem;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return 'background: #fef3c7; color: #d97706;';
      case 'approved':
        return 'background: #d1fae5; color: #059669;';
      case 'rejected':
        return 'background: #fee2e2; color: #dc2626;';
      default:
        return 'background: #e5e7eb; color: #6b7280;';
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  padding: 0.5rem;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #e5e7eb;
  }

  &.edit:hover {
    background: #fef3c7;
    color: #f59e0b;
  }

  &.delete:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  &.approve:hover {
    background: #d1fae5;
    color: #059669;
  }
`;

const PendingAlert = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);

  .count {
    background: #f59e0b;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 50%;
    font-weight: 700;
    font-size: 1.2rem;
    min-width: 50px;
    text-align: center;
  }

  .text {
    flex: 1;
    font-weight: 600;
    color: #92400e;
  }
`;

const VarietyCell = styled.td<{ hasLocation?: boolean; isPurple?: boolean }>`
  background: ${props => props.hasLocation ? (props.isPurple ? '#e2d4ed !important' : '#d4edda !important') : 'inherit'};
  font-weight: ${props => props.hasLocation ? '600' : 'normal'};
  color: ${props => props.hasLocation ? (props.isPurple ? '#6b21a8' : '#155724') : 'inherit'};
`;

const LocationCell = styled.td<{ hasLocation?: boolean; isPurple?: boolean }>`
  background: ${props => props.hasLocation ? (props.isPurple ? '#e2d4ed !important' : '#d4edda !important') : 'inherit'};
  font-weight: ${props => props.hasLocation ? '600' : 'normal'};
  color: ${props => props.hasLocation ? (props.isPurple ? '#6b21a8' : '#155724') : 'inherit'};
`;

const ExcelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Calibri', 'Arial', sans-serif;
  font-size: 10pt;
  background: white;

  thead {
    background: #4472c4;
    color: white;
    font-weight: bold;
  }

  th, td {
    border: 1px solid #d0d0d0;
    padding: 4px 6px;
    text-align: left;
  }

  th {
    font-weight: bold;
    white-space: nowrap;
    font-size: 9pt;
  }

  tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  tbody tr:hover {
    background: #e8f4f8;
  }
`;

const PurchaseRow = styled.tr`
  background: #d4edda !important;
  
  &:hover {
    background: #c3e6cb !important;
  }
`;

const ShiftingRow = styled.tr`
  background: #e2d4ed !important;
  
  &:hover {
    background: #d4c3e6 !important;
  }
`;

const StockSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const StockDate = styled.h3`
  background: #4472c4;
  color: white;
  padding: 0.75rem 1rem;
  margin: -1.5rem -1.5rem 1rem;
  border-radius: 8px 8px 0 0;
  font-size: 1.1rem;
  font-weight: bold;
`;

const StockSummary = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1.1rem;

  &.opening {
    background: #d1f2eb;
    border-color: #28a745;
  }

  &.closing {
    background: #f8d7da;
    border-color: #dc3545;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

const PDFButton = styled.button<{ $variant?: 'all' | 'filtered' }>`
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  background: ${props => props.$variant === 'filtered'
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'};
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.$variant === 'filtered'
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(220, 38, 38, 0.3)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: #f8fafc;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: ${props => props.$active ? '#f59e0b' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$active ? '#f59e0b' : '#fef3c7'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Rice Stock Styled Components
const RiceStockSection = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
`;

const RiceStockDateHeader = styled.div`
  background: #4a90e2;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  font-weight: bold;
`;

const RiceStockContent = styled.div`
  padding: 1rem 1.5rem;
`;

const RiceStockItem = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const RiceStockTotal = styled.div`
  font-weight: bold;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  
  &.opening {
    border-bottom: 2px solid #ddd;
  }
  
  &.closing {
    border-top: 2px solid #ddd;
  }
`;

const RiceStockQuantity = styled.span`
  font-weight: bold;
  min-width: 80px;
  color: #10b981;
`;

const RiceStockDetails = styled.span`
  min-width: 200px;
  font-weight: 600;
`;

const InlineRateForm = styled.tr`
  background: #f8f9fa !important;
`;

const RateFormCell = styled.td`
  padding: 2rem !important;
  border: 2px solid #10b981 !important;
`;

const RateFormContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const RateFormTitle = styled.h3`
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  border-bottom: 2px solid #10b981;
  padding-bottom: 0.5rem;
`;

const RateFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const RateFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RateLabel = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
`;

const RateInput = styled.input`
  padding: 0.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.85rem;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const RateRadioGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const RateRadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;

  input[type="radio"] {
    cursor: pointer;
  }
`;

const RateCalculationBox = styled.div`
  background: #f0fdf4;
  border: 1px solid #10b981;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const RateCalcRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
`;

const RateCalcLabel = styled.span`
  color: #065f46;
  font-weight: 600;
`;

const RateCalcValue = styled.span`
  color: #047857;
  font-weight: 700;
`;

const RateButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

interface MonthOption {
  month: string; // Format: YYYY-MM
  month_label: string; // Format: "January 2024"
}

interface PaginationData {
  currentMonth: string | null;
  availableMonths: MonthOption[];
  totalRecords: number;
  recordsReturned?: number;
  totalPages?: number;
  truncated?: boolean;
  limit?: number;
  page?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

interface RecordsResponse {
  records: { [date: string]: Arrival[] };
  pagination: PaginationData;
  performance?: {
    responseTime: string;
    recordsReturned: number;
  };
}

interface Arrival {
  id: number;
  slNo: string;
  date: string;
  movementType: string;
  broker?: string;
  variety?: string; // Changed to string (text field)
  bags?: number;
  fromLocation?: string;
  toKunchinintuId?: number;
  toKunchinittu?: { name: string; code?: string };
  toWarehouse?: { name: string; code?: string };
  fromKunchinittu?: { name: string; code?: string };
  fromWarehouse?: { name: string; code?: string };
  toWarehouseShift?: { name: string; code?: string };
  outturnId?: number;
  outturn?: { code: string; allottedVariety?: string; isCleared?: boolean; clearedAt?: string };
  moisture?: number;
  cutting?: string;
  wbNo: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  lorryNumber: string;
  status: string;
  creator?: { username: string };
  approver?: { username: string; role: string };
  adminApprover?: { username: string; role: string };
  adminApprovedBy?: number;
  purchaseRate?: {
    amountFormula: string;
    totalAmount: number | string;
    averageRate: number | string;
  };
}

// Helper function to get week range string
const getWeekRange = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (dt: Date) => {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  return `Week: ${formatDate(monday)} to ${formatDate(sunday)}`;
};

// Helper function to get week key for grouping
const getWeekKey = (date: string): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const Records: React.FC = () => {
  const { user } = useAuth();

  // Month navigation functions for paddy stock
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentMonth = selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = currentMonth.split('-').map(Number);

    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    } else {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }

    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
    setPage(1); // Reset page for other tabs

    // Show loading message
    toast.info(`Loading ${new Date(newYear, newMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} paddy stock...`);
  };

  const getCurrentMonthLabel = () => {
    if (!selectedMonth) return 'Current Month';
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  const [activeTab, setActiveTab] = useState<'arrivals' | 'purchase' | 'shifting' | 'stock' | 'outturn-report' | 'rice-outturn-report' | 'rice-stock'>('arrivals');
  const [records, setRecords] = useState<{ [key: string]: Arrival[] }>({});
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'date' | 'week'>('week'); // Default to week grouping
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Debounced for API calls
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubmittingByProducts, setIsSubmittingByProducts] = useState(false);
  const [isSubmittingRiceProduction, setIsSubmittingRiceProduction] = useState(false);

  // Month-wise pagination state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [lastToastMessage, setLastToastMessage] = useState<string>(''); // Prevent duplicate toasts
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [editingRecord, setEditingRecord] = useState<Arrival | null>(null);
  const [expandedHamaliRecordId, setExpandedHamaliRecordId] = useState<number | null>(null);
  const [expandedRiceHamaliRecordId, setExpandedRiceHamaliRecordId] = useState<string | null>(null);
  // FIXED: Separate state for paddy and rice hamali to avoid data structure conflicts
  const [paddyHamaliEntries, setPaddyHamaliEntries] = useState<{ [key: number]: any }>({});
  const [riceHamaliEntries, setRiceHamaliEntries] = useState<{ [key: string]: any[] }>({});
  const [showPaddyHamaliModal, setShowPaddyHamaliModal] = useState(false); // Kept for compatibility if needed, but unused for inline
  const [selectedArrivalForHamali, setSelectedArrivalForHamali] = useState<any>(null);

  const [expandedRateRecordId, setExpandedRateRecordId] = useState<number | null>(null);
  const [rateFormData, setRateFormData] = useState<any>({
    sute: '0',
    suteCalculationMethod: 'per_bag',
    baseRate: '',
    baseRateCalculationMethod: 'per_bag', // Default to per_bag
    rateType: 'CDL',
    h: '0',
    b: '0',
    bCalculationMethod: 'per_bag',
    lf: '0',
    lfCalculationMethod: 'per_bag',
    egb: '0'
  });
  const [savingRate, setSavingRate] = useState(false);

  // Business Date logic - show only today's records by default (6 AM cutoff)
  const [showAllRecords, setShowAllRecords] = useState(false);

  // Get business date (if before 6 AM, use previous day)
  const getBusinessDate = () => {
    const now = new Date();
    const hours = now.getHours();

    if (hours < 6) {
      // Before 6 AM, use previous day
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    return now.toISOString().split('T')[0];
  };

  // Handle tab change with month filter reset
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);

    // For paddy stock, initialize with current month; for others, reset month filter
    if (tab === 'stock') {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currentMonth);
    } else {
      setSelectedMonth(''); // Reset month filter for other tabs
    }

    setRecords({});
    setPage(1); // Reset page
  };

  // Outturn Report state
  const [outturns, setOutturns] = useState<any[]>([]);
  const [selectedOutturnId, setSelectedOutturnId] = useState('');
  const [outturnSearch, setOutturnSearch] = useState('');
  const [riceReportSearch, setRiceReportSearch] = useState('');
  const [availableBags, setAvailableBags] = useState<number>(0);
  const [isOutturnCleared, setIsOutturnCleared] = useState<boolean>(false);
  const [showClearOutturnDialog, setShowClearOutturnDialog] = useState(false);
  const [clearOutturnDate, setClearOutturnDate] = useState<string>('');
  const [productionRecords, setProductionRecords] = useState<any[]>([]);
  const [byProducts, setByProducts] = useState<any[]>([]);
  const [byProductDate, setByProductDate] = useState<Date | null>(new Date());
  const [rice, setRice] = useState('');
  const [rejectionRice, setRejectionRice] = useState('');
  const [broken, setBroken] = useState('');
  const [rejectionBroken, setRejectionBroken] = useState('');
  const [zeroBroken, setZeroBroken] = useState('');
  const [faram, setFaram] = useState('');
  const [bran, setBran] = useState('');

  // Rice Production Entry Form state
  const [packagings, setPackagings] = useState<any[]>([]);
  const [locationsData, setLocationsData] = useState<any[]>([]);
  const [riceStockLocations, setRiceStockLocations] = useState<any[]>([]);
  const [productionDate, setProductionDate] = useState('');
  const [productionDateInput, setProductionDateInput] = useState('');
  const [productType, setProductType] = useState('');
  const [bags, setBags] = useState('');
  const [packagingId, setPackagingId] = useState('');
  const [quantityQuintals, setQuantityQuintals] = useState(0);
  const [paddyBagsDeducted, setPaddyBagsDeducted] = useState(0);
  const [movementType, setMovementType] = useState<'kunchinittu' | 'loading'>('kunchinittu');
  const [locationCode, setLocationCode] = useState('');
  const [lorryNumber, setLorryNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [paddyDate, setPaddyDate] = useState('');

  // Rice Stock state
  const [riceStockData, setRiceStockData] = useState<any[]>([]);

  // Rice Stock filter state - Using month-wise filtering only (no date range)
  const [riceStockDateFrom, setRiceStockDateFrom] = useState<string>(''); // Disabled - using month filter
  const [riceStockDateTo, setRiceStockDateTo] = useState<string>(''); // Disabled - using month filter
  const [riceStockProductType, setRiceStockProductType] = useState<string>('');
  const [riceStockLocationCode, setRiceStockLocationCode] = useState<string>('');

  // Rice Productions for paddy stock (to show outturn deductions)
  const [allRiceProductions, setAllRiceProductions] = useState<any[]>([]);

  // Rice Stock Management states (Purchase/Sale modals removed - data display only)
  const [riceStockMovements, setRiceStockMovements] = useState<any[]>([]);
  const [riceStockPage, setRiceStockPage] = useState(1);
  const [riceStockTotalPages, setRiceStockTotalPages] = useState(1);
  const [riceStockTotalRecords, setRiceStockTotalRecords] = useState(0);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Palti and Approval states
  const [showPaltiModal, setShowPaltiModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [pendingMovements, setPendingMovements] = useState<any[]>([]);
  const [showPendingMovements, setShowPendingMovements] = useState(false);

  // Helper function to navigate to outturn
  const navigateToOutturn = (outturnCode: string) => {
    // Switch to outturn-report tab
    setActiveTab('outturn-report');

    // Find the outturn by code and select it
    const outturn = outturns.find((o: any) =>
      (o.code === outturnCode) ||
      (o.outturnNumber === outturnCode)
    );

    if (outturn) {
      setSelectedOutturnId(outturn.id.toString());
      toast.success(`Navigated to outturn: ${outturnCode}`);
    } else {
      toast.warning(`Outturn ${outturnCode} not found`);
    }
  };

  // Pagination and filtering for by-products
  const [byProductSearch, setByProductSearch] = useState('');
  const [byProductPage, setByProductPage] = useState(1);
  const byProductsPerPage = 10;

  // Filtered and paginated by-products - MEMOIZED for performance
  const filteredByProducts = useMemo(() => {
    return byProducts.filter((bp: any) => {
      if (!byProductSearch) return true;
      const searchLower = byProductSearch.toLowerCase();
      const dateStr = new Date(bp.date).toLocaleDateString('en-GB').toLowerCase();
      return dateStr.includes(searchLower);
    });
  }, [byProducts, byProductSearch]);

  const totalByProductPages = useMemo(() =>
    Math.ceil(filteredByProducts.length / byProductsPerPage),
    [filteredByProducts.length, byProductsPerPage]
  );

  const paginatedByProducts = useMemo(() =>
    filteredByProducts.slice(
      (byProductPage - 1) * byProductsPerPage,
      byProductPage * byProductsPerPage
    ),
    [filteredByProducts, byProductPage, byProductsPerPage]
  );

  // Debounce search input for performance with 10 lakh records
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms delay before API call

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchRecords();
  }, [activeTab, page, dateFrom, dateTo, debouncedSearch, showAllRecords, selectedMonth]);

  // Auto-fetch when month changes for paddy stock
  useEffect(() => {
    if (activeTab === 'stock' && selectedMonth) {
      fetchRecords();
    }
  }, [selectedMonth, activeTab]);

  // Auto-refresh at 6 AM daily
  useEffect(() => {
    const checkTimeAndRefresh = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // At 6:00 AM, refresh the records
      if (hours === 6 && minutes === 0) {
        fetchRecords();
      }
    };

    // Check every minute
    const interval = setInterval(checkTimeAndRefresh, 60000);

    return () => clearInterval(interval);
  }, [activeTab, showAllRecords]);

  useEffect(() => {
    if (activeTab === 'outturn-report') {
      fetchOutturns();
      fetchPackagings();
      fetchLocationsData();
      fetchRiceStockLocations();
    } else if (activeTab === 'rice-outturn-report' || activeTab === 'rice-stock') {
      fetchRiceStock();
    } else if (activeTab === 'stock') {
      fetchAllRiceProductions();
      fetchOutturns(); // Fetch outturns for hyperlinks to work
    }
  }, [activeTab]);

  // Refetch rice stock when month or filters change (using month-based filtering only)
  useEffect(() => {
    if (activeTab === 'rice-stock' || activeTab === 'rice-outturn-report') {
      fetchRiceStock();
    }
  }, [riceStockProductType, riceStockLocationCode, riceStockPage, selectedMonth]);

  useEffect(() => {
    if (selectedOutturnId) {
      fetchProductionRecords();
      fetchByProducts();

      // Set paddy date - let user manually select production date
      const selectedOutturn = outturns.find(o => o.id === parseInt(selectedOutturnId));
      if (selectedOutturn && selectedOutturn.paddyDate) {
        setPaddyDate(selectedOutturn.paddyDate);
        // Don't auto-set production date - let user choose
        setProductionDate('');
        setProductionDateInput('');
      }
    }
  }, [selectedOutturnId, outturns]);

  // Fetch available bags when outturn is selected
  useEffect(() => {
    const fetchAvailableBags = async () => {
      if (selectedOutturnId) {
        try {
          const response = await axios.get<{
            availableBags: number;
            isCleared?: boolean;
            clearedAt?: string;
            remainingBags?: number;
          }>(`/rice-productions/outturn/${selectedOutturnId}/available-bags`);
          setAvailableBags(response.data.availableBags);
          setIsOutturnCleared(response.data.isCleared || false);
        } catch (error) {
          console.error('Error fetching available bags:', error);
          setAvailableBags(0);
          setIsOutturnCleared(false);
        }
      } else {
        setAvailableBags(0);
        setIsOutturnCleared(false);
      }
    };
    fetchAvailableBags();
  }, [selectedOutturnId]);

  // Helper function to calculate paddy bags deducted from rice quintals
  const calculatePaddyBagsDeducted = (quintals: number, productType: string): number => {
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

  // Calculate quintals and paddy bags when bags or packaging changes
  useEffect(() => {
    if (bags && packagingId) {
      const bagsNum = parseFloat(bags) || 0;
      const packaging = packagings.find(p => p.id === parseInt(packagingId));
      console.log('Selected packaging:', packaging);
      console.log('Bags:', bagsNum);
      if (packaging && packaging.allottedKg && bagsNum > 0) {
        const kgPerBag = parseFloat(packaging.allottedKg);
        // Calculate quintals: (bags × kg_per_bag) / 100
        const quintals = (bagsNum * kgPerBag) / 100;
        console.log('Calculated quintals:', quintals);
        setQuantityQuintals(quintals);

        // Calculate paddy deduction using new formula
        const paddyDeduction = calculatePaddyBagsDeducted(quintals, productType);
        console.log('Paddy bags deducted:', paddyDeduction);
        setPaddyBagsDeducted(paddyDeduction);
      } else {
        setQuantityQuintals(0);
        setPaddyBagsDeducted(0);
      }
    } else {
      setQuantityQuintals(0);
      setPaddyBagsDeducted(0);
    }
  }, [bags, packagingId, packagings, productType]);

  // Pre-fill form when selecting a date that has existing data
  useEffect(() => {
    if (byProductDate && byProducts.length > 0) {
      const selectedDateStr = byProductDate.toISOString().split('T')[0];
      const existingData = byProducts.find((bp: any) => bp.date === selectedDateStr);

      if (existingData) {
        // Pre-fill with existing data
        setRice(existingData.rice > 0 ? existingData.rice.toString() : '');
        setRejectionRice(existingData.rejectionRice > 0 ? existingData.rejectionRice.toString() : '');
        setBroken(existingData.broken > 0 ? existingData.broken.toString() : '');
        setRejectionBroken(existingData.rejectionBroken > 0 ? existingData.rejectionBroken.toString() : '');
        setZeroBroken(existingData.zeroBroken > 0 ? existingData.zeroBroken.toString() : '');
        setFaram(existingData.faram > 0 ? existingData.faram.toString() : '');
        setBran(existingData.bran > 0 ? existingData.bran.toString() : '');
      } else {
        // Clear form for new date
        setRice('');
        setRejectionRice('');
        setBroken('');
        setRejectionBroken('');
        setZeroBroken('');
        setFaram('');
        setBran('');
      }
    }
  }, [byProductDate, byProducts]);

  // Helper function to convert DD-MM-YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const fetchHamaliEntries = async (arrivalIds: number[], riceMovementIds: string[] = []) => {
    try {
      // Fetch paddy hamali entries (OLD system - object structure)
      if (arrivalIds.length > 0) {
        const token = localStorage.getItem('token');
        const response = await axios.post<{ entries: { [key: number]: any } }>(
          '/hamali-entries/batch',
          { arrivalIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.entries) {
          setPaddyHamaliEntries(response.data.entries);
          console.log('🔍 DEBUG - Paddy hamali entries (OLD system):', response.data.entries);
          console.log('🔍 DEBUG - Sample paddy entry structure:', Object.values(response.data.entries)[0]);
        }
      }

      // Fetch rice hamali entries (NEW system - array structure)
      if (riceMovementIds.length > 0) {
        // Extract rice production IDs and stock movement IDs
        const riceProductionIds: number[] = [];
        const stockMovementIds: number[] = [];

        riceMovementIds.forEach(id => {
          if (typeof id === 'string' && id.startsWith('movement-')) {
            // Extract stock movement ID from "movement-123" format
            const stockId = parseInt(id.replace('movement-', ''));
            if (!isNaN(stockId)) {
              stockMovementIds.push(stockId);
            }
          } else if (typeof id === 'string' && (id.startsWith('purchase-') || id.startsWith('sale-') || id.startsWith('palti-'))) {
            // Extract stock movement ID from "purchase-123", "sale-123", "palti-123" format
            const stockId = parseInt(id.split('-')[1]);
            if (!isNaN(stockId)) {
              stockMovementIds.push(stockId);
            }
          } else if (typeof id === 'number') {
            // Direct rice production ID
            riceProductionIds.push(id);
          }
        });

        console.log('🔍 Fetching rice hamali entries for:', { riceProductionIds, stockMovementIds });

        // Use the NEW SIMPLIFIED endpoint that doesn't have PostgreSQL function issues
        try {
          const token = localStorage.getItem('token');
          const riceHamaliResponse = await axios.post<{ success: boolean; data: { entries: { [key: string]: any[] } } }>(
            '/rice-hamali-entries-simple/batch',
            { riceProductionIds, stockMovementIds },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (riceHamaliResponse.data.success && riceHamaliResponse.data.data.entries) {
            setRiceHamaliEntries(riceHamaliResponse.data.data.entries);
            console.log('✅ Rice hamali entries (NEW system) fetched successfully:', riceHamaliResponse.data.data.entries);
            console.log('🔍 DEBUG - Sample rice entry structure:', Object.values(riceHamaliResponse.data.data.entries)[0]);
          } else {
            console.log('⚠️ Rice hamali response not successful:', riceHamaliResponse.data);
          }
        } catch (riceHamaliError) {
          console.error('❌ Rice hamali fetching failed:', riceHamaliError);
          // Try fallback to original endpoint
          try {
            console.log('🔄 Trying fallback endpoint...');
            const token = localStorage.getItem('token');
            const fallbackResponse = await axios.post<{ entries: { [key: string]: any[] } }>(
              '/rice-hamali-entries/batch',
              { riceProductionIds, stockMovementIds },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (fallbackResponse.data.entries) {
              setRiceHamaliEntries(fallbackResponse.data.entries);
              console.log('✅ Rice hamali entries fetched via fallback');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback rice hamali fetching also failed:', fallbackError);
            // Don't throw error - just log it so paddy hamali still works
          }
        }
      }
    } catch (error) {
      console.error('Error fetching hamali entries:', error);
    }
  };



  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {};

      // Special handling for paddy stock - month-wise pagination
      if (activeTab === 'stock') {
        // For paddy stock, use month-wise pagination
        if (selectedMonth) {
          params.month = selectedMonth;
        } else {
          // If no month selected, show current month
          const currentDate = new Date();
          const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          params.month = currentMonth;
          setSelectedMonth(currentMonth); // Update state to reflect current month
        }
        // Don't use page/limit for stock - load full month
      } else {
        // For other tabs, use regular pagination
        params.page = page;
        params.limit = 250; // Always load 250 records per page

        // Priority: month filter > date range filters > show all records
        if (selectedMonth) {
          params.month = selectedMonth;
        } else if (showAllRecords || dateFrom || dateTo) {
          // Show all records with pagination OR date range with pagination
          if (dateFrom) params.dateFrom = convertDateFormat(dateFrom);
          if (dateTo) params.dateTo = convertDateFormat(dateTo);
          // Don't set any date filters if showAllRecords is true and no manual dates
        } else {
          // Business Date logic: Default to today's records only
          const businessDate = getBusinessDate();
          params.dateFrom = businessDate;
          params.dateTo = businessDate;
        }
      }

      if (search) params.search = search;

      const endpoint = activeTab === 'arrivals' ? '/records/arrivals' :
        activeTab === 'purchase' ? '/records/purchase' :
          activeTab === 'shifting' ? '/records/shifting' : '/records/stock';

      const response = await axios.get(endpoint, { params });
      const data = response.data as RecordsResponse;

      // Group records by week if needed (for arrivals, purchase, shifting tabs only)
      let processedRecords = data.records || {};
      if (groupBy === 'week' && activeTab !== 'stock' && activeTab !== 'outturn-report') {
        const weekGrouped: { [key: string]: Arrival[] } = {};

        Object.entries(processedRecords).forEach(([date, dateRecords]) => {
          const weekKey = getWeekKey(date);
          if (!weekGrouped[weekKey]) {
            weekGrouped[weekKey] = [];
          }
          weekGrouped[weekKey].push(...dateRecords);
        });

        processedRecords = weekGrouped;
      }

      setRecords(processedRecords);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.totalRecords || 0);

      // Removed pagination toast notifications to prevent repeated toasts causing page scroll
      // The pagination info is visible in the UI

      // Check for truncated data (legacy support)
      if (data.pagination?.truncated) {
        toast.warning(`Data truncated. Showing first ${data.pagination.limit} records. Please refine your filters.`);
      }

      // Update available months from pagination data
      if (data.pagination?.availableMonths) {
        setAvailableMonths(data.pagination.availableMonths);
      }

      // Fetch hamali entries for all records
      const allRecords = Object.values(data.records || {}).flat();
      const arrivalIds = allRecords.map(r => r.id);

      // For rice stock tabs, also get rice movement IDs
      let riceMovementIds: string[] = [];
      if (activeTab === 'rice-stock' || activeTab === 'rice-outturn-report') {
        // Get all rice stock data IDs
        riceMovementIds = riceStockData.map(item => item.id?.toString()).filter(Boolean);
      }

      if (arrivalIds.length > 0 || riceMovementIds.length > 0) {
        fetchHamaliEntries(arrivalIds, riceMovementIds);
      }

      // Count pending records for manager/admin
      if (canEdit && activeTab === 'arrivals') {
        const pending = allRecords.filter(r => r.status === 'pending').length;
        setPendingCount(pending);

        // Count pending admin approvals (approved by manager but not by admin)
        if (user?.role === 'admin') {
          const pendingAdmin = allRecords.filter(r => r.status === 'approved' && !r.adminApprovedBy).length;
          setPendingAdminCount(pendingAdmin);
        }
      }

      // Auto-expand business date records when showing only today
      if (!showAllRecords && !dateFrom && !dateTo) {
        const businessDate = getBusinessDate();
        const recordDates = Object.keys(data.records || {});
        const businessDateExists = recordDates.some(date => date === businessDate);

        if (businessDateExists) {
          setExpandedDates(new Set([businessDate]));
        } else {
          setExpandedDates(new Set());
        }
      } else {
        // Keep all dates collapsed when showing all records or using filters
        setExpandedDates(new Set());
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      // Only show toast if it's a different error than last time
      const errorMsg = 'Failed to fetch records';
      if (lastToastMessage !== errorMsg) {
        toast.error(errorMsg);
        setLastToastMessage(errorMsg);
      }
      // Don't clear existing records - allow user to retry
      // Set empty availableMonths on error
      setAvailableMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleAllDates = () => {
    if (expandedDates.size === Object.keys(records).length) {
      // Collapse all
      setExpandedDates(new Set());
    } else {
      // Expand all
      setExpandedDates(new Set(Object.keys(records)));
    }
  };

  const toggleRateForm = async (recordId: number) => {
    if (expandedRateRecordId === recordId) {
      // Close the form
      setExpandedRateRecordId(null);
      setRateFormData({
        sute: '0',
        suteCalculationMethod: 'per_bag',
        baseRate: '',
        baseRateCalculationMethod: 'per_bag',
        rateType: 'CDL',
        h: '0',
        b: '0',
        bCalculationMethod: 'per_bag',
        lf: '0',
        lfCalculationMethod: 'per_bag',
        egb: '0'
      });
    } else {
      // Open the form and fetch existing rate if any
      setExpandedRateRecordId(recordId);
      try {
        const response = await axios.get<{ purchaseRate: any }>(`/purchase-rates/${recordId}`);
        if (response.data.purchaseRate) {
          const rate = response.data.purchaseRate;
          setRateFormData({
            sute: rate.sute?.toString() || '0',
            suteCalculationMethod: rate.suteCalculationMethod || 'per_bag',
            baseRate: rate.baseRate.toString(),
            baseRateCalculationMethod: rate.baseRateCalculationMethod || 'per_bag',
            rateType: rate.rateType,
            h: rate.h.toString(),
            b: rate.b.toString(),
            bCalculationMethod: rate.bCalculationMethod,
            lf: rate.lf.toString(),
            lfCalculationMethod: rate.lfCalculationMethod,
            egb: rate.egb.toString()
          });
        }
      } catch (error) {
        // No existing rate, keep default values
        console.log('No existing rate found');
        // Explicitly reset to defaults for new entry
        setRateFormData({
          sute: '0',
          suteCalculationMethod: 'per_bag',
          baseRate: '',
          baseRateCalculationMethod: 'per_bag',
          rateType: 'CDL',
          h: '0',
          b: '0',
          bCalculationMethod: 'per_bag',
          lf: '0',
          lfCalculationMethod: 'per_bag',
          egb: '0'
        });
      }
    }
  };

  const handleRateInputChange = (field: string, value: string) => {
    setRateFormData((prev: any) => {
      const newData = { ...prev, [field]: value };

      // Reset EGB if rate type changes to non-EGB types
      if (field === 'rateType') {
        if (['CDWB', 'MDWB', 'MDWN'].includes(value)) {
          newData.egb = '0';
        }
      }

      return newData;
    });
  };

  const handleSaveRate = async (recordId: number) => {
    if (!rateFormData.baseRate || parseFloat(rateFormData.baseRate) <= 0) {
      toast.error('Base rate is required and must be greater than 0');
      return;
    }

    try {
      setSavingRate(true);

      // Check if rate already exists to determine if it's add or update
      // Wrap in try-catch so GET failure doesn't block the save operation
      let isUpdate = false;
      try {
        const checkResponse = await axios.get<{ purchaseRate: any }>(`/purchase-rates/${recordId}`);
        isUpdate = !!checkResponse.data.purchaseRate;
      } catch (checkError) {
        // If check fails, assume it's a new rate (will still save correctly)
        console.log('Could not check existing rate, assuming new:', checkError);
        isUpdate = false;
      }

      await axios.post('/purchase-rates', {
        arrivalId: recordId,
        sute: parseFloat(rateFormData.sute),
        suteCalculationMethod: rateFormData.suteCalculationMethod,
        baseRate: parseFloat(rateFormData.baseRate),
        baseRateCalculationMethod: rateFormData.baseRateCalculationMethod,
        rateType: rateFormData.rateType,
        h: parseFloat(rateFormData.h),
        b: parseFloat(rateFormData.b),
        bCalculationMethod: rateFormData.bCalculationMethod,
        lf: parseFloat(rateFormData.lf),
        lfCalculationMethod: rateFormData.lfCalculationMethod,
        egb: parseFloat(rateFormData.egb)
      });

      toast.success(isUpdate ? NotificationMessages.purchaseRate.updated : NotificationMessages.purchaseRate.added);
      setExpandedRateRecordId(null);
      fetchRecords(); // Refresh to show updated rate
    } catch (error: any) {
      console.error('Error saving rate:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || NotificationMessages.purchaseRate.error;
      toast.error(errorMessage);
    } finally {
      setSavingRate(false);
    }
  };

  const fetchOutturns = async () => {
    try {
      const response = await axios.get<any[]>('/outturns');
      setOutturns(response.data);
    } catch (error) {
      console.error('Error fetching outturns:', error);
      toast.error('Failed to fetch outturns');
    }
  };

  const confirmClearOutturn = async () => {
    if (!clearOutturnDate) {
      toast.error('Please select a clear date');
      return;
    }

    try {
      const response = await axios.post<{ message: string }>(`/outturns/${selectedOutturnId}/clear`,
        { clearDate: clearOutturnDate },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(response.data.message || 'Outturn cleared successfully!');
      setShowClearOutturnDialog(false);
      fetchOutturns();
      setSelectedOutturnId('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clear outturn');
    }
  };

  const fetchProductionRecords = async () => {
    try {
      // Fetch both production-shifting AND for-production purchases
      const [productionShiftingResponse, forProductionResponse] = await Promise.all([
        axios.get<any>('/records/arrivals', {
          params: {
            movementType: 'production-shifting',
            outturnId: selectedOutturnId
          }
        }),
        axios.get<any>('/records/arrivals', {
          params: {
            movementType: 'purchase',
            outturnId: selectedOutturnId
          }
        })
      ]);

      const productionShiftingRecords = productionShiftingResponse.data.records
        ? Object.values(productionShiftingResponse.data.records).flat().filter((r: any) => r.outturnId === parseInt(selectedOutturnId))
        : [];

      const forProductionRecords = forProductionResponse.data.records
        ? Object.values(forProductionResponse.data.records).flat().filter((r: any) => r.outturnId === parseInt(selectedOutturnId))
        : [];

      // Combine both production-shifting and for-production purchases
      const allProductionRecords = [...productionShiftingRecords, ...forProductionRecords];
      setProductionRecords(allProductionRecords as any[]);
    } catch (error) {
      console.error('Error fetching production records:', error);
    }
  };

  const fetchByProducts = async () => {
    if (!selectedOutturnId) return;

    try {
      const response = await axios.get<any[]>(`/byproducts/outturn/${selectedOutturnId}`);
      setByProducts(response.data);
    } catch (error) {
      console.error('Error fetching by-products:', error);
    }
  };

  const handleSubmitByProducts = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-click submission
    if (isSubmittingByProducts) {
      return;
    }

    if (!selectedOutturnId) {
      toast.error('Please select an outturn first');
      return;
    }

    if (!byProductDate) {
      toast.error('Please select a date');
      return;
    }

    setIsSubmittingByProducts(true);
    setLoading(true);
    try {
      // Only send values that were actually entered, not zeros
      const payload: any = {
        outturnId: parseInt(selectedOutturnId),
        date: byProductDate.toISOString().split('T')[0]
      };

      // Only include fields with actual values
      if (rice && rice.trim() !== '') payload.rice = parseFloat(rice);
      if (rejectionRice && rejectionRice.trim() !== '') payload.rejectionRice = parseFloat(rejectionRice);
      if (broken && broken.trim() !== '') payload.broken = parseFloat(broken);
      if (rejectionBroken && rejectionBroken.trim() !== '') payload.rejectionBroken = parseFloat(rejectionBroken);
      if (zeroBroken && zeroBroken.trim() !== '') payload.zeroBroken = parseFloat(zeroBroken);
      if (faram && faram.trim() !== '') payload.faram = parseFloat(faram);
      if (bran && bran.trim() !== '') payload.bran = parseFloat(bran);

      await axios.post('/byproducts', payload);

      toast.success('By-products recorded successfully!');

      // Reset form
      setRice('');
      setRejectionRice('');
      setBroken('');
      setRejectionBroken('');
      setZeroBroken('');
      setFaram('');
      setBran('');

      // Refresh by-products list
      fetchByProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record by-products');
    } finally {
      setLoading(false);
      setIsSubmittingByProducts(false);
    }
  };

  const fetchPackagings = async () => {
    try {
      console.log('Fetching packagings...');
      const response = await axios.get<any>('/packagings');
      console.log('Packagings response:', response.data);
      setPackagings(response.data.packagings || []);
    } catch (error: any) {
      console.error('Error fetching packagings:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch packagings');
    }
  };

  const fetchLocationsData = async () => {
    try {
      console.log('Fetching kunchinittus...');
      const response = await axios.get<any>('/locations/kunchinittus');
      console.log('Kunchinittus response:', response.data);
      setLocationsData(response.data.kunchinittus || []);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch locations');
    }
  };

  const fetchRiceStockLocations = async () => {
    try {
      const response = await axios.get<any>('/locations/rice-stock-locations');
      setRiceStockLocations(response.data.locations || []);
    } catch (error: any) {
      console.error('Error fetching rice stock locations:', error);
      toast.error('Failed to fetch rice stock locations');
    }
  };

  const handleRiceProductionSubmit = async () => {
    // Prevent double-click submission
    if (isSubmittingRiceProduction) {
      return;
    }

    if (!selectedOutturnId) {
      toast.error('Please select an outturn number');
      return;
    }

    if (!productionDate || !productType || !bags || !packagingId) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmittingRiceProduction(true);

    const prodDateObj = new Date(productionDate + 'T00:00:00');

    if (isNaN(prodDateObj.getTime())) {
      toast.error('Invalid date format');
      return;
    }

    // Date validation removed - allow any date for rice production entry

    if (movementType === 'kunchinittu' && !locationCode) {
      toast.error('Location code is required for Kunchinittu movement');
      return;
    }

    if (movementType === 'loading' && (!lorryNumber || !billNumber)) {
      toast.error('Lorry number and bill number are required for Loading movement');
      return;
    }

    try {
      const selectedOutturn = outturns.find(o => o.id === parseInt(selectedOutturnId));

      console.log('Production Date Input:', productionDateInput);
      console.log('Production Date (YYYY-MM-DD):', productionDate);

      const outturnCode = selectedOutturn?.code || selectedOutturn?.outturnNumber;
      if (!outturnCode) {
        toast.error('Outturn code not found');
        return;
      }

      const payload = {
        outturnNumber: outturnCode,
        date: productionDate,
        productType: productType,
        bags: parseFloat(bags),
        packagingId: parseInt(packagingId),
        movementType: movementType,
        locationCode: movementType === 'kunchinittu' ? locationCode : null,
        lorryNumber: movementType === 'loading' ? lorryNumber : null,
        billNumber: movementType === 'loading' ? billNumber : null
      };

      console.log('Payload being sent:', payload);

      // DETAILED LOGGING FOR SIZER BROKEN
      if (productType === 'Sizer Broken') {
        console.log('🔍 SIZER BROKEN DETECTED:');
        console.log('  - Product Type:', productType);
        console.log('  - Product Type Length:', productType.length);
        console.log('  - Product Type Char Codes:', Array.from(productType).map(c => c.charCodeAt(0)));
        console.log('  - Exact Match Test:', productType === 'Sizer Broken');
        console.log('  - Trimmed:', productType.trim());
        console.log('  - Full Payload:', JSON.stringify(payload, null, 2));
      }

      // Save to rice-productions table (backend automatically creates/updates by-product entry)
      await axios.post('/rice-productions', payload);

      toast.success('Rice production entry saved successfully!');

      // Refresh available bags
      const bagsResponse = await axios.get<{ availableBags: number }>(`/rice-productions/outturn/${selectedOutturnId}/available-bags`);
      setAvailableBags(bagsResponse.data.availableBags);

      // Reset form
      try {
        // Keep the same production date for convenience (user can change if needed)
      } catch (error) {
        console.error('Error resetting date:', error);
      }

      setProductType('');
      setBags('');
      setPackagingId('');
      setQuantityQuintals(0);
      setPaddyBagsDeducted(0);
      setMovementType('kunchinittu');
      setLocationCode('');
      setLorryNumber('');
      setBillNumber('');

      // Refresh production records, rice stock, and by-products
      fetchProductionRecords();
      fetchRiceStock();
      fetchByProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save entry');
    } finally {
      setIsSubmittingRiceProduction(false);
    }
  };

  const fetchRiceStock = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching rice stock data...');
      console.log('🔍 Active tab:', activeTab);
      console.log('🔍 Filters:', { riceStockDateFrom, riceStockDateTo, riceStockProductType, riceStockLocationCode });

      // For both Rice Stock Movement tabs: fetch ALL movements (Production + Purchase + Sale)
      if (activeTab === 'rice-outturn-report' || activeTab === 'rice-stock') {
        const token = localStorage.getItem('token');

        if (!token) {
          console.error('❌ No authentication token found');
          toast.error('Authentication required. Please login again.');
          setLoading(false);
          return;
        }

        // Fetch rice productions with month filter only (no date range)
        console.log('📊 Fetching rice productions...');
        const productionsParams: any = {
          limit: 100,
          page: riceStockPage
        };

        // Only use month filter (date range filters removed)
        if (selectedMonth) {
          productionsParams.month = selectedMonth;
        }

        const productionsResponse = await axios.get<{ productions: any[]; pagination?: any }>('/rice-productions', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
          params: productionsParams
        });
        console.log('✅ Rice productions response:', productionsResponse.data.productions?.length || 0, 'records');

        // Update pagination state if returned
        if (productionsResponse.data.pagination) {
          setRiceStockTotalPages(productionsResponse.data.pagination.totalPages || 1);
          setRiceStockTotalRecords(productionsResponse.data.pagination.totalRecords || 0);
        }

        // Fetch rice stock movements (Purchase/Sale/Palti)
        console.log('📦 Fetching rice stock movements...');
        let stockMovements: any[] = [];
        try {
          const movementsParams: any = {
            limit: 100,
            page: riceStockPage,
            _t: Date.now() // Cache buster
          };

          // Only use month/year filter (date range filters removed)
          if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            movementsParams.year = year;
            movementsParams.month = parseInt(month);
          }

          // Add product type filter if available
          if (riceStockProductType) movementsParams.productType = riceStockProductType;

          const movementsResponse = await axios.get('/rice-stock-management/movements', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            params: movementsParams
          });

          stockMovements = (movementsResponse.data as any).data?.movements || [];
          console.log('✅ Rice stock movements response:', stockMovements.length, 'records');

          // Filter by approval status on frontend (show all statuses for debugging)
          const approvedMovements = stockMovements.filter((m: any) => m.status === 'approved');
          const pendingMovements = stockMovements.filter((m: any) => m.status === 'pending');
          console.log('📋 Movement status breakdown:', {
            approved: approvedMovements.length,
            pending: pendingMovements.length,
            total: stockMovements.length
          });

          // Use all movements for now (not just approved) to debug
          // stockMovements = approvedMovements;

        } catch (error: any) {
          console.error('❌ Rice stock movements fetch failed:', error.response?.data || error.message);
          if (error.response?.status === 401) {
            toast.error('Authentication failed. Please login again.');
          } else if (error.response?.status === 404) {
            console.log('ℹ️ No rice stock movements found');
          } else {
            console.log('⚠️ Rice stock movements not available:', error.message);
          }
        }

        // Combine and format all movements
        console.log('🔄 Processing and combining data...');
        let allMovements = [
          // Production entries
          ...(productionsResponse.data.productions || []).map((prod: any) => ({
            ...prod,
            movementType: 'production',
            variety: prod.outturn?.allottedVariety || 'Sum25 RNR Raw',
            productType: prod.productType || prod.product || 'Rice', // Add product type
            bagSizeKg: prod.packaging?.allottedKg || 26,
            quantityQuintals: prod.quantityQuintals,
            // Ensure packaging object is properly structured
            packaging: prod.packaging ? {
              brandName: prod.packaging.brandName || 'A1',
              allottedKg: prod.packaging.allottedKg || 26
            } : {
              brandName: 'A1',
              allottedKg: 26
            },
            from: `Outt1-${prod.outturn?.code || 'Sum25 RNR Raw'}`,
            to: prod.locationCode || 'Unknown',
            partyName: null,
            billNumber: prod.billNumber,
            lorryNumber: prod.lorryNumber
          })),
          // Purchase/Sale/Palti entries
          ...stockMovements.map((movement: any) => ({
            id: `movement-${movement.id}`,
            date: movement.date,
            productType: movement.product_type, // Use actual product type, not separate 'Palti' category
            movementType: movement.movement_type,
            variety: movement.variety,
            bags: movement.bags,
            bagSizeKg: movement.bag_size_kg,
            quantityQuintals: movement.quantity_quintals,
            packaging: {
              brandName: movement.packaging_brand || 'A1',
              allottedKg: movement.packaging_kg || 26
            },
            // Add Palti-specific packaging information
            sourcePackaging: movement.movement_type === 'palti' ? {
              brandName: movement.source_packaging_brand || 'A1',
              allottedKg: movement.source_packaging_kg || 26
            } : null,
            targetPackaging: movement.movement_type === 'palti' ? {
              brandName: movement.target_packaging_brand || 'A1',
              allottedKg: movement.target_packaging_kg || 26
            } : null,
            shortageKg: movement.conversion_shortage_kg || 0,
            shortageBags: movement.conversion_shortage_bags || 0,
            from: movement.from_location || (movement.movement_type === 'purchase' ? 'Purchase' : movement.location_code),
            to: movement.to_location || (movement.movement_type === 'sale' ? 'Sale' : movement.location_code),
            locationCode: movement.location_code,
            status: movement.status,
            createdBy: movement.created_by_username,
            approvedBy: movement.approved_by_username,
            // Include admin approval information for bifurcation logic
            adminApprovedBy: movement.admin_approved_by,
            createdByAdmin: movement.created_by_role === 'admin',
            partyName: movement.party_name,
            billNumber: movement.bill_number,
            lorryNumber: movement.lorry_number,
            ratePerBag: movement.rate_per_bag,
            totalAmount: movement.total_amount
          }))
        ];

        console.log('📊 Data before filtering:', {
          productions: productionsResponse.data.productions?.length || 0,
          stockMovements: stockMovements.length,
          combined: allMovements.length
        });

        // Apply filters if they are set (only product type and location - no date range)
        const originalLength = allMovements.length;
        if (riceStockProductType || riceStockLocationCode) {
          console.log('🔍 Applying filters...');
          allMovements = allMovements.filter((movement: any) => {
            // Product type filtering
            if (riceStockProductType && movement.productType !== riceStockProductType) {
              return false;
            }

            // Location filtering
            if (riceStockLocationCode && movement.locationCode !== riceStockLocationCode) {
              return false;
            }

            return true;
          });
          console.log(`📊 Filtered from ${originalLength} to ${allMovements.length} records`);
        } else {
          console.log('📊 No filters applied, showing all records');
        }

        // Sort by date (newest first)
        allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log('✅ Final data summary:', {
          totalRecords: allMovements.length,
          productionRecords: allMovements.filter(m => m.movementType === 'production').length,
          purchaseRecords: allMovements.filter(m => m.movementType === 'purchase').length,
          saleRecords: allMovements.filter(m => m.movementType === 'sale').length,
          paltiRecords: allMovements.filter(m => m.movementType === 'palti').length,
          dateRange: allMovements.length > 0 ? {
            earliest: allMovements[allMovements.length - 1]?.date,
            latest: allMovements[0]?.date
          } : null
        });

        setRiceStockData(allMovements);

        // Fetch rice hamali entries for all movements
        const riceMovementIds = allMovements.map(item => item.id?.toString()).filter(Boolean);
        if (riceMovementIds.length > 0) {
          console.log('🔍 Fetching rice hamali entries for', riceMovementIds.length, 'movements');
          fetchHamaliEntries([], riceMovementIds);
        } else {
          console.log('ℹ️ No movement IDs found for hamali entries');
        }

        // No toast notifications for normal data load to prevent repeated toasts
        // causing page scroll. Only show toast for errors.
      }
    } catch (error: any) {
      console.error('❌ Error fetching rice stock:', error);

      // Handle specific error codes
      if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Invalid filter parameters');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else if (error.response?.status === 404) {
        toast.info('No records found for the selected filters');
        setRiceStockData([]);
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else if (error.response?.status === 503) {
        toast.error('Database connection error. Please try again.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to fetch rice stock data');
      }

      // Set empty data on error
      setRiceStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRiceProductions = async () => {
    try {
      console.log('Fetching all rice productions for paddy stock...');
      const response = await axios.get<{ productions: any[] }>('/rice-productions');
      console.log('All rice productions:', response.data);
      setAllRiceProductions(response.data.productions || []);
    } catch (error: any) {
      console.error('Error fetching rice productions:', error);
    }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await axios.patch(`/arrivals/${id}/approve`, { status });
      setLastToastMessage(''); // Clear last toast
      toast.success(`Record ${status} successfully`);
      fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${status} record`);
    }
  };

  const handleAdminApprove = async (id: number) => {
    try {
      await axios.patch(`/arrivals/${id}/admin-approve`);
      toast.success('Record approved by admin - added to paddy stock');
      fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve record');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this arrival? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/arrivals/${id}`);
      toast.success('Arrival deleted successfully');
      fetchRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete arrival');
    }
  };

  const fetchPendingMovements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/rice-stock-management/movements/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingMovements((response.data as any).data.movements || []);
    } catch (error: any) {
      console.error('Error fetching pending movements:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch pending movements');
      }
    }
  };

  const handleApproveMovement = async (id: number, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/rice-stock-management/movements/${id}/status`, {
        status,
        rejectionReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Movement ${status} successfully`);
      fetchPendingMovements();
      fetchRiceStock(); // Refresh main data
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${status} movement`);
    }
  };

  const handleEdit = (record: Arrival) => {
    setEditingRecord(record);
  };

  const handleEditSuccess = () => {
    fetchRecords();
    setEditingRecord(null);
  };

  const exportCSV = async () => {
    try {
      const params: any = {
        grouping: groupBy // Pass day-wise or week-wise grouping
      };
      if (dateFrom) params.dateFrom = convertDateFormat(dateFrom);
      if (dateTo) params.dateTo = convertDateFormat(dateTo);
      if (activeTab === 'purchase') params.movementType = 'purchase';
      if (activeTab === 'shifting') params.movementType = 'shifting';

      const response = await axios.get('export/csv/arrivals', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `arrivals_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const exportPDF = async () => {
    try {
      const params: any = {
        grouping: groupBy, // Pass day-wise or week-wise grouping
        ...(dateFrom && { dateFrom: convertDateFormat(dateFrom) }),
        ...(dateTo && { dateTo: convertDateFormat(dateTo) })
      };

      // Determine endpoint and filename based on active tab
      let endpoint = 'export/pdf/arrivals';
      let filename = 'arrivals';

      if (activeTab === 'purchase') {
        endpoint = 'export/pdf/purchase';
        filename = 'purchase_records';
      } else if (activeTab === 'shifting') {
        endpoint = 'export/pdf/shifting';
        filename = 'shifting_records';
      } else if (activeTab === 'stock') {
        endpoint = 'export/pdf/stock';
        filename = 'paddy_stock';
      } else if (activeTab === 'outturn-report') {
        if (!selectedOutturnId) {
          toast.error('Please select an Outturn to export');
          return;
        }
        endpoint = `export/pdf/outturn/${selectedOutturnId}`;
        filename = `outturn_report_${outturns.find((o: any) => o.id == selectedOutturnId)?.code || 'report'}`;
      } else if (activeTab === 'rice-outturn-report') {
        endpoint = 'export/pdf/rice-stock-movements';
        filename = 'rice_stock_movements';
        // Use rice stock date filters
        params.dateFrom = riceStockDateFrom;
        params.dateTo = riceStockDateTo;
        if (riceStockProductType) params.productType = riceStockProductType;
      } else if (activeTab === 'rice-stock') {
        endpoint = 'export/pdf/rice-stock';
        filename = 'rice_stock';
        // Use rice stock date filters
        params.dateFrom = riceStockDateFrom;
        params.dateTo = riceStockDateTo;
        if (riceStockProductType) params.productType = riceStockProductType;
        if (riceStockLocationCode) params.locationCode = riceStockLocationCode;
      }

      const response = await axios.get(endpoint, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF exported successfully');
    } catch (error: any) {
      console.error('PDF export error:', error);

      // Enhanced error handling with specific messages
      if (error.response?.status === 413) {
        toast.error('Dataset too large for PDF export. Please apply date filters to reduce the number of records.');
      } else if (error.response?.status === 404) {
        toast.error('No records found for the selected criteria.');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Invalid request parameters.');
      } else if (error.response?.status === 503) {
        toast.error('Database connection error. Please try again in a moment.');
      } else if (error.response?.status === 504) {
        toast.error('Request timeout. Please try with fewer records or a smaller date range.');
      } else {
        toast.error('Failed to export PDF. Please try again or contact support if the issue persists.');
      }
    }
  };

  const canEdit = user?.role === 'manager' || user?.role === 'admin';

  return (
    <Container>
      <Title>📊 Records Management</Title>

      {/* Pending Approvals Alerts */}
      {canEdit && activeTab === 'arrivals' && (pendingCount > 0 || pendingAdminCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Manager Approval Alert */}
          {pendingCount > 0 && (
            <PendingAlert>
              <div className="count">{pendingCount}</div>
              <div className="text">
                ⚠️ Pending Manager Approval{pendingCount > 1 ? 's' : ''} - {pendingCount} arrival{pendingCount > 1 ? 's' : ''} waiting for review
              </div>
            </PendingAlert>
          )}

          {/* Admin Approval Alert */}
          {user?.role === 'admin' && pendingAdminCount > 0 && (
            <PendingAlert style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderColor: '#3b82f6' }}>
              <div className="count" style={{ background: '#3b82f6' }}>{pendingAdminCount}</div>
              <div className="text" style={{ color: '#1e40af' }}>
                🔵 Pending Admin Approval{pendingAdminCount > 1 ? 's' : ''} - {pendingAdminCount} arrival{pendingAdminCount > 1 ? 's' : ''} need final approval for Paddy Stock
              </div>
            </PendingAlert>
          )}
        </div>
      )}

      {/* Tabs */}
      <TabContainer>
        <Tab $active={activeTab === 'arrivals'} onClick={() => handleTabChange('arrivals')}>
          All Arrivals {canEdit && (pendingCount + pendingAdminCount) > 0 && `(${pendingCount + pendingAdminCount})`}
        </Tab>
        <Tab $active={activeTab === 'purchase'} onClick={() => handleTabChange('purchase')}>
          Purchase Records
        </Tab>
        <Tab $active={activeTab === 'shifting'} onClick={() => handleTabChange('shifting')}>
          Shifting Records
        </Tab>
        <Tab $active={activeTab === 'stock'} onClick={() => handleTabChange('stock')}>
          Paddy Stock
        </Tab>
        <Tab $active={activeTab === 'outturn-report'} onClick={() => handleTabChange('outturn-report')}>
          Outturn Report
        </Tab>
        <Tab $active={activeTab === 'rice-outturn-report'} onClick={() => handleTabChange('rice-outturn-report')}>
          Rice Stock Movement
        </Tab>
        <Tab $active={activeTab === 'rice-stock'} onClick={() => handleTabChange('rice-stock')}>
          Rice Stock
        </Tab>
      </TabContainer>

      {/* Filters - Show for ALL tabs */}
      <FilterSection>
        {/* Unified Business Date & Toggle Row */}
        {activeTab !== 'outturn-report' && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: showAllRecords ? '#FEF3C7' : '#D1FAE5',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: showAllRecords ? '2px solid #F59E0B' : '2px solid #10B981'
          }}>
            <div>
              <strong style={{ color: showAllRecords ? '#D97706' : '#059669' }}>
                {showAllRecords ? '📋 Showing All Records' : `📅 Business Date: ${(() => {
                  const businessDate = getBusinessDate();
                  return new Date(businessDate + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                })()}`}
              </strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                {showAllRecords
                  ? 'Viewing all historical records with current filters'
                  : 'Showing only today\'s records (Business day starts at 6 AM)'}
              </p>
            </div>
            <Button
              className={showAllRecords ? 'secondary' : 'primary'}
              onClick={() => {
                setShowAllRecords(!showAllRecords);
                if (!showAllRecords) {
                  // If switching TO "Show All", clear month to avoid conflicts
                  setSelectedMonth('');
                }
              }}
              style={{ minWidth: '150px' }}
            >
              {showAllRecords ? '📅 Today Only' : '📋 Show All'}
            </Button>
          </div>
        )}

        <FilterRow>
          {/* Month Selector for Paddy Stock / Overview / Rice Stock */}
          {(activeTab === 'stock' || activeTab === 'arrivals' || activeTab === 'purchase' || activeTab === 'shifting' || activeTab === 'rice-stock' || activeTab === 'rice-outturn-report') && (
            <FormGroup>
              <Label>Month Filter</Label>
              <Select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  if (e.target.value) setShowAllRecords(false); // Month filter takes precedence over "Show All"
                }}
                disabled={availableMonths.length === 0}
              >
                <option value="">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.month_label}
                  </option>
                ))}
              </Select>
            </FormGroup>
          )}

          {/* Date Range - Only show for non-rice tabs (rice tabs use month filter only) */}
          {activeTab !== 'rice-stock' && activeTab !== 'rice-outturn-report' && (
            <>
              <FormGroup>
                <Label>Date From</Label>
                <Input
                  type="text"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
              </FormGroup>

              <FormGroup>
                <Label>Date To</Label>
                <Input
                  type="text"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
              </FormGroup>
            </>
          )}

          {/* Rice Specific Filters */}
          {(activeTab === 'rice-stock' || activeTab === 'rice-outturn-report') && (
            <>
              <FormGroup>
                <Label>Product Type</Label>
                <Select
                  value={riceStockProductType}
                  onChange={(e) => setRiceStockProductType(e.target.value)}
                >
                  <option value="">All Products</option>
                  <option value="Rice">Rice</option>
                  <option value="Bran">Bran</option>
                  <option value="Farm Bran">Farm Bran</option>
                  <option value="Rejection Rice">Rejection Rice</option>
                  <option value="Sizer Broken">Sizer Broken</option>
                  <option value="Rejection Broken">Rejection Broken</option>
                  <option value="Broken">Broken</option>
                  <option value="Zero Broken">Zero Broken</option>
                  <option value="Faram">Faram</option>
                  <option value="Unpolished">Unpolished</option>
                  <option value="RJ Rice 1">RJ Rice 1</option>
                  <option value="RJ Rice 2">RJ Rice 2</option>
                </Select>
              </FormGroup>

              {activeTab === 'rice-stock' && (
                <FormGroup>
                  <Label>Location</Label>
                  <Select
                    value={riceStockLocationCode}
                    onChange={(e) => setRiceStockLocationCode(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {riceStockLocations.map((loc: any) => (
                      <option key={loc.code} value={loc.code}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              )}
            </>
          )}

          {/* Grouping Selector */}
          {(activeTab === 'arrivals' || activeTab === 'purchase' || activeTab === 'shifting' || activeTab === 'stock' || activeTab === 'rice-outturn-report') && (
            <FormGroup>
              <Label>Report Grouping</Label>
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'week' | 'date')}
              >
                <option value="date">📅 Daily View</option>
                <option value="week">📅 Weekly View</option>
              </Select>
            </FormGroup>
          )}

          {/* Search */}
          <FormGroup>
            <Label>Search</Label>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SL No, WB No, Lorry..."
            />
          </FormGroup>

          {/* Actions Row */}
          <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
            <Button className="primary" onClick={fetchRecords} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Search
            </Button>

            <Button className="secondary" onClick={() => {
              if (activeTab === 'rice-stock' || activeTab === 'rice-outturn-report') {
                setRiceStockDateFrom('');
                setRiceStockDateTo('');
                setRiceStockProductType('');
                setRiceStockLocationCode('');
              } else {
                setDateFrom('');
                setDateTo('');
                setSearch('');
                setSelectedMonth('');
                setShowAllRecords(false);
              }
              fetchRecords();
            }}>
              🔄 Reset
            </Button>

            <div style={{ flex: 1 }} />

            <Button className="success" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📄 Export CSV
            </Button>

            {/* Professional PDF Download Buttons */}
            <PDFButton
              onClick={() => {
                const allRecords = Object.values(records).flat();
                if (allRecords.length === 0) {
                  toast.error('No records to export');
                  return;
                }

                const dateRangeText = dateFrom && dateTo
                  ? `${dateFrom} to ${dateTo}`
                  : selectedMonth
                    ? availableMonths.find(m => m.month === selectedMonth)?.month_label || selectedMonth
                    : 'All Records';

                try {
                  if (activeTab === 'arrivals') {
                    generateArrivalsPDF(allRecords, {
                      title: 'All Arrivals Report',
                      dateRange: dateRangeText,
                      filterType: 'all'
                    });
                  } else if (activeTab === 'purchase') {
                    generatePurchasePDF(allRecords, {
                      title: 'Purchase Records Report',
                      dateRange: dateRangeText,
                      filterType: 'all'
                    });
                  } else if (activeTab === 'shifting') {
                    generateShiftingPDF(allRecords, {
                      title: 'Shifting Records Report',
                      dateRange: dateRangeText,
                      filterType: 'all'
                    });
                  } else if (activeTab === 'rice-outturn-report') {
                    generateRiceMovementsPDF(riceStockData, {
                      title: 'Rice Stock Movement Report',
                      dateRange: `${riceStockDateFrom || 'Start'} to ${riceStockDateTo || 'End'}`,
                      filterType: 'all'
                    });
                  } else if (activeTab === 'rice-stock') {
                    generateRiceStockPDF(riceStockData, {
                      title: 'Rice Stock Report',
                      dateRange: `${riceStockDateFrom || 'Start'} to ${riceStockDateTo || 'End'}`,
                      filterType: 'all'
                    });
                  } else if (activeTab === 'stock') {
                    generatePaddyStockPDF(allRecords, {
                      title: 'Paddy Stock Report',
                      dateRange: dateRangeText,
                      filterType: 'all'
                    });
                  }
                  toast.success('PDF downloaded successfully!');
                } catch (error) {
                  console.error('PDF generation error:', error);
                  toast.error('Failed to generate PDF. Please try again.');
                }
              }}
              title="Download PDF of all visible records"
            >
              📑 All PDF
            </PDFButton>

            <PDFButton
              $variant="filtered"
              onClick={() => {
                const allRecords = Object.values(records).flat();
                if (allRecords.length === 0) {
                  toast.error('No records to export');
                  return;
                }

                // Determine filter type based on groupBy and current selection
                const filterType = groupBy === 'week' ? 'week' : (selectedMonth ? 'month' : 'day');
                const dateRangeText = dateFrom && dateTo
                  ? `${dateFrom} to ${dateTo}`
                  : selectedMonth
                    ? availableMonths.find(m => m.month === selectedMonth)?.month_label || selectedMonth
                    : groupBy === 'week' ? 'Weekly View' : 'Daily View';

                try {
                  if (activeTab === 'arrivals') {
                    generateArrivalsPDF(allRecords, {
                      title: 'All Arrivals Report',
                      subtitle: `Grouped by ${filterType}`,
                      dateRange: dateRangeText,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  } else if (activeTab === 'purchase') {
                    generatePurchasePDF(allRecords, {
                      title: 'Purchase Records Report',
                      subtitle: `Grouped by ${filterType}`,
                      dateRange: dateRangeText,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  } else if (activeTab === 'shifting') {
                    generateShiftingPDF(allRecords, {
                      title: 'Shifting Records Report',
                      subtitle: `Grouped by ${filterType}`,
                      dateRange: dateRangeText,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  } else if (activeTab === 'rice-outturn-report') {
                    generateRiceMovementsPDF(riceStockData, {
                      title: 'Rice Stock Movement Report',
                      subtitle: `Filtered View`,
                      dateRange: `${riceStockDateFrom || 'Start'} to ${riceStockDateTo || 'End'}`,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  } else if (activeTab === 'rice-stock') {
                    generateRiceStockPDF(riceStockData, {
                      title: 'Rice Stock Report',
                      subtitle: `Filtered View`,
                      dateRange: `${riceStockDateFrom || 'Start'} to ${riceStockDateTo || 'End'}`,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  } else if (activeTab === 'stock') {
                    generatePaddyStockPDF(allRecords, {
                      title: 'Paddy Stock Report',
                      subtitle: `Grouped by ${filterType}`,
                      dateRange: dateRangeText,
                      filterType: filterType as 'day' | 'week' | 'month'
                    });
                  }
                  toast.success(`${filterType} PDF downloaded successfully!`);
                } catch (error) {
                  console.error('PDF generation error:', error);
                  toast.error('Failed to generate PDF. Please try again.');
                }
              }}
              title={`Download PDF grouped by ${groupBy === 'week' ? 'week' : selectedMonth ? 'month' : 'day'}`}
            >
              📅 {groupBy === 'week' ? 'Week' : selectedMonth ? 'Month' : 'Day'} PDF
            </PDFButton>
          </div>
        </FilterRow>
      </FilterSection>

      {/* Current Month View Indicator */}
      {selectedMonth && activeTab !== 'rice-outturn-report' && activeTab !== 'rice-stock' && (
        <div style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
          border: '2px solid #3b82f6'
        }}>
          <div>
            <div style={{ color: '#1e40af', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              📅 Month-wise View: {availableMonths.find(m => m.month === selectedMonth)?.month_label}
            </div>
            <div style={{ color: '#1e3a8a', fontSize: '0.9rem' }}>
              Showing all records for this month • {Object.keys(records).length} days • {Object.values(records).flat().length} total records
            </div>
          </div>
          <Button
            className="secondary"
            onClick={() => setSelectedMonth('')}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
            aria-label="Clear month filter and return to date range view"
          >
            ✕ Clear
          </Button>
        </div>
      )}

      {/* Records Display */}
      {loading ? (
        <EmptyState>
          <div className="spinner"></div>
          <p>Loading records...</p>
        </EmptyState>
      ) : activeTab === 'rice-outturn-report' ? (
        /* Rice Stock Movement View - Enhanced with Purchase/Sale */
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontWeight: 'bold' }}>🍚 Rice Stock Movement</h2>
          </div>

          {/* Search Input */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              type="text"
              placeholder="Search by outturn number, product type, or location..."
              value={riceReportSearch}
              onChange={(e) => setRiceReportSearch(e.target.value)}
              style={{ maxWidth: '400px' }}
            />

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '8px',
              border: '1px solid #0ea5e9'
            }}>
              <button
                onClick={() => setRiceStockPage(Math.max(1, riceStockPage - 1))}
                disabled={riceStockPage <= 1}
                style={{
                  padding: '0.5rem 1rem',
                  background: riceStockPage <= 1 ? '#e5e7eb' : '#3b82f6',
                  color: riceStockPage <= 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: riceStockPage <= 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ← Prev
              </button>
              <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
                Page {riceStockPage} of {riceStockTotalPages}
              </span>
              <button
                onClick={() => setRiceStockPage(Math.min(riceStockTotalPages, riceStockPage + 1))}
                disabled={riceStockPage >= riceStockTotalPages}
                style={{
                  padding: '0.5rem 1rem',
                  background: riceStockPage >= riceStockTotalPages ? '#e5e7eb' : '#3b82f6',
                  color: riceStockPage >= riceStockTotalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: riceStockPage >= riceStockTotalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Next →
              </button>
              <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>
                ({riceStockTotalRecords.toLocaleString()} total records)
              </span>
            </div>
          </div>

          {riceStockData.length === 0 ? (
            <EmptyState>
              <p>No rice stock entries found</p>
            </EmptyState>
          ) : (
            <ExcelTable>
              <thead>
                <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                  <th>Sl No</th>
                  <th>Date</th>
                  <th>Mvmt Type</th>
                  <th>Bill Number</th>
                  <th>Variety</th>
                  <th>Product Type</th>
                  <th>Bags</th>
                  <th>Bag Size</th>
                  <th>QTL'S</th>
                  <th>Packaging</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Lorry Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {riceStockData
                  .filter((item: any) => {
                    // Exclude CLEARING entries
                    if (item.locationCode === 'CLEARING') return false;

                    if (!riceReportSearch) return true;
                    const searchLower = riceReportSearch.toLowerCase();
                    return (
                      item.outturn?.code?.toLowerCase().includes(searchLower) ||
                      item.billNumber?.toLowerCase().includes(searchLower) ||
                      item.locationCode?.toLowerCase().includes(searchLower) ||
                      item.lorryNumber?.toLowerCase().includes(searchLower) ||
                      item.partyName?.toLowerCase().includes(searchLower) ||
                      item.variety?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map((item: any, idx: number) => {
                    // Determine row color based on movement type
                    let rowColor = 'white';
                    if (item.movementType === 'purchase') {
                      rowColor = '#d1fae5'; // Light green for purchases
                    } else if (item.movementType === 'sale') {
                      rowColor = '#fee2e2'; // Light red for sales
                    } else if (item.movementType === 'palti') {
                      rowColor = '#fef3c7'; // Light yellow for palti
                    } else if (idx % 2 === 0) {
                      rowColor = '#f9fafb'; // Alternate for production
                    }

                    return (
                      <tr key={item.id} style={{ backgroundColor: rowColor }}>
                        <td>{idx + 1}</td>
                        <td>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                        <td style={{
                          textTransform: 'capitalize',
                          fontWeight: item.movementType !== 'production' ? 'bold' : 'normal',
                          color: item.movementType === 'purchase' ? '#059669' :
                            item.movementType === 'sale' ? '#dc2626' :
                              item.movementType === 'palti' ? '#f59e0b' : 'inherit'
                        }}>
                          {item.movementType === 'production' ? '🏭 Production' :
                            item.movementType === 'purchase' ? '📦 Purchase' :
                              item.movementType === 'sale' ? '💰 Sale' :
                                item.movementType === 'palti' ? '🔄 Palti' : item.movementType}
                          {item.movementType === 'palti' && (Number(item.shortageKg) > 0 || Number(item.conversion_shortage_kg) > 0) && (
                            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 'bold' }}>
                              ⚠️ Shortage: {Number(item.shortageKg || item.conversion_shortage_kg || 0).toFixed(2)}kg
                            </div>
                          )}
                        </td>
                        <td>{item.billNumber || '-'}</td>
                        <td>{item.variety || 'Sum25 RNR Raw'}</td>
                        <td>{(() => {
                          // Determine product type from the item data
                          const productType = item.productType || item.product || '';
                          const productLower = productType.toLowerCase();

                          if (productLower.includes('rejection rice')) return 'Rejection Rice';
                          if (productLower.includes('unpolish')) return 'Unpolished';
                          if (productLower.includes('faram')) return 'Faram';
                          if (productLower.includes('zero broken') || productLower.includes('0 broken')) return 'Zero Broken';
                          if (productLower.includes('sizer broken')) return 'Sizer Broken';
                          if (productLower.includes('rejection broken')) return 'Sizer Broken';
                          if (productLower.includes('rj rice 1')) return 'RJ Rice 1';
                          if (productLower.includes('rj rice 2') || productLower.includes('rj rice (2)')) return 'RJ Rice 2';
                          if (productLower.includes('rj broken')) return 'RJ Broken';
                          if (productLower.includes('broken')) return 'Broken';
                          if (productLower.includes('rice')) return 'Rice';
                          if (productLower.includes('bran')) return 'Bran';

                          return productType || 'Rice'; // Default to Rice if no product type
                        })()}</td>
                        <td>{item.bags}</td>
                        <td>{item.bagSizeKg || item.packaging?.allottedKg || 26}</td>
                        <td>{Number(item.quantityQuintals).toFixed(2)}</td>
                        <td>{(() => {
                          // Handle Palti packaging display: show "source → target"
                          if (item.movementType === 'palti') {
                            // FIXED: Use server-provided packaging data with proper fallbacks
                            const sourcePackaging = item.source_packaging_brand || item.sourcePackaging?.brandName || 'A1';
                            const targetPackaging = item.target_packaging_brand || item.targetPackaging?.brandName || 'A1';

                            console.log('🔍 DEBUG - Palti packaging data:', {
                              'item.source_packaging_brand': item.source_packaging_brand,
                              'item.target_packaging_brand': item.target_packaging_brand,
                              'item.sourcePackaging': item.sourcePackaging,
                              'item.targetPackaging': item.targetPackaging,
                              'FINAL_RESULT': `${sourcePackaging} → ${targetPackaging}`
                            });

                            return `${sourcePackaging} → ${targetPackaging}`;
                          }

                          // For other movement types, show regular packaging
                          const packaging = item.packaging_brand || item.packaging?.brandName || 'A1';

                          return packaging;
                        })()}</td>
                        <td>
                          {item.outturn?.code ? (
                            <span
                              style={{
                                color: '#7c3aed',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              onClick={() => navigateToOutturn(item.outturn.code)}
                              title={`Click to view outturn ${item.outturn.code}`}
                            >
                              {item.from || item.outturn.code}
                            </span>
                          ) : (
                            item.from || '-'
                          )}
                        </td>
                        <td>{item.to || item.locationCode || '-'}</td>
                        <td>{item.lorryNumber || item.billNumber || '-'}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            backgroundColor: item.status === 'approved' ? '#dcfce7' : '#fef3c7',
                            color: item.status === 'approved' ? '#16a34a' : '#ca8a04'
                          }}>
                            {item.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td>{item.creator?.username}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {/* Approve Button for Pending Items */}
                            {item.status === 'pending' && user?.role !== 'staff' && (
                              <button
                                onClick={async () => {
                                  try {
                                    console.log('🔍 Approve clicked for item:', {
                                      id: item.id,
                                      movementType: item.movementType,
                                      status: item.status,
                                      idType: typeof item.id,
                                      isStockMovement: String(item.id).includes('movement-')
                                    });

                                    // Check if this is a stock movement (Purchase/Sale/Palti)
                                    // Stock movements have IDs like "movement-123"
                                    const isStockMovement = String(item.id).includes('movement-') ||
                                      ['purchase', 'sale', 'palti'].includes(item.movementType?.toLowerCase());

                                    if (!isStockMovement) {
                                      // Production entries
                                      await axios.post(`/rice-productions/${item.id}/approve`);
                                      toast.success('Rice production approved successfully!');
                                    } else {
                                      // Purchase, Sale, Palti use rice-stock-management
                                      const token = localStorage.getItem('token');
                                      // Extract numeric ID from movement-{id} format if needed
                                      const movementId = String(item.id).replace('movement-', '');
                                      console.log('🔄 Calling rice-stock-management approval for ID:', movementId);
                                      await axios.patch(`/rice-stock-management/movements/${movementId}/status`, {
                                        status: 'approved'
                                      }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      toast.success(`${item.movementType || 'Movement'} approved successfully!`);
                                    }
                                    fetchProductionRecords();
                                    fetchRiceStock();
                                  } catch (error: any) {
                                    console.error('❌ Approval error:', error.response?.data || error);
                                    toast.error(error.response?.data?.error || 'Failed to approve');
                                  }
                                }}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                Approve
                              </button>
                            )}

                            {/* Rice Hamali Button - Show for ALL approved entries */}
                            {item.status === 'approved' && (
                              <button
                                onClick={() => {
                                  const riceHamaliId = item.id?.toString();
                                  console.log('🔍 Rice Hamali button clicked for:', {
                                    id: item.id,
                                    movementType: item.movementType,
                                    riceHamaliId
                                  });

                                  if (expandedRiceHamaliRecordId === riceHamaliId) {
                                    setExpandedRiceHamaliRecordId(null);
                                  } else {
                                    setExpandedRiceHamaliRecordId(riceHamaliId);
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: (riceHamaliEntries[item.id] && Array.isArray(riceHamaliEntries[item.id]) && riceHamaliEntries[item.id].length > 0) ? '#059669' : '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold'
                                }}
                                title={(riceHamaliEntries[item.id] && Array.isArray(riceHamaliEntries[item.id]) && riceHamaliEntries[item.id].length > 0) ? "View Rice Hamali" : "Add Rice Hamali"}
                              >
                                {(riceHamaliEntries[item.id] && Array.isArray(riceHamaliEntries[item.id]) && riceHamaliEntries[item.id].length > 0) ? '✓' : '+'} 🍚 Hamali
                              </button>
                            )}

                            {/* Hamali Status Indicator */}
                            {riceHamaliEntries[item.id] && riceHamaliEntries[item.id].length > 0 && (
                              <span
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#dcfce7',
                                  color: '#16a34a',
                                  borderRadius: '12px',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold'
                                }}
                                title={`${riceHamaliEntries[item.id].length} rice hamali entries`}
                              >
                                ✓ {riceHamaliEntries[item.id].length}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </ExcelTable>
          )}

          {/* Rice Hamali Form Rendering */}
          {expandedRiceHamaliRecordId && (
            <div style={{
              marginTop: '1rem',
              border: '3px solid #10b981',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              {(() => {
                // Find the selected rice production/movement
                const selectedItem = riceStockData.find((item: any) =>
                  item.id?.toString() === expandedRiceHamaliRecordId
                );

                if (!selectedItem) {
                  console.error('🔍 Selected rice item not found for ID:', expandedRiceHamaliRecordId);
                  return (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#dc2626' }}>
                      Selected rice production not found
                    </div>
                  );
                }

                console.log('🔍 Rendering InlineRiceHamaliForm for:', {
                  id: selectedItem.id,
                  movementType: selectedItem.movementType,
                  productType: selectedItem.productType,
                  bags: selectedItem.bags
                });

                return (
                  <InlineRiceHamaliForm
                    riceProduction={{
                      id: selectedItem.id,
                      date: selectedItem.date,
                      productType: selectedItem.productType || selectedItem.product || 'Rice',
                      bags: selectedItem.bags || 0,
                      quantityQuintals: selectedItem.quantityQuintals || 0,
                      movementType: selectedItem.movementType || 'production',
                      locationCode: selectedItem.locationCode || selectedItem.to,
                      variety: selectedItem.variety,
                      outturn: selectedItem.outturn,
                      packaging: selectedItem.packaging
                    }}
                    onClose={() => setExpandedRiceHamaliRecordId(null)}
                    onSave={() => {
                      fetchRiceStock();
                      fetchHamaliEntries([], [expandedRiceHamaliRecordId!]);
                      setExpandedRiceHamaliRecordId(null);
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>
      ) : activeTab === 'rice-stock' ? (
        <Container>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            position: 'sticky',
            top: '0',
            backgroundColor: '#ffffff',
            zIndex: 100,
            padding: '1rem 0',
            borderBottom: '2px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: 0, fontWeight: 'bold' }}>🍚 Rice Stock</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {user?.role !== 'staff' && (
                <Button
                  className="secondary"
                  onClick={() => {
                    fetchPendingMovements();
                    setShowPendingMovements(!showPendingMovements);
                  }}
                >
                  {showPendingMovements ? 'Hide' : 'Show'} Pending ({pendingMovements.length})
                </Button>
              )}
              <Button
                className="success"
                onClick={() => setShowPurchaseModal(true)}
                style={{
                  fontWeight: 'bold',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem'
                }}
              >
                📦 Purchase
              </Button>
              <Button
                className="danger"
                onClick={() => setShowSaleModal(true)}
                style={{
                  fontWeight: 'bold',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem'
                }}
              >
                💰 Sale
              </Button>
              <Button
                className="primary"
                onClick={() => setShowPaltiModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem'
                }}
              >
                🔄 Palti
              </Button>
            </div>
          </div>

          {/* Pending Movements Section */}
          {showPendingMovements && pendingMovements.length > 0 && (
            <div style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>⏳ Pending Approvals</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {pendingMovements.map((movement: any) => (
                  <div key={movement.id} style={{
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{movement.movement_type.toUpperCase()}</strong> - {movement.bags} bags × {movement.packaging_brand}
                      {movement.movement_type === 'palti' && Number(movement.conversion_shortage_kg) > 0 && (
                        <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                          {' '}(Shortage: {Number(movement.conversion_shortage_kg).toFixed(2)}kg)
                        </span>
                      )}
                      <br />
                      <small style={{ color: '#6b7280' }}>
                        {new Date(movement.date).toLocaleDateString('en-GB')} • {movement.created_by_username} • {movement.location_code}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveMovement(movement.id, 'approved')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          handleApproveMovement(movement.id, 'rejected', reason || undefined);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <EmptyState>
              <p>Loading rice stock data...</p>
            </EmptyState>
          ) : riceStockData.length === 0 ? (
            <EmptyState>
              <p>No rice stock entries found</p>
            </EmptyState>
          ) : (() => {
            // Debug: Log the raw data to understand its structure
            console.log('🔍 DEBUG - Raw riceStockData:', riceStockData);

            // Process the raw data to create daily summaries with proper stock calculation
            const processRiceStockData = (rawData: any[]) => {
              console.log('🔍 DEBUG - processRiceStockData received:', rawData.length, 'items');
              const paltiItems = rawData.filter(item => item.movementType === 'palti' || item.productType === 'Palti');
              console.log('🔍 DEBUG - Palti items in rawData:', paltiItems);
              console.log('🔍 DEBUG - Sample palti item structure:', paltiItems[0]);
              const dailyData: { [date: string]: any } = {};

              // Initialize stock tracking for different product types (removed separate Palti category)
              const productTypes = ['Rice', 'Bran', 'RJ Rice (2)', 'Sizer Broken', 'RJ Rice 1', 'Broken', '0 Broken', 'Faram', 'Unpolish', 'Other'];

              // Sort data by date first (oldest first for proper stock calculation)
              const sortedData = rawData.sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              // Group movements by date first
              sortedData.forEach((item: any) => {
                const date = item.date;
                if (!dailyData[date]) {
                  dailyData[date] = {
                    date,
                    openingStock: [],
                    productions: [],
                    openingStockTotal: 0,
                    closingStockTotal: 0
                  };
                }

                const productType = item.productType || item.product || 'Rice';
                const qtls = Number(item.quantityQuintals || item.qtls || 0);
                const bags = Number(item.bags || 0);

                // Determine product category
                let category = 'Other';

                // Use the actual product type instead of creating separate Palti category
                if (productType === 'Rice') {
                  category = 'Rice';
                } else if (productType === 'Bran') {
                  category = 'Bran';
                } else {
                  const productLower = productType.toLowerCase();
                  if (productLower.includes('unpolish')) {
                    category = 'Unpolish';
                  } else if (productLower.includes('faram')) {
                    category = 'Faram';
                  } else if (productLower.includes('zero broken') || productLower.includes('0 broken')) {
                    category = '0 Broken';
                  } else if (productLower.includes('sizer broken')) {
                    category = 'Sizer Broken';
                  } else if (productLower.includes('rejection broken')) {
                    category = 'Sizer Broken';
                  } else if (productLower.includes('rj rice 1')) {
                    category = 'RJ Rice 1';
                  } else if (productLower.includes('rj rice 2') || productLower.includes('rj rice (2)')) {
                    category = 'RJ Rice (2)';
                  } else if (productLower.includes('rj broken')) {
                    category = 'RJ Broken';
                  } else if (productLower.includes('broken')) {
                    category = 'Broken';
                  } else if (productLower.includes('rice') || productLower.includes('rj rice')) {
                    category = 'Rice';
                  } else if (productLower.includes('bran')) {
                    category = 'Bran';
                  }
                }

                // Add movement to daily data
                dailyData[date].productions.push({
                  id: item.id,
                  qtls: Math.abs(Number(qtls)), // Always show positive values for display
                  bags: Math.abs(Number(bags)),
                  bagSizeKg: Number(item.bagSizeKg || item.bag_size_kg || 26),
                  product: productType,
                  variety: item.variety || item.outturn?.allottedVariety || 'Sum25 RNR Raw',
                  packaging: (() => {
                    // Handle Palti movements with source → target format
                    if ((item.movementType || item.movement_type) === 'palti') {
                      const sourcePackaging = item.sourcePackaging?.brandName || item.source_packaging_brand || 'A1';
                      const targetPackaging = item.targetPackaging?.brandName || item.target_packaging_brand || 'A1';

                      // Debug logging for Palti packaging
                      console.log('🔍 DEBUG - Palti packaging extraction:', {
                        id: item.id,
                        sourcePackaging,
                        targetPackaging,
                        'item.sourcePackaging': item.sourcePackaging,
                        'item.targetPackaging': item.targetPackaging,
                        'item.source_packaging_brand': item.source_packaging_brand,
                        'item.target_packaging_brand': item.target_packaging_brand,
                        'FINAL_RESULT': `${sourcePackaging} → ${targetPackaging}`
                      });

                      return `${sourcePackaging} → ${targetPackaging}`;
                    }

                    // Handle regular movements
                    if (typeof item.packaging === 'object' && item.packaging !== null) {
                      return item.packaging.brandName || item.packaging.code || '';
                    }
                    return item.packaging || item.packaging_brand || '';
                  })(),
                  location: item.locationCode || item.location || '',
                  billNumber: item.billNumber || item.bill_number || '',
                  lorryNumber: item.lorryNumber || item.lorry_number || '',
                  outturn: item.outturn || '',
                  outturnId: item.outturnId || item.outturn_id,
                  movementType: item.movementType || item.movement_type || 'production',
                  category: category,
                  actualQtls: qtls, // Keep original value for stock calculation
                  isPositive: qtls >= 0, // Track if this adds or subtracts stock
                  // Add Raw/Steam indicator for production
                  processType: (item.movementType || item.movement_type || 'production').toLowerCase() === 'production' ? 'Raw' : null,
                  // Add palti-specific fields
                  shortageKg: item.shortageKg || item.conversion_shortage_kg || 0,
                  shortageBags: item.shortageBags || item.conversion_shortage_bags || 0,
                  sourcePackaging: item.source_packaging_brand ? {
                    brandName: item.source_packaging_brand,
                    allottedKg: item.source_packaging_kg || 26
                  } : null,
                  targetPackaging: item.target_packaging_brand ? {
                    brandName: item.target_packaging_brand,
                    allottedKg: item.target_packaging_kg || 26
                  } : null
                });
              });

              // Calculate running stock with proper continuation by variety + location + product + packaging
              const runningStockDetailed: { [key: string]: number } = {};
              const runningStockByType: { [productType: string]: number } = {};

              // Initialize running stock by product type
              productTypes.forEach(type => {
                runningStockByType[type] = 0;
              });

              // Helper function to create stock key
              const createStockKey = (variety: string, location: string, product: string, packaging: string) => {
                return `${variety}|${location}|${product}|${packaging}`;
              };

              // Process each day in chronological order
              const sortedDates = Object.keys(dailyData).sort((a, b) =>
                new Date(a).getTime() - new Date(b).getTime()
              );

              sortedDates.forEach((date, dateIndex) => {
                const dayData = dailyData[date];

                // Set opening stock for this day (yesterday's closing becomes today's opening)
                const openingStockByType: { [type: string]: number } = {};
                productTypes.forEach(type => {
                  openingStockByType[type] = runningStockByType[type];
                });

                // Calculate movements for this day by detailed tracking
                const movementsByType: { [type: string]: number } = {};
                productTypes.forEach(type => {
                  movementsByType[type] = 0;
                });

                dayData.productions.forEach((prod: any) => {
                  const category = prod.category;
                  const movementType = (prod.movementType || '').toLowerCase();
                  const variety = prod.variety || 'Unknown';
                  const location = prod.location || prod.locationCode || 'Unknown';
                  const packaging = prod.packaging || 'Unknown';

                  // Create detailed stock key
                  const stockKey = createStockKey(variety, location, category, packaging);

                  // Initialize if not exists
                  if (!runningStockDetailed[stockKey]) {
                    runningStockDetailed[stockKey] = 0;
                  }

                  let qtlsChange = prod.actualQtls;

                  // Handle different movement types
                  if (movementType === 'sale') {
                    // Sales subtract from stock
                    qtlsChange = -Math.abs(qtlsChange);
                  } else if (movementType === 'palti') {
                    // Palti: convert from source packaging to target packaging
                    if (prod.sourcePackaging && prod.packaging) {
                      // Calculate source quantity (reverse calculation from target)
                      const sourceKgPerBag = prod.sourcePackaging.allottedKg || 26;
                      const targetKgPerBag = prod.bagSizeKg || 26;
                      const targetBags = prod.bags || 0;
                      const sourceBags = Math.ceil((targetBags * targetKgPerBag) / sourceKgPerBag);
                      const sourceQtls = (sourceBags * sourceKgPerBag) / 100;

                      // Subtract from source packaging
                      const sourceKey = createStockKey(variety, location, category, prod.sourcePackaging.brandName || 'Unknown');
                      if (!runningStockDetailed[sourceKey]) {
                        runningStockDetailed[sourceKey] = 0;
                      }
                      runningStockDetailed[sourceKey] -= sourceQtls;

                      // Add to target packaging (with shortage accounted for)
                      qtlsChange = Math.abs(qtlsChange); // Target quantity (already calculated with shortage)

                      console.log('🔍 DEBUG - Palti conversion:', {
                        sourceKey,
                        targetKey: stockKey,
                        sourceBags,
                        sourceQtls,
                        targetBags,
                        targetQtls: qtlsChange,
                        shortageKg: prod.shortageKg || 0
                      });
                    }
                  } else {
                    // Production and Purchase add to stock
                    qtlsChange = Math.abs(qtlsChange);
                  }

                  // Update detailed stock
                  runningStockDetailed[stockKey] += qtlsChange;

                  // Update category totals
                  movementsByType[category] += qtlsChange;

                  console.log('🔍 DEBUG - Stock update:', {
                    date,
                    stockKey,
                    movementType,
                    qtlsChange,
                    newBalance: runningStockDetailed[stockKey]
                  });
                });

                // Update running stock by type and calculate closing stock
                const closingStockByType: { [type: string]: number } = {};
                productTypes.forEach(type => {
                  runningStockByType[type] += movementsByType[type];
                  closingStockByType[type] = runningStockByType[type];
                });

                // Add yesterday's bifurcation and opening stock entries for display
                dayData.openingStock = [];
                dayData.yesterdayBifurcation = [];

                // Get yesterday's data for bifurcation + same-day admin entries
                const yesterdayDate = new Date(date);
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];
                const yesterdayData = dailyData[yesterdayDateStr];
                const todayData = dailyData[date];

                // Show yesterday's data + same-day admin-approved entries in bifurcation
                const bifurcationSources = [];

                // Add yesterday's data
                if (yesterdayData && yesterdayData.productions) {
                  bifurcationSources.push(...yesterdayData.productions);
                }

                // Add same-day admin-approved entries (entries created by admin appear immediately)
                if (todayData && todayData.productions) {
                  const adminEntries = todayData.productions.filter((movement: any) => {
                    // Check if entry was created/approved by admin (should appear same day)
                    return movement.adminApprovedBy || movement.createdByAdmin;
                  });
                  bifurcationSources.push(...adminEntries);
                }

                if (bifurcationSources.length > 0) {
                  // Group yesterday's movements by variety + location + product + packaging + movement type
                  const bifurcationGroups: { [key: string]: any } = {};

                  // Process bifurcation sources (yesterday + same-day admin entries)
                  bifurcationSources.forEach((movement: any) => {
                    const variety = movement.variety || 'Unknown';
                    const location = movement.location || movement.locationCode || 'Unknown';
                    const product = movement.category || movement.product || 'Unknown';
                    const packaging = movement.packaging?.brandName || movement.packaging || 'Unknown';
                    const movementType = movement.movementType || 'production';

                    // Create bifurcation key: variety + location + product + packaging (without movementType for grouping)
                    const bifurcationKey = `${variety}-${location}-${product}-${packaging}`;

                    if (!bifurcationGroups[bifurcationKey]) {
                      bifurcationGroups[bifurcationKey] = {
                        product: product,
                        variety: variety,
                        packaging: packaging,
                        category: product,
                        location: location,
                        qtls: 0,
                        bags: 0,
                        bagSizeKg: movement.bagSizeKg || 26,
                        outturn: movement.outturn,
                        movementTypes: [], // Track all movement types in this group
                        processType: movement.processType,
                        shortageKg: 0,
                        shortageBags: 0,
                        sourcePackaging: null,
                        targetPackaging: null,
                        count: 0,
                        isPalti: false
                      };
                    }

                    // Track movement types
                    if (!bifurcationGroups[bifurcationKey].movementTypes.includes(movementType)) {
                      bifurcationGroups[bifurcationKey].movementTypes.push(movementType);
                    }

                    // Accumulate quantities (considering movement type effects)
                    let qtlsToAdd = Math.abs(movement.qtls || 0);
                    let bagsToAdd = Math.abs(movement.bags || 0);

                    // Sales subtract from stock in bifurcation
                    if (movementType === 'sale') {
                      qtlsToAdd = -qtlsToAdd;
                      bagsToAdd = -bagsToAdd;
                    }

                    bifurcationGroups[bifurcationKey].qtls += qtlsToAdd;
                    bifurcationGroups[bifurcationKey].bags += bagsToAdd;
                    bifurcationGroups[bifurcationKey].count += 1;

                    // Handle palti-specific information
                    if (movementType === 'palti') {
                      bifurcationGroups[bifurcationKey].isPalti = true;
                      bifurcationGroups[bifurcationKey].shortageKg += movement.shortageKg || 0;
                      bifurcationGroups[bifurcationKey].shortageBags += movement.shortageBags || 0;

                      if (movement.sourcePackaging && movement.packaging) {
                        bifurcationGroups[bifurcationKey].sourcePackaging = movement.sourcePackaging.brandName || 'A1';
                        bifurcationGroups[bifurcationKey].targetPackaging = movement.targetPackaging?.brandName || 'A1';
                        bifurcationGroups[bifurcationKey].packaging = `${movement.sourcePackaging.brandName || 'A1'} → ${movement.targetPackaging?.brandName || 'A1'}`;
                      }
                    }
                  });

                  // Also check for pending palti movements from yesterday + same-day to show as shortage
                  const pendingPalti = rawData.filter((movement: any) => {
                    const movementDate = new Date(movement.date).toISOString().split('T')[0];
                    return (movementDate === yesterdayDateStr || movementDate === date) &&
                      movement.movementType === 'palti' &&
                      movement.status === 'pending';
                  });

                  // Add pending palti shortages as separate bifurcation entries
                  pendingPalti.forEach((palti: any) => {
                    const shortageKey = `shortage-${palti.variety || 'Unknown'}-${palti.productType}-${palti.locationCode}-palti-shortage`;
                    bifurcationGroups[shortageKey] = {
                      product: 'Shortage from Palti',
                      variety: palti.variety,
                      packaging: `${palti.sourcePackaging?.brandName || 'A1'} → ${palti.targetPackaging?.brandName || 'A1'}`,
                      category: palti.productType === 'Rice' ? 'Rice' : palti.productType,
                      location: palti.locationCode,
                      qtls: (palti.shortageKg || 0) / 100, // Convert kg to quintals
                      bags: 0, // Shortage doesn't have bags
                      bagSizeKg: 0,
                      outturn: null,
                      movementType: 'palti-shortage',
                      processType: null,
                      shortageKg: palti.shortageKg || 0,
                      shortageBags: palti.shortageBags || 0,
                      sourcePackaging: palti.sourcePackaging?.brandName,
                      targetPackaging: palti.targetPackaging?.brandName
                    };
                  });

                  // Convert bifurcation groups to array for display and format them
                  dayData.yesterdayBifurcation = Object.values(bifurcationGroups).map((group: any) => {
                    // Format product display based on movement types
                    let productDisplay = group.product;

                    if (group.isPalti) {
                      productDisplay = `🔄 Palti`;
                    } else if (group.movementTypes.length > 1) {
                      // Multiple movement types - show them
                      const types = group.movementTypes.join(', ');
                      productDisplay = `${group.product} (${types})`;
                    } else if (group.movementTypes.length === 1) {
                      // Single movement type
                      const type = group.movementTypes[0];
                      if (type !== 'production') {
                        productDisplay = `${group.product} (${type})`;
                      }
                    }

                    return {
                      ...group,
                      product: productDisplay
                    };
                  }).filter((group: any) => group.qtls !== 0); // Only show groups with non-zero quantities

                  console.log('🔍 DEBUG - Bifurcation for', date, ':', {
                    yesterdayDate: yesterdayDateStr,
                    bifurcationGroups: Object.keys(bifurcationGroups).length,
                    sampleGroup: Object.values(bifurcationGroups)[0]
                  });

                  // Add detailed stock information to day data for debugging
                  dayData.detailedStock = { ...runningStockDetailed };

                }

                // Add opening stock entries for display (simplified totals)
                productTypes.forEach(type => {
                  if (Number(openingStockByType[type]) > 0) {
                    dayData.openingStock.push({
                      product: type,
                      qtls: Number(openingStockByType[type]),
                      bags: Math.round(Number(openingStockByType[type]) * 100 / 26), // Approximate bags
                      bagSizeKg: 26,
                      packaging: '',
                      location: 'Stock',
                      category: type
                    });
                  }
                });

                dayData.openingStockTotal = Object.values(openingStockByType).reduce((sum: number, val: number) => sum + Number(val || 0), 0);
                dayData.closingStockTotal = Object.values(closingStockByType).reduce((sum: number, val: number) => sum + Number(val || 0), 0);
              });

              // Log final stock balances for debugging
              console.log('🔍 DEBUG - Final detailed stock balances:', runningStockDetailed);
              console.log('🔍 DEBUG - Final stock by type:', runningStockByType);

              // Return in reverse chronological order (latest first) for display
              return sortedDates.reverse().map(date => dailyData[date]);
            };

            const processedData = processRiceStockData(riceStockData);
            console.log('🔍 DEBUG - Processed data:', processedData);
            console.log('🔍 DEBUG - Dates in processed data:', processedData.map((d: any) => d.date));

            // Filter data - show all dates that have any data
            const filteredData = processedData.filter((dayData: any) => {
              const hasData = dayData.productions && dayData.productions.length > 0;
              console.log(`🔍 DEBUG - Date ${dayData.date}: hasData=${hasData}, productions=${dayData.productions?.length || 0}`);
              return hasData;
            });

            console.log('🔍 DEBUG - Filtered data:', filteredData);

            if (filteredData.length === 0) {
              return (
                <EmptyState>
                  <p>No rice stock data available for the selected period</p>
                  <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                    Total raw records: {riceStockData.length}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                    Rice stock will appear here once rice production entries are approved
                  </p>
                </EmptyState>
              );
            }

            return (
              <div style={{ padding: '1rem' }}>
                {filteredData.map((dayData: any) => {
                  // Group data by product types - Excel style
                  const groupDataByProductType = (data: any[]) => {
                    const groups: { [key: string]: any[] } = {
                      'Rice': [],
                      'Palti': [],
                      'Bran': [],
                      'RJ Rice (2)': [],
                      'RJ Broken': [],
                      'Unpolish': [],
                      'Faram': [],
                      '0 Broken': [],
                      'Sizer Broken': [],
                      'RJ Rice 1': [],
                      'Broken': [],
                      'Other': []
                    };

                    data.forEach(item => {
                      // Integrate palti operations into their actual product types
                      if (item.movementType === 'palti') {
                        // For palti operations, use the actual product_type (Rice, Broken, etc.)
                        // If productType is 'Palti' (legacy entries), default to 'Rice'
                        let actualProductType = item.productType || 'Rice';
                        if (actualProductType === 'Palti') {
                          actualProductType = 'Rice'; // Legacy entries treated as Rice
                        }
                        if (!groups[actualProductType]) {
                          groups[actualProductType] = [];
                        }
                        groups[actualProductType].push(item);
                        return;
                      }

                      const product = (item.product || '').toLowerCase();
                      if (product.includes('unpolish')) {
                        groups['Unpolish'].push(item);
                      } else if (product.includes('faram')) {
                        groups['Faram'].push(item);
                      } else if (product.includes('zero broken') || product.includes('0 broken')) {
                        groups['0 Broken'].push(item);
                      } else if (product.includes('sizer broken')) {
                        groups['Sizer Broken'].push(item);
                      } else if (product.includes('rejection broken')) {
                        groups['Sizer Broken'].push(item);
                      } else if (product.includes('rj rice 1')) {
                        groups['RJ Rice 1'].push(item);
                      } else if (product.includes('rj rice 2') || product.includes('rj rice (2)')) {
                        groups['RJ Rice (2)'].push(item);
                      } else if (product.includes('rj broken')) {
                        groups['RJ Broken'].push(item);
                      } else if (product.includes('broken')) {
                        groups['Broken'].push(item);
                      } else if (product.includes('rice') || product.includes('rj rice')) {
                        groups['Rice'].push(item);
                      } else if (product.includes('bran')) {
                        groups['Bran'].push(item);
                      } else {
                        groups['Other'].push(item);
                      }
                    });

                    return groups;
                  };

                  const openingGroups = groupDataByProductType(dayData.openingStock || []);

                  // Include ALL productions (including Palti) in productionGroups
                  // Palti entries will be grouped by their product_type (Rice, Bran, etc.)
                  const allProductions = dayData.productions || [];

                  // All movements go into productionGroups based on their product category
                  const productionGroups = groupDataByProductType(allProductions);

                  // For backward compatibility, create empty paltiGroups
                  // Palti entries are now in productionGroups under their product type (Rice, Bran, etc.)
                  const paltiGroups: { [key: string]: any[] } = {
                    'Rice': [], 'Bran': [], 'Broken': [], '0 Broken': [], 'Faram': [],
                    'Unpolish': [], 'RJ Rice (2)': [], 'Sizer Broken': [], 'RJ Rice 1': [],
                    'RJ Broken': [], 'Other': [], 'Palti': []
                  };

                  console.log('🔍 DEBUG - Production groups for date', dayData.date, {
                    allProductions: allProductions.length,
                    productionGroupKeys: Object.keys(productionGroups).filter(k => productionGroups[k].length > 0),
                    riceCount: productionGroups['Rice']?.length || 0,
                    paltiInRice: productionGroups['Rice']?.filter((p: any) => p.movementType === 'palti').length || 0
                  });

                  // Calculate totals for each group (considering movement types)
                  const calculateGroupTotals = (group: any[]) => {
                    return {
                      qtls: group.reduce((sum, item) => {
                        const qty = Number(item.qtls) || 0;
                        const movementType = (item.movementType || '').toLowerCase();
                        // Sales subtract from stock, others add to stock
                        return movementType === 'sale' ? sum - qty : sum + qty;
                      }, 0),
                      bags: group.reduce((sum, item) => {
                        const bags = Number(item.bags) || 0;
                        const movementType = (item.movementType || '').toLowerCase();
                        // Sales subtract from stock, others add to stock
                        return movementType === 'sale' ? sum - bags : sum + bags;
                      }, 0)
                    };
                  };

                  return (
                    <div key={dayData.date} style={{ marginBottom: '2rem', background: 'white', border: '1px solid #000' }}>
                      {/* Date Header - Excel style */}
                      <div style={{ background: '#4472C4', color: '#FFF', padding: '0.5rem 1rem', fontWeight: 'bold', fontSize: '0.9rem', borderBottom: '1px solid #000' }}>
                        {new Date(dayData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>

                      {/* Clean card-style layout - Rice left, Right side with vertical stack + horizontal bottom row */}
                      <div style={{
                        padding: '1rem',
                        fontFamily: 'Calibri, Arial, sans-serif'
                      }}>

                        {/* Top Row: Rice left, Vertical stack right */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 20px 1fr',
                          gap: '0',
                          marginBottom: '8px'
                        }}>

                          {/* Left Side: Rice */}
                          <div>
                            {(() => {
                              const productType = 'Rice';
                              const hasData = (openingGroups[productType]?.length > 0 || productionGroups[productType]?.length > 0);

                              return (
                                <div key={productType}>
                                  <div style={{
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    marginBottom: '16px'
                                  }}>
                                    {/* Product Header */}
                                    <div style={{
                                      background: '#e9ecef',
                                      padding: '8px 12px',
                                      fontWeight: 'bold',
                                      textAlign: 'center',
                                      fontSize: '12pt',
                                      fontFamily: 'Calibri, Arial, sans-serif',
                                      color: '#495057'
                                    }}>
                                      Rice
                                    </div>

                                    {/* Column Headers */}
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: '60px 80px 1fr 120px 100px 60px',
                                      gap: '8px',
                                      padding: '6px 12px',
                                      background: '#f1f3f4',
                                      fontSize: '9pt',
                                      fontWeight: 'bold',
                                      color: '#5f6368'
                                    }}>
                                      <div style={{ textAlign: 'center' }}>Qtls</div>
                                      <div style={{ textAlign: 'center' }}>Bags</div>
                                      <div style={{ textAlign: 'center' }}>Product</div>
                                      <div style={{ textAlign: 'center' }}>Variety</div>
                                      <div style={{ textAlign: 'center' }}>Packaging</div>
                                      <div style={{ textAlign: 'center' }}>L</div>
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '8px 12px' }}>
                                      {/* Yesterday's Bifurcation */}
                                      {dayData.yesterdayBifurcation?.filter((item: any) => item.category === productType).map((item: any, idx: number) => (
                                        <div key={`bifurcation-${productType}-${idx}`} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '60px 80px 1fr 120px 100px 60px',
                                          gap: '8px',
                                          padding: '3px 0',
                                          fontSize: '9pt',
                                          background: '#f8f9fa',
                                          marginBottom: '2px',
                                          borderRadius: '3px',
                                          border: '1px solid #e9ecef'
                                        }}>
                                          <div style={{ textAlign: 'center', fontSize: '8pt' }}>
                                            {item.qtls.toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'center', fontSize: '8pt' }}>
                                            {item.bags}{item.bagSizeKg ? `/${item.bagSizeKg}kgs` : ''}
                                          </div>
                                          <div style={{ fontSize: '8pt', textAlign: 'center' }}>
                                            {item.product}
                                            {item.outturn?.code && (
                                              <span
                                                style={{
                                                  color: '#7c3aed',
                                                  fontWeight: 'bold',
                                                  marginLeft: '4px',
                                                  cursor: 'pointer',
                                                  textDecoration: 'underline'
                                                }}
                                                onClick={() => navigateToOutturn(item.outturn.code)}
                                                title={`Click to view outturn ${item.outturn.code}`}
                                              >
                                                → {item.outturn.code}
                                              </span>
                                            )}
                                            {(item.movementType === 'palti' || item.movementType === 'palti-shortage') && item.shortageKg > 0 && (
                                              <div style={{ fontSize: '7pt', color: '#d97706', fontWeight: 'bold', marginTop: '2px' }}>
                                                Shortage: {item.shortageKg}kg
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '8pt', textAlign: 'center' }}>
                                            {item.variety || 'Unknown'}
                                            {item.processType && (
                                              <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                {item.processType}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '8pt', textAlign: 'center' }}>
                                            {item.movementType === 'palti' && item.sourcePackaging ?
                                              `${item.sourcePackaging.brandName || 'A1'} → ${item.targetPackaging?.brandName || 'A1'}` :
                                              item.packaging?.brandName || item.packaging || 'A1'
                                            }
                                          </div>
                                          <div style={{ fontSize: '8pt', textAlign: 'center' }}>{item.location}</div>
                                        </div>
                                      ))}

                                      {/* Opening Stock */}
                                      {hasData && openingGroups[productType]?.length > 0 && (
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '60px 80px 1fr 120px 100px 60px',
                                          gap: '8px',
                                          padding: '4px 0',
                                          fontSize: '10pt',
                                          background: '#ffffff',
                                          marginBottom: '4px',
                                          borderRadius: '4px'
                                        }}>
                                          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {calculateGroupTotals(openingGroups[productType]).qtls.toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {calculateGroupTotals(openingGroups[productType]).bags}
                                          </div>
                                          <div style={{ fontWeight: 'bold' }}>Opening Stock</div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                      )}

                                      {/* Daily Movements */}
                                      {hasData && productionGroups[productType]?.map((prod: any, idx: number) => {
                                        const getMovementColor = (movementType: string) => {
                                          switch (movementType?.toLowerCase()) {
                                            case 'production': return '#d4edda';
                                            case 'purchase': return '#cce5ff';
                                            case 'sale': return '#ffe5cc';
                                            case 'palti': return '#e5ccff';
                                            default: return '#ffffff';
                                          }
                                        };

                                        return (
                                          <div key={`${productType}-${idx}`} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '60px 80px 1fr 120px 100px 60px',
                                            gap: '8px',
                                            padding: '4px 0',
                                            fontSize: '10pt',
                                            background: getMovementColor(prod.movementType),
                                            marginBottom: '2px',
                                            borderRadius: '4px'
                                          }}>
                                            <div style={{ textAlign: 'center' }}>
                                              {Math.abs(Number(prod.qtls) || 0).toFixed(2)}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              {prod.bags || 0}{prod.bagSizeKg ? `/${prod.bagSizeKg}kgs` : ''}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              {prod.movementType === 'palti' ? (
                                                <>
                                                  <div style={{ fontWeight: 'bold', color: '#7c3aed' }}>
                                                    🔄 Palti - {String(prod.product || 'Rice')}
                                                  </div>
                                                  {prod.sourcePackaging && (
                                                    <div style={{ fontSize: '8pt', color: '#666' }}>
                                                      {prod.sourcePackaging.brandName || 'A1'} → {prod.targetPackaging?.brandName || prod.packaging?.brandName || 'A1'}
                                                    </div>
                                                  )}
                                                  {Number(prod.shortageKg) > 0 && (
                                                    <div style={{
                                                      fontSize: '9pt',
                                                      color: '#dc2626',
                                                      fontWeight: 'bold',
                                                      marginTop: '2px',
                                                      background: '#fee2e2',
                                                      padding: '2px 4px',
                                                      borderRadius: '3px'
                                                    }}>
                                                      ⚠️ Shortage: {Number(prod.shortageKg).toFixed(2)}kg from {prod.locationCode || prod.location || 'location'}
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  {String(prod.product || '')}
                                                  {prod.outturn?.code && (
                                                    <span
                                                      style={{
                                                        color: '#7c3aed',
                                                        fontWeight: 'bold',
                                                        marginLeft: '4px',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                      }}
                                                      onClick={() => navigateToOutturn(prod.outturn.code)}
                                                      title={`Click to view outturn ${prod.outturn.code}`}
                                                    >
                                                      → {prod.outturn.code}
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div>{String(prod.variety || 'Unknown')}</div>
                                              {prod.processType && (
                                                <div style={{ fontSize: '8pt', color: '#666', fontStyle: 'italic' }}>
                                                  {prod.processType}
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div style={{ fontSize: '8pt' }}>
                                                {prod.movementType === 'palti' && prod.sourcePackaging ?
                                                  `${prod.sourcePackaging.brandName || 'A1'} → ${prod.targetPackaging?.brandName || 'A1'}` :
                                                  prod.packaging?.brandName || prod.packaging || 'A1'
                                                }
                                              </div>
                                              {prod.movementType && (
                                                <div style={{ fontSize: '8pt', color: '#666', fontStyle: 'italic' }}>
                                                  {prod.movementType}
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div>{prod.locationCode || prod.location || ''}</div>
                                              {prod.billNumber && (
                                                <div style={{ fontSize: '8pt', color: '#666' }}>
                                                  {prod.billNumber}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Closing Stock */}
                                      {hasData && (
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '60px 80px 1fr 120px 100px 60px',
                                          gap: '8px',
                                          padding: '6px 0',
                                          fontSize: '10pt',
                                          background: '#e9ecef',
                                          marginTop: '4px',
                                          borderRadius: '4px',
                                          fontWeight: 'bold'
                                        }}>
                                          <div style={{ textAlign: 'right' }}>
                                            {(calculateGroupTotals(openingGroups[productType] || []).qtls + calculateGroupTotals(productionGroups[productType] || []).qtls).toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            {calculateGroupTotals(openingGroups[productType] || []).bags + calculateGroupTotals(productionGroups[productType] || []).bags}
                                          </div>
                                          <div>Closing Stock</div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                      )}

                                      {/* No data placeholder */}
                                      {!hasData && (
                                        <div style={{
                                          padding: '20px',
                                          textAlign: 'center',
                                          color: '#666',
                                          fontStyle: 'italic',
                                          fontSize: '10pt'
                                        }}>
                                          No data available
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Palti Section - Removed since Palti entries now appear in their product type sections */}
                          </div>

                          {/* Gap */}
                          <div></div>

                          {/* Right Side: Vertically Stacked Product Types */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {['Broken', 'RJ Rice 1', '0 Broken', 'Unpolish', 'Faram'].map((productType) => {
                              const hasData = (openingGroups[productType]?.length > 0 || productionGroups[productType]?.length > 0);

                              return (
                                <div key={productType}>
                                  <div style={{
                                    background: '#f8f9fa',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    marginBottom: '20px'
                                  }}>
                                    {/* Product Header */}
                                    <div style={{
                                      background: '#e9ecef',
                                      padding: '4px 8px',
                                      fontWeight: 'bold',
                                      textAlign: 'center',
                                      fontSize: '10pt',
                                      fontFamily: 'Calibri, Arial, sans-serif',
                                      color: '#495057'
                                    }}>
                                      {productType}
                                    </div>

                                    {/* Column Headers */}
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                      gap: '6px',
                                      padding: '3px 8px',
                                      background: '#f1f3f4',
                                      fontSize: '8pt',
                                      fontWeight: 'bold',
                                      color: '#5f6368'
                                    }}>
                                      <div style={{ textAlign: 'center' }}>Qtls</div>
                                      <div style={{ textAlign: 'center' }}>Bags</div>
                                      <div style={{ textAlign: 'center' }}>Product</div>
                                      <div style={{ textAlign: 'center' }}>Variety</div>
                                      <div style={{ textAlign: 'center' }}>Packaging</div>
                                      <div style={{ textAlign: 'center' }}>L</div>
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '4px 8px' }}>
                                      {/* Yesterday's Bifurcation */}
                                      {dayData.yesterdayBifurcation?.filter((item: any) => item.category === productType).map((item: any, idx: number) => (
                                        <div key={`bifurcation-${productType}-${idx}`} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                          gap: '6px',
                                          padding: '2px 0',
                                          fontSize: '8pt',
                                          background: '#f8f9fa',
                                          marginBottom: '1px',
                                          borderRadius: '2px',
                                          border: '1px solid #e9ecef'
                                        }}>
                                          <div style={{ textAlign: 'center' }}>
                                            {item.qtls.toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {item.bags}{item.bagSizeKg ? `/${item.bagSizeKg}kgs` : ''}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {item.product}
                                            {item.outturn?.code && (
                                              <span
                                                style={{
                                                  color: '#7c3aed',
                                                  fontWeight: 'bold',
                                                  marginLeft: '4px',
                                                  cursor: 'pointer',
                                                  textDecoration: 'underline'
                                                }}
                                                onClick={() => navigateToOutturn(item.outturn.code)}
                                                title={`Click to view outturn ${item.outturn.code}`}
                                              >
                                                → {item.outturn.code}
                                              </span>
                                            )}
                                            {(item.movementType === 'palti' || item.movementType === 'palti-shortage') && item.shortageKg > 0 && (
                                              <div style={{ fontSize: '7pt', color: '#d97706', fontWeight: 'bold', marginTop: '2px' }}>
                                                Shortage: {item.shortageKg}kg
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {item.variety || 'Unknown'}
                                            {item.processType && (
                                              <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                {item.processType}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {item.movementType === 'palti' && item.sourcePackaging ?
                                              `${item.sourcePackaging.brandName || 'A1'} → ${item.targetPackaging?.brandName || 'A1'}` :
                                              item.packaging?.brandName || item.packaging || 'A1'
                                            }
                                          </div>
                                          <div style={{ textAlign: 'center' }}>{item.location}</div>
                                        </div>
                                      ))}

                                      {/* Opening Stock */}
                                      {hasData && openingGroups[productType]?.length > 0 && (
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                          gap: '6px',
                                          padding: '2px 0',
                                          fontSize: '9pt',
                                          background: '#ffffff',
                                          marginBottom: '2px',
                                          borderRadius: '3px'
                                        }}>
                                          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {calculateGroupTotals(openingGroups[productType]).qtls.toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {calculateGroupTotals(openingGroups[productType]).bags}
                                          </div>
                                          <div style={{ fontWeight: 'bold' }}>Opening Stock</div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                      )}

                                      {/* Daily Movements */}
                                      {hasData && productionGroups[productType]?.map((prod: any, idx: number) => {
                                        const getMovementColor = (movementType: string) => {
                                          switch (movementType?.toLowerCase()) {
                                            case 'production': return '#d4edda';
                                            case 'purchase': return '#cce5ff';
                                            case 'sale': return '#ffe5cc';
                                            case 'palti': return '#e5ccff';
                                            default: return '#ffffff';
                                          }
                                        };

                                        return (
                                          <div key={`${productType.toLowerCase().replace(/\s+/g, '-')}-prod-${idx}`} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                            gap: '6px',
                                            padding: '2px 0',
                                            fontSize: '9pt',
                                            background: getMovementColor(prod.movementType),
                                            marginBottom: '1px',
                                            borderRadius: '3px'
                                          }}>
                                            <div style={{ textAlign: 'center' }}>
                                              {Math.abs(Number(prod.qtls) || 0).toFixed(2)}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              {prod.bags || 0}{prod.bagSizeKg ? `/${prod.bagSizeKg}kgs` : ''}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              {String(prod.product || '')}
                                              {prod.outturn?.code && (
                                                <span
                                                  style={{
                                                    color: '#7c3aed',
                                                    fontWeight: 'bold',
                                                    marginLeft: '4px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline'
                                                  }}
                                                  onClick={() => navigateToOutturn(prod.outturn.code)}
                                                  title={`Click to view outturn ${prod.outturn.code}`}
                                                >
                                                  → {prod.outturn.code}
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div>{String(prod.variety || 'Unknown')}</div>
                                              {prod.processType && (
                                                <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                  {prod.processType}
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div style={{ fontSize: '8pt' }}>
                                                {prod.movementType === 'palti' && prod.sourcePackaging ?
                                                  `${prod.sourcePackaging.brandName || 'A1'} → ${prod.targetPackaging?.brandName || 'A1'}` :
                                                  prod.packaging?.brandName || prod.packaging || 'A1'
                                                }
                                              </div>
                                              {prod.movementType && (
                                                <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                  {prod.movementType}
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                              <div>{prod.locationCode || prod.location || ''}</div>
                                              {prod.billNumber && (
                                                <div style={{ fontSize: '7pt', color: '#666' }}>
                                                  {prod.billNumber}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Closing Stock */}
                                      {hasData && (
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                          gap: '6px',
                                          padding: '3px 0',
                                          fontSize: '9pt',
                                          background: '#e9ecef',
                                          marginTop: '2px',
                                          borderRadius: '3px',
                                          fontWeight: 'bold'
                                        }}>
                                          <div style={{ textAlign: 'right' }}>
                                            {(calculateGroupTotals(openingGroups[productType] || []).qtls + calculateGroupTotals(productionGroups[productType] || []).qtls).toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            {calculateGroupTotals(openingGroups[productType] || []).bags + calculateGroupTotals(productionGroups[productType] || []).bags}
                                          </div>
                                          <div>Closing Stock</div>
                                          <div></div>
                                          <div></div>
                                          <div></div>
                                        </div>
                                      )}

                                      {/* No data placeholder */}
                                      {!hasData && (
                                        <div style={{
                                          padding: '12px',
                                          textAlign: 'center',
                                          color: '#666',
                                          fontStyle: 'italic',
                                          fontSize: '9pt'
                                        }}>
                                          No data available
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom Row: Horizontal Product Types */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px'
                        }}>
                          {['Bran', 'RJ Rice (2)', 'Sizer Broken'].map((productType) => {
                            const hasData = (openingGroups[productType]?.length > 0 || productionGroups[productType]?.length > 0);

                            return (
                              <div key={productType}>
                                <div style={{
                                  background: '#f8f9fa',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  marginBottom: '20px'
                                }}>
                                  {/* Product Header */}
                                  <div style={{
                                    background: '#e9ecef',
                                    padding: '4px 8px',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    fontSize: '10pt',
                                    fontFamily: 'Calibri, Arial, sans-serif',
                                    color: '#495057'
                                  }}>
                                    {productType}
                                  </div>

                                  {/* Column Headers */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                    gap: '6px',
                                    padding: '3px 8px',
                                    background: '#f1f3f4',
                                    fontSize: '8pt',
                                    fontWeight: 'bold',
                                    color: '#5f6368'
                                  }}>
                                    <div style={{ textAlign: 'center' }}>Qtls</div>
                                    <div style={{ textAlign: 'center' }}>Bags</div>
                                    <div style={{ textAlign: 'center' }}>Product</div>
                                    <div style={{ textAlign: 'center' }}>Variety</div>
                                    <div style={{ textAlign: 'center' }}>Packaging</div>
                                    <div style={{ textAlign: 'center' }}>L</div>
                                  </div>

                                  {/* Content */}
                                  <div style={{ padding: '4px 8px' }}>
                                    {/* Yesterday's Bifurcation */}
                                    {dayData.yesterdayBifurcation?.filter((item: any) => item.category === productType).map((item: any, idx: number) => (
                                      <div key={`bifurcation-${productType}-${idx}`} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                        gap: '6px',
                                        padding: '2px 0',
                                        fontSize: '8pt',
                                        background: '#f8f9fa',
                                        marginBottom: '1px',
                                        borderRadius: '2px',
                                        border: '1px solid #e9ecef'
                                      }}>
                                        <div style={{ textAlign: 'center' }}>
                                          {item.qtls.toFixed(2)}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          {item.bags}{item.bagSizeKg ? `/${item.bagSizeKg}kgs` : ''}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          {item.product}
                                          {item.outturn?.code && (
                                            <span
                                              style={{
                                                color: '#7c3aed',
                                                fontWeight: 'bold',
                                                marginLeft: '4px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                              }}
                                              onClick={() => navigateToOutturn(item.outturn.code)}
                                              title={`Click to view outturn ${item.outturn.code}`}
                                            >
                                              → {item.outturn.code}
                                            </span>
                                          )}
                                          {item.movementType === 'palti' && item.shortageKg > 0 && (
                                            <div style={{ fontSize: '7pt', color: '#d97706', fontWeight: 'bold', marginTop: '2px' }}>
                                              Shortage: {item.shortageKg}kg
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          {item.variety || 'Unknown'}
                                          {item.processType && (
                                            <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                              {item.processType}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>{item.packaging}</div>
                                        <div style={{ textAlign: 'center' }}>{item.location}</div>
                                      </div>
                                    ))}

                                    {/* Opening Stock */}
                                    {hasData && openingGroups[productType]?.length > 0 && (
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                        gap: '6px',
                                        padding: '2px 0',
                                        fontSize: '9pt',
                                        background: '#ffffff',
                                        marginBottom: '2px',
                                        borderRadius: '3px'
                                      }}>
                                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                          {calculateGroupTotals(openingGroups[productType]).qtls.toFixed(2)}
                                        </div>
                                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                          {calculateGroupTotals(openingGroups[productType]).bags}
                                        </div>
                                        <div style={{ fontWeight: 'bold', textAlign: 'center' }}>Opening Stock</div>
                                        <div></div>
                                        <div></div>
                                        <div></div>
                                      </div>
                                    )}

                                    {/* Daily Movements */}
                                    {hasData && productionGroups[productType]?.map((prod: any, idx: number) => {
                                      const getMovementColor = (movementType: string) => {
                                        switch (movementType?.toLowerCase()) {
                                          case 'production': return '#d4edda';
                                          case 'purchase': return '#cce5ff';
                                          case 'sale': return '#ffe5cc';
                                          case 'palti': return '#e5ccff';
                                          default: return '#ffffff';
                                        }
                                      };

                                      return (
                                        <div key={`${productType.toLowerCase().replace(/\s+/g, '-')}-prod-${idx}`} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                          gap: '6px',
                                          padding: '2px 0',
                                          fontSize: '9pt',
                                          background: getMovementColor(prod.movementType),
                                          marginBottom: '1px',
                                          borderRadius: '3px'
                                        }}>
                                          <div style={{ textAlign: 'center' }}>
                                            {Math.abs(Number(prod.qtls) || 0).toFixed(2)}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {prod.bags || 0}{prod.bagSizeKg ? `/${prod.bagSizeKg}kgs` : ''}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            {String(prod.product || '')}
                                            {prod.outturn?.code && (
                                              <span
                                                style={{
                                                  color: '#7c3aed',
                                                  fontWeight: 'bold',
                                                  marginLeft: '4px',
                                                  cursor: 'pointer',
                                                  textDecoration: 'underline'
                                                }}
                                                onClick={() => navigateToOutturn(prod.outturn.code)}
                                                title={`Click to view outturn ${prod.outturn.code}`}
                                              >
                                                → {prod.outturn.code}
                                              </span>
                                            )}
                                            {prod.movementType === 'palti' && prod.shortageKg > 0 && (
                                              <div style={{ fontSize: '7pt', color: '#d97706', fontWeight: 'bold', marginTop: '2px' }}>
                                                Shortage: {prod.shortageKg}kg
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            <div>{String(prod.variety || 'Unknown')}</div>
                                            {prod.processType && (
                                              <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                {prod.processType}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '8pt' }}>
                                              {prod.movementType === 'palti' && prod.sourcePackaging ?
                                                `${prod.sourcePackaging.brandName || 'A1'} → ${prod.targetPackaging?.brandName || 'A1'}` :
                                                prod.packaging?.brandName || prod.packaging || 'A1'
                                              }
                                            </div>
                                            {prod.movementType && (
                                              <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>
                                                {prod.movementType}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center' }}>
                                            <div>{prod.locationCode || prod.location || ''}</div>
                                            {prod.billNumber && (
                                              <div style={{ fontSize: '7pt', color: '#666' }}>
                                                {prod.billNumber}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Closing Stock */}
                                    {hasData && (
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '50px 60px 1fr 100px 80px 50px',
                                        gap: '6px',
                                        padding: '3px 0',
                                        fontSize: '9pt',
                                        background: '#e9ecef',
                                        marginTop: '2px',
                                        borderRadius: '3px',
                                        fontWeight: 'bold'
                                      }}>
                                        <div style={{ textAlign: 'center' }}>
                                          {(calculateGroupTotals(openingGroups[productType] || []).qtls + calculateGroupTotals(productionGroups[productType] || []).qtls).toFixed(2)}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          {calculateGroupTotals(openingGroups[productType] || []).bags + calculateGroupTotals(productionGroups[productType] || []).bags}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>Closing Stock</div>
                                        <div></div>
                                        <div></div>
                                        <div></div>
                                      </div>
                                    )}

                                    {/* No data placeholder */}
                                    {!hasData && (
                                      <div style={{
                                        padding: '12px',
                                        textAlign: 'center',
                                        color: '#666',
                                        fontStyle: 'italic',
                                        fontSize: '9pt'
                                      }}>
                                        No data available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );

          })()
          }
        </Container >
      ) : activeTab === 'outturn-report' ? (
        /* Outturn Report View - With Rice Production Entry Form */
        <div style={{ padding: '1rem' }}>
          {/* Outturn Selector */}
          <FormGroup style={{ marginBottom: '2rem' }}>
            <Label>Search Outturn</Label>
            <Input
              type="text"
              placeholder="Search by outturn number or variety..."
              value={outturnSearch}
              onChange={(e) => setOutturnSearch(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
            <Label>Select Outturn</Label>
            <Select
              value={selectedOutturnId || ''}
              onChange={(e) => setSelectedOutturnId(e.target.value)}
            >
              <option value="">-- Select Outturn --</option>
              {outturns
                .filter((outturn: any) => {
                  if (!outturnSearch) return true;
                  const searchLower = outturnSearch.toLowerCase();
                  const outturnCode = outturn.outturnNumber || outturn.code || '';
                  return (
                    outturnCode.toLowerCase().includes(searchLower) ||
                    outturn.allottedVariety?.toLowerCase().includes(searchLower)
                  );
                })
                .map((outturn: any) => (
                  <option key={outturn.id} value={outturn.id}>
                    {outturn.outturnNumber || outturn.code} - {outturn.allottedVariety}
                  </option>
                ))}
            </Select>

          </FormGroup>

          {selectedOutturnId && (
            <div>
              {/* Outturn Details Header */}
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <strong>Outturn Code:</strong> {outturns.find((o: any) => o.id === parseInt(selectedOutturnId))?.outturnNumber || outturns.find((o: any) => o.id === parseInt(selectedOutturnId))?.code}
                </div>
                <div>
                  <strong>Variety:</strong> {outturns.find((o: any) => o.id === parseInt(selectedOutturnId))?.allottedVariety}
                </div>
                <div>
                  <strong>Type:</strong> {outturns.find((o: any) => o.id === parseInt(selectedOutturnId))?.type || 'Raw'}
                </div>
              </div>

              {/* Available Bags Display */}
              <div style={{
                backgroundColor: availableBags > 0 ? '#dcfce7' : '#fee2e2',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                color: availableBags > 0 ? '#16a34a' : '#dc2626'
              }}>
                Available Bags for Production: {availableBags} bags
              </div>

              {/* Cleared Outturn Message */}
              {isOutturnCleared && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fee2e2',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: '#991b1b'
                }}>
                  ✅ This outturn has been cleared and closed. No more production entries can be added.
                </div>
              )}

              {/* Clear Outturn - Only for Admin and Manager */}
              {(user?.role === 'admin' || user?.role === 'manager') && availableBags > 0 && !isOutturnCleared && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    marginBottom: '0.75rem',
                    fontWeight: 'bold',
                    color: '#92400e',
                    textAlign: 'center',
                    fontSize: '1.1rem'
                  }}>
                    ⚠️ Outturn Completion
                  </div>
                  <div style={{
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                    color: '#78350f'
                  }}>
                    Remaining Bags: <strong>{availableBags} bags</strong>
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#78350f',
                    marginBottom: '0.75rem',
                    textAlign: 'center'
                  }}>
                    These bags represent waste/loss in production. Clearing will mark outturn as complete.
                  </div>
                  <Button
                    onClick={() => {
                      setClearOutturnDate(new Date().toISOString().split('T')[0]);
                      setShowClearOutturnDialog(true);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Outturn
                  </Button>
                </div>
              )}

              {/* TOP: Rice Production Entry Form - Horizontal Layout */}
              <div style={{
                backgroundColor: '#FFF7ED',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '2px solid #FB923C'
              }}>
                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#EA580C', fontWeight: 'bold' }}>
                  📝 Rice Production Data Entry
                </h3>

                {/* Horizontal Form Grid - Row 1 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <FormGroup>
                    <Label>Date *</Label>
                    <Input
                      type="text"
                      value={productionDateInput}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d-]/g, '');
                        const parts = value.split('-');
                        if (parts.length > 3) {
                          value = parts.slice(0, 3).join('-');
                        }
                        let formatted = value.replace(/-/g, '');
                        if (formatted.length >= 2) {
                          formatted = formatted.slice(0, 2) + '-' + formatted.slice(2);
                        }
                        if (formatted.length >= 5) {
                          formatted = formatted.slice(0, 5) + '-' + formatted.slice(5);
                        }
                        if (formatted.length > 10) {
                          formatted = formatted.slice(0, 10);
                        }
                        setProductionDateInput(formatted);
                        if (formatted.length === 10) {
                          const [day, month, year] = formatted.split('-').map(Number);
                          console.log('Date parts:', { day, month, year });
                          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                            // Use UTC to avoid timezone issues
                            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            console.log('Converted date (YYYY-MM-DD):', dateStr);
                            setProductionDate(dateStr);
                          } else {
                            console.log('Date validation failed:', { day, month, year });
                          }
                        }
                      }}
                      placeholder="DD-MM-YYYY"
                      maxLength={10}
                    />
                    <InfoText>Format: DD-MM-YYYY (e.g., 05-11-2025)</InfoText>
                  </FormGroup>

                  <FormGroup>
                    <Label>Select Product *</Label>
                    <Select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                    >
                      <option value="">-- SELECT PRODUCT --</option>
                      <option value="Rice">RICE</option>
                      <option value="Sizer Broken">SIZER BROKEN</option>
                      <option value="RJ Rice 1">RJ RICE 1</option>
                      <option value="RJ Rice 2">RJ RICE 2</option>
                      <option value="Broken">BROKEN</option>
                      <option value="Rejection Broken">REJECTION BROKEN</option>
                      <option value="Zero Broken">ZERO BROKEN</option>
                      <option value="Faram">FARAM</option>
                      <option value="Bran">BRAN</option>
                      <option value="Unpolished">UNPOLISHED</option>
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>Number of Bags *</Label>
                    <Input
                      type="number"
                      step="1"
                      value={bags}
                      onChange={(e) => setBags(e.target.value)}
                      placeholder="0"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Packaging *</Label>
                    <Select
                      value={packagingId}
                      onChange={(e) => setPackagingId(e.target.value)}
                    >
                      <option value="">-- SELECT PACKAGING --</option>
                      {packagings.map((pkg: any) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.brandName?.toUpperCase() || 'N/A'} ({pkg.allottedKg} KG/BAG)
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                </div>

                {/* Calculation Summary Box */}
                {quantityQuintals > 0 && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#1f2937', fontSize: '0.95rem' }}>
                      📊 CALCULATION SUMMARY
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr auto 1fr',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '6px',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>BAGS</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>{bags}</div>
                      </div>

                      <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>×</div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>PACKAGING (KG)</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                          {packagings.find((p: any) => p.id === parseInt(packagingId))?.allottedKg || 0}
                        </div>
                      </div>

                      <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>=</div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>QUINTALS</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                          {(quantityQuintals || 0).toFixed(2)} Q
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderTop: '1px solid #e5e7eb',
                      color: '#166534',
                      fontWeight: 500,
                      fontSize: '0.9rem'
                    }}>
                      <span>🌾 PADDY BAGS DEDUCTED:</span>
                      <span style={{ fontWeight: 'bold' }}>{paddyBagsDeducted} BAGS</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      color: '#166534',
                      fontWeight: 500,
                      fontSize: '0.9rem'
                    }}>
                      <span>📦 TOTAL WEIGHT:</span>
                      <span style={{ fontWeight: 'bold' }}>{((quantityQuintals || 0) * 100).toFixed(2)} KG</span>
                    </div>
                  </div>
                )}

                {/* Horizontal Form Grid - Row 2 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>

                  <FormGroup>
                    <Label>Type of Movement *</Label>
                    <Select
                      value={movementType}
                      onChange={(e) => setMovementType(e.target.value as 'kunchinittu' | 'loading')}
                    >
                      <option value="kunchinittu">KUNCHINITTU</option>
                      <option value="loading">LOADING</option>
                    </Select>
                  </FormGroup>

                  {movementType === 'kunchinittu' ? (
                    <FormGroup style={{ gridColumn: 'span 2' }}>
                      <Label>Location Code *</Label>
                      <Select
                        value={locationCode}
                        onChange={(e) => setLocationCode(e.target.value)}
                      >
                        <option value="">-- SELECT LOCATION --</option>
                        {riceStockLocations.map((loc: any) => (
                          <option key={loc.id} value={loc.code}>
                            {loc.code} {loc.name ? `- ${loc.name}` : ''}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                  ) : (
                    <>
                      <FormGroup>
                        <Label>Lorry Number *</Label>
                        <Input
                          type="text"
                          value={lorryNumber}
                          onChange={(e) => setLorryNumber(e.target.value)}
                          placeholder="Enter lorry number"
                        />
                      </FormGroup>

                      <FormGroup>
                        <Label>Bill Number *</Label>
                        <Input
                          type="text"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          placeholder="Enter bill number"
                        />
                      </FormGroup>
                    </>
                  )}
                </div>

                <Button className="success" onClick={handleRiceProductionSubmit} disabled={isSubmittingRiceProduction} style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem' }}>
                  {isSubmittingRiceProduction ? '⏳ Saving...' : '💾 Save Entry'}
                </Button>
              </div>

              {/* BELOW: Two Column Layout - Table Left, Summary Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                {/* LEFT: Excel-style By-Products Table */}
                <div>
                  <h3 style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>By-Products Record</h3>

                  {/* By-Products Table with exact Excel format + Unpolished */}
                  <ExcelTable style={{ border: '1px solid #5B9BD5', borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2E75B6', color: 'white', fontWeight: 'bold' }}>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Rice</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Sizer Broken</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>RJ Rice 1</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>RJ Rice 2</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Broken</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Rejection Broken</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Zero Broken</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Faram</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Bran</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>Unpolished</th>
                        <th style={{ border: '1px solid #5B9BD5', padding: '10px 12px', fontSize: '11pt', textAlign: 'center', minWidth: '100px', whiteSpace: 'nowrap' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byProducts.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', border: '1px solid #9BC2E6' }}>
                            No by-products recorded yet
                          </td>
                        </tr>
                      ) : (
                        <>
                          {byProducts.map((bp: any, idx: number) => (
                            <tr key={bp.id} style={{ backgroundColor: idx % 2 === 0 ? '#BDD7EE' : 'white' }}>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.rice > 0 ? bp.rice : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.rejectionRice > 0 ? bp.rejectionRice : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.rjRice1 > 0 ? bp.rjRice1 : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.rjRice2 > 0 ? bp.rjRice2 : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.broken > 0 ? bp.broken : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.rejectionBroken > 0 ? bp.rejectionBroken : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.zeroBroken > 0 ? bp.zeroBroken : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.faram > 0 ? bp.faram : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.bran > 0 ? bp.bran : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {bp.unpolished > 0 ? bp.unpolished : '-'}
                              </td>
                              <td style={{ border: '1px solid #9BC2E6', padding: '8px 12px', textAlign: 'center', fontSize: '10pt' }}>
                                {new Date(bp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </td>
                            </tr>
                          ))}

                          {/* Totals Row */}
                          <tr style={{ backgroundColor: '#BDD7EE', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rice || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rejectionRice || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rjRice1 || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rjRice2 || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.broken || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rejectionBroken || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.zeroBroken || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.faram || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.bran || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px', textAlign: 'center', fontSize: '10.5pt', fontWeight: 'bold' }}>
                              {byProducts.reduce((sum: number, bp: any) => sum + Number(bp.unpolished || 0), 0).toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid #2E75B6', padding: '10px 12px' }}></td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </ExcelTable>
                </div>

                {/* RIGHT: Yielding Rice Summary - Smaller and on the right */}
                <div>
                  {byProducts.length > 0 && productionRecords.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        margin: '0',
                        border: '1px solid #9BC2E6',
                        fontSize: '8pt'
                      }}>
                        <tbody>
                          {/* Yielding Rice Calculations */}
                          {(() => {
                            const totalPaddyWeight = productionRecords.reduce((sum: number, rec: any) =>
                              sum + Number(rec.netWeight || 0), 0
                            );

                            const totalByProducts = byProducts.reduce((sum: number, bp: any) =>
                              sum + Number(bp.rice || 0) + Number(bp.rejectionRice || 0) + Number(bp.rjRice1 || 0) + Number(bp.rjRice2 || 0) +
                              Number(bp.broken || 0) + Number(bp.rejectionBroken || 0) +
                              Number(bp.zeroBroken || 0) + Number(bp.faram || 0) + Number(bp.bran || 0) + Number(bp.unpolished || 0), 0
                            );

                            const entries = [
                              {
                                label: 'Rice',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rice || 0), 0)
                              },
                              {
                                label: 'Sizer Broken',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rejectionRice || 0), 0)
                              },
                              {
                                label: 'RJ Rice 1',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rjRice1 || 0), 0)
                              },
                              {
                                label: 'RJ Rice 2',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rjRice2 || 0), 0)
                              },
                              {
                                label: 'Broken',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.broken || 0), 0)
                              },
                              {
                                label: 'Rejection Broken',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.rejectionBroken || 0), 0)
                              },
                              {
                                label: 'Zero broken',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.zeroBroken || 0), 0)
                              },
                              {
                                label: 'Faram',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.faram || 0), 0)
                              },
                              {
                                label: 'Bran',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.bran || 0), 0)
                              },
                              {
                                label: 'Unpolished',
                                value: byProducts.reduce((sum: number, bp: any) => sum + Number(bp.unpolished || 0), 0)
                              }
                            ];

                            return entries.map((entry, idx) => (
                              <tr key={idx}>
                                <td style={{
                                  border: '1px solid #9BC2E6',
                                  padding: '2px 4px',
                                  textAlign: 'center',
                                  fontSize: '8pt',
                                  fontWeight: '500'
                                }}>
                                  {entry.value > 0 ? entry.value.toFixed(2) : '-'}
                                </td>
                                <td style={{
                                  border: '1px solid #9BC2E6',
                                  padding: '2px 4px',
                                  textAlign: 'left',
                                  fontSize: '8pt'
                                }}>
                                  {entry.label}
                                </td>
                                <td style={{
                                  border: '1px solid #9BC2E6',
                                  padding: '2px 4px',
                                  textAlign: 'center',
                                  fontSize: '8pt',
                                  fontWeight: '500'
                                }}>
                                  {entry.value > 0 && totalPaddyWeight > 0
                                    ? ((entry.value / totalPaddyWeight) * 100).toFixed(2)
                                    : '0.00'
                                  }
                                </td>
                              </tr>
                            ));
                          })()}

                          {/* Total BY Products Weight */}
                          <tr style={{ fontWeight: 'bold' }}>
                            <td style={{
                              border: '1px solid #2E75B6',
                              padding: '3px 5px',
                              textAlign: 'center',
                              fontSize: '8pt',
                              fontWeight: 'bold'
                            }}>
                              {byProducts.reduce((sum: number, bp: any) =>
                                sum + Number(bp.rice || 0) + Number(bp.rejectionRice || 0) + Number(bp.rjRice1 || 0) + Number(bp.rjRice2 || 0) +
                                Number(bp.broken || 0) + Number(bp.rejectionBroken || 0) +
                                Number(bp.zeroBroken || 0) + Number(bp.faram || 0) + Number(bp.bran || 0) + Number(bp.unpolished || 0), 0
                              ).toFixed(2)} Q
                            </td>
                            <td style={{
                              border: '1px solid #2E75B6',
                              padding: '3px 5px',
                              textAlign: 'left',
                              fontSize: '8pt',
                              fontWeight: 'bold'
                            }}>
                              Total BY Products
                            </td>
                            <td style={{
                              border: '1px solid #2E75B6',
                              padding: '3px 5px',
                              textAlign: 'center',
                              fontSize: '8pt',
                              fontWeight: 'bold',
                              backgroundColor: '#70AD47',
                              color: 'white'
                            }}>
                              {(() => {
                                // Net Weight is in KG, convert to Quintals by dividing by 100 (1 Quintal = 100 KG)
                                const totalPaddyWeightKG = productionRecords.reduce((sum: number, rec: any) =>
                                  sum + Number(rec.netWeight || 0), 0
                                );
                                const totalPaddyWeightQuintals = totalPaddyWeightKG / 100;

                                // Total produced quintals from by-products (including RJ Rice 1 and RJ Rice 2)
                                const totalByProductsQuintals = byProducts.reduce((sum: number, bp: any) =>
                                  sum + Number(bp.rice || 0) + Number(bp.rejectionRice || 0) + Number(bp.rjRice1 || 0) + Number(bp.rjRice2 || 0) +
                                  Number(bp.broken || 0) + Number(bp.rejectionBroken || 0) +
                                  Number(bp.zeroBroken || 0) + Number(bp.faram || 0) + Number(bp.bran || 0) + Number(bp.unpolished || 0), 0
                                );

                                // Yield % = (Produced Quintals / Paddy Quintals) * 100
                                return totalPaddyWeightQuintals > 0
                                  ? ((totalByProductsQuintals / totalPaddyWeightQuintals) * 100).toFixed(2)
                                  : '0.00';
                              })()} %
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* LEFT: Production Shifting Records - Below By-Products Table */}
                <div>
                  <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>Production Shifting Records</h3>
                  {productionRecords.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280' }}>No production records found</p>
                  ) : (
                    <ExcelTable>
                      <thead>
                        <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                          <th>Sl No</th>
                          <th>Date</th>
                          <th>Type of Movement</th>
                          <th>Broker</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Variety</th>
                          <th>Bags</th>
                          <th>Moisture</th>
                          <th>Cutting</th>
                          <th>Wb No</th>
                          <th>Net Weight</th>
                          <th>Lorry No</th>
                          <th>Rate/Q</th>
                          <th>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionRecords.map((record: any, idx: number) => {
                          const isForProduction = record.movementType === 'purchase' && record.outturnId;
                          return (
                            <tr key={record.id} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                              <td>{idx + 1}</td>
                              <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                              <td>{isForProduction ? 'For Production' : 'Production Shifting'}</td>
                              <td>{record.broker || '-'}</td>
                              <td>{isForProduction ? (record.fromLocation || 'Direct') : `${record.fromKunchinittu?.code || ''} - ${record.fromWarehouse?.name || ''}`}</td>
                              <td>{isForProduction ? '-' : `${record.toKunchinittu?.code || ''} - ${record.toWarehouseShift?.name || ''}`}</td>
                              <VarietyCell hasLocation={!!(record.variety && (record.fromKunchinittu || isForProduction))}>
                                {record.variety || '-'}
                              </VarietyCell>
                              <td>{record.bags || 0}</td>
                              <td>{record.moisture || '-'}</td>
                              <td>{record.cutting || '-'}</td>
                              <td>{record.wbNo || '-'}</td>
                              <td>{isNaN(Number(record.netWeight)) ? '0.00' : Number(record.netWeight || 0).toFixed(2)}</td>
                              <td>{record.lorryNumber || '-'}</td>
                              <td>
                                {/* For Production purchases: show purchase rate */}
                                {/* Production-shifting: show snapshot rate (or outturn rate as fallback) */}
                                {record.purchaseRate
                                  ? `₹${parseFloat(record.purchaseRate.averageRate).toFixed(2)}`
                                  : record.snapshotRate
                                    ? `₹${parseFloat(record.snapshotRate).toFixed(2)}`
                                    : record.outturn?.averageRate
                                      ? `₹${parseFloat(record.outturn.averageRate).toFixed(2)}`
                                      : '-'
                                }
                              </td>
                              <td>
                                {/* Only show total amount for "For Production" purchases with purchase rate */}
                                {record.purchaseRate
                                  ? `₹${parseFloat(record.purchaseRate.totalAmount).toFixed(2)}`
                                  : '-'
                                }
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total Net Weight and Amount Row */}
                        <tr style={{ backgroundColor: '#4a90e2', color: 'white', fontWeight: 'bold' }}>
                          <td colSpan={11} style={{ textAlign: 'right', padding: '10px' }}>Total:</td>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            {productionRecords.reduce((sum: number, rec: any) =>
                              sum + Number(rec.netWeight || 0), 0
                            ).toFixed(2)} kg
                          </td>
                          <td></td>
                          <td></td>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            ₹{productionRecords.reduce((sum: number, rec: any) => {
                              // Only sum "For Production" purchase amounts, not production-shifting
                              if (rec.purchaseRate?.totalAmount) {
                                return sum + Number(rec.purchaseRate.totalAmount);
                              }
                              return sum;
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </ExcelTable>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'stock' ? (
        /* Paddy Stock View - Full width layout */
        Object.keys(records).length === 0 ? (
          <EmptyState>
            <p>📭 No stock records found</p>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Records must be approved by admin to appear in paddy stock</p>
          </EmptyState>
        ) : (
          <div style={{ width: '100%' }}>
            {/* Date-wise stock with variety summary on right */}
            <RecordsContainer>
              {(() => {
                // Merge dates from records (Arrivals) and rice productions
                const recordDates = Object.keys(records);
                const riceProductionDates = allRiceProductions.map((rp: any) => rp.date);
                let allUniqueDates = Array.from(new Set([...recordDates, ...riceProductionDates])).sort();

                // Generate ALL dates in range (including no-transaction days)
                // ALWAYS generate full date range from min to max date in data
                let startDateStr = '';
                let endDateStr = '';

                if (dateFrom && dateTo) {
                  // User selected dates - use those
                  startDateStr = convertDateFormat(dateFrom);
                  endDateStr = convertDateFormat(dateTo);
                } else if (allUniqueDates.length > 0) {
                  // Auto-detect from data: use min and max dates
                  startDateStr = allUniqueDates[0];
                  endDateStr = allUniqueDates[allUniqueDates.length - 1];
                }

                // ALWAYS generate full date range (even without user selection)
                if (startDateStr && endDateStr) {
                  const startDate = new Date(startDateStr + 'T00:00:00');
                  const endDate = new Date(endDateStr + 'T00:00:00');
                  const allDatesInRange: string[] = [];
                  const currentDate = new Date(startDate);

                  while (currentDate <= endDate) {
                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const day = String(currentDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    allDatesInRange.push(dateStr);
                    currentDate.setDate(currentDate.getDate() + 1);
                  }

                  allUniqueDates = allDatesInRange;
                }

                // Reverse to show newest first
                allUniqueDates = allUniqueDates.reverse();

                return allUniqueDates.map((date) => {
                  // Get all records for this date (no filtering)
                  let dateRecords = records[date] || [];

                  // Track stock by variety and location (grouped)
                  const openingStockByKey: { [key: string]: { bags: number; variety: string; location: string } } = {};

                  // Track production shifting bags separately for opening stock
                  const openingProductionShifting: { [key: string]: { bags: number; variety: string; outturn: string; kunchinittu: string } } = {};

                  // Build opening stock from all dates BEFORE current date (chronologically, not by index)
                  // Get all dates in ascending order for calculation
                  const allDatesAscending = Array.from(new Set([...recordDates, ...riceProductionDates])).sort();
                  const datesBeforeCurrent = allDatesAscending.filter(d => d < date);
                  console.log(`[${date}] Dates before current:`, datesBeforeCurrent);

                  datesBeforeCurrent.forEach(prevDate => {
                    records[prevDate]?.forEach((rec: Arrival) => {
                      const variety = rec.variety || 'Unknown';

                      if (rec.movementType === 'purchase' && !rec.outturnId) {
                        // Normal Purchase: Add to warehouse destination location
                        const location = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouse?.name || ''}`;
                        const key = `${variety}-${location}`;

                        if (!openingStockByKey[key]) {
                          openingStockByKey[key] = { bags: 0, variety, location };
                        }
                        openingStockByKey[key].bags += rec.bags || 0;
                      } else if (rec.movementType === 'purchase' && rec.outturnId) {
                        // For-production purchase: Add directly to production shifting opening stock (no warehouse)
                        const outturn = rec.outturn?.code || `OUT${rec.outturnId}`;
                        const prodKey = `${variety}-${outturn}`;

                        if (!openingProductionShifting[prodKey]) {
                          openingProductionShifting[prodKey] = { bags: 0, variety, outturn, kunchinittu: '' };
                        }
                        openingProductionShifting[prodKey].bags += rec.bags || 0;
                      } else if (rec.movementType === 'shifting') {
                        // Normal shifting: Subtract from source, add to destination
                        const fromLocation = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                        const toLocation = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouseShift?.name || ''}`;
                        const fromKey = `${variety}-${fromLocation}`;
                        const toKey = `${variety}-${toLocation}`;

                        if (!openingStockByKey[fromKey]) {
                          openingStockByKey[fromKey] = { bags: 0, variety, location: fromLocation };
                        }
                        if (!openingStockByKey[toKey]) {
                          openingStockByKey[toKey] = { bags: 0, variety, location: toLocation };
                        }
                        openingStockByKey[fromKey].bags -= rec.bags || 0;
                        openingStockByKey[toKey].bags += rec.bags || 0;
                      } else if (rec.movementType === 'production-shifting') {
                        // Production-shifting: SUBTRACT from warehouse stock and ADD to production shifting opening stock
                        const fromLocation = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                        const fromKey = `${variety}-${fromLocation}`;
                        const outturn = rec.outturn?.code || '';
                        const prodKey = `${variety}-${outturn}`;

                        // Subtract from warehouse stock
                        if (!openingStockByKey[fromKey]) {
                          openingStockByKey[fromKey] = { bags: 0, variety, location: fromLocation };
                        }
                        openingStockByKey[fromKey].bags -= rec.bags || 0;

                        // Add to production shifting opening stock
                        if (!openingProductionShifting[prodKey]) {
                          openingProductionShifting[prodKey] = { bags: 0, variety, outturn, kunchinittu: '' };
                        }
                        openingProductionShifting[prodKey].bags += rec.bags || 0;
                      }
                    });
                  });

                  // Subtract rice production from opening production shifting stock (for all previous dates)
                  const allRiceProdsBeforeDate = allRiceProductions.filter((rp: any) => rp.date < date);
                  allRiceProdsBeforeDate.forEach((rp: any) => {
                    const outturnArrival = Object.values(records).flat().find((rec: any) =>
                      (rec.movementType === 'production-shifting' || (rec.movementType === 'purchase' && rec.outturnId)) &&
                      rec.outturn?.code === rp.outturn?.code
                    );

                    if (outturnArrival) {
                      const variety = outturnArrival.variety || 'Unknown';
                      const outturn = rp.outturn?.code || 'Unknown';
                      // Group by variety and outturn only (not kunchinittu) for opening stock
                      const prodKey = `${variety}-${outturn}`;

                      if (openingProductionShifting[prodKey]) {
                        // Use stored paddyBagsDeducted or calculate with new formula
                        const deductedBags = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '');
                        openingProductionShifting[prodKey].bags -= deductedBags;
                        // Prevent negative values
                        if (openingProductionShifting[prodKey].bags < 0) {
                          openingProductionShifting[prodKey].bags = 0;
                        }
                      }
                    }
                  });

                  const openingStockItems = Object.values(openingStockByKey);
                  console.log(`[${date}] Opening Stock Items:`, openingStockItems);
                  console.log(`[${date}] Opening Production Shifting:`, openingProductionShifting);

                  // Filter out cleared outturns from opening production shifting stock
                  // This ensures cleared outturns don't appear in opening stock on subsequent days (AFTER the clearing date)
                  console.log(`[${date}] Checking for cleared outturns in opening stock. Total rice productions:`, allRiceProductions.length);
                  Object.keys(openingProductionShifting).forEach(key => {
                    const item = openingProductionShifting[key];
                    console.log(`[${date}] Checking outturn ${item.outturn} in opening stock`);
                    // Find CLEARING entry in rice productions for this outturn
                    const clearingEntry = allRiceProductions.find((rp: any) =>
                      rp.outturn?.code === item.outturn &&
                      rp.locationCode === 'CLEARING'
                    );
                    if (clearingEntry) {
                      const clearingDate = clearingEntry.date;
                      console.log(`[${date}] Found CLEARING entry for ${item.outturn} on ${clearingDate}`);
                      // If outturn was cleared BEFORE this date (not on the same date), remove it from opening stock
                      // On the clearing date itself, we still show it in opening stock
                      if (clearingDate < date) {
                        console.log(`[${date}] ✅ Removing cleared outturn ${item.outturn} (cleared on ${clearingDate}) from opening production shifting stock`);
                        delete openingProductionShifting[key];
                      } else if (clearingDate === date) {
                        console.log(`[${date}] 📅 Outturn ${item.outturn} is being cleared TODAY, keeping in opening stock (will be removed from next day onwards)`);
                      } else {
                        console.log(`[${date}] ⏭️ Outturn ${item.outturn} will be cleared on ${clearingDate}, keeping in opening stock for now`);
                      }
                    } else {
                      console.log(`[${date}] No CLEARING entry found for ${item.outturn}`);
                    }
                  });

                  // Calculate closing stock (opening + today's movements)
                  // Deep copy to avoid mutating opening stock
                  const closingStockByKey: { [key: string]: { bags: number; variety: string; location: string; outturn?: string } } = {};
                  Object.entries(openingStockByKey).forEach(([key, value]) => {
                    closingStockByKey[key] = { ...value };
                  });

                  // Track production shifting bags separately with outturn info
                  // Start with opening production shifting stock
                  const productionShiftingClosing: { [key: string]: { bags: number; variety: string; outturn: string; kunchinittu: string } } = {};
                  Object.entries(openingProductionShifting).forEach(([key, value]) => {
                    productionShiftingClosing[key] = { ...value };
                  });

                  // Helper to safely update stock while preventing negative values
                  /**
                   * Updates stock levels for a given location/outturn
                   * @param stockMap - The stock tracking object (closingStockByKey or productionShiftingClosing)
                   * @param key - Unique key identifying the stock location (format varies by stock type)
                   * @param bags - Number of bags to add (positive) or subtract (negative)
                   * @param metadata - Additional data (variety, location, outturn, etc.)
                   * @returns true if operation succeeded, false if insufficient stock for subtraction
                   */
                  const updateStock = (stockMap: any, key: string, bags: number, metadata: any) => {
                    if (!stockMap[key]) {
                      stockMap[key] = { ...metadata, bags: 0 };
                    }

                    // For additions (positive bags), always allow
                    // For subtractions (negative bags), prevent going below 0
                    const newValue = stockMap[key].bags + bags;
                    stockMap[key].bags = Math.max(0, newValue);

                    // Return true if the operation was fully successful
                    return newValue >= 0;
                  };

                  /**
                   * PURCHASE TYPES:
                   * 1. Normal Purchase (toKunchinintuId present, outturnId null):
                   *    - Paddy goes to warehouse storage
                   *    - Adds to closingStockByKey (warehouse stock)
                   *    - Later moved to production via "production-shifting"
                   *    - Key format: "${variety}-${kunchinittu} - ${warehouse}"
                   * 
                   * 2. For Production Purchase (outturnId present, toKunchinintuId null):
                   *    - Paddy goes directly to production (bypasses warehouse)
                   *    - Does NOT add to closingStockByKey (warehouse stock)
                   *    - Adds directly to productionShiftingClosing (production stock)
                   *    - Key format: "${variety}-${kunchinittu}-${outturn}"
                   */
                  dateRecords.forEach((rec: Arrival) => {
                    const variety = rec.variety || 'Unknown';

                    if (rec.movementType === 'purchase') {
                      // Validation: Ensure purchase has either outturnId OR toKunchinintuId, not both or neither
                      const hasOutturn = !!rec.outturnId;
                      const hasWarehouse = !!rec.toKunchinintuId;

                      if (hasOutturn && hasWarehouse) {
                        console.warn(`⚠️ Purchase #${rec.id}: Has both outturnId and toKunchinintuId. Treating as For Production (outturn takes priority).`);
                      } else if (!hasOutturn && !hasWarehouse) {
                        console.warn(`⚠️ Purchase #${rec.id}: Missing both outturnId and toKunchinintuId. Treating as Normal Purchase with empty warehouse.`);
                        // Don't skip - let it be processed as normal purchase with empty warehouse
                      }

                      if (!rec.outturnId) {
                        // Normal Purchase: Add to warehouse stock (will be shifted to production later)
                        const location = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouse?.name || ''}`;
                        const key = `${variety}-${location}`;

                        console.log(`[${date}] Normal Purchase: Adding ${rec.bags} bags of ${variety} to warehouse (${location})`);
                        updateStock(closingStockByKey, key, rec.bags || 0, { variety, location });
                      } else {
                        // For Production Purchase: Skip warehouse stock, will be added to production stock later
                        console.log(`[${date}] For Production Purchase: Skipping warehouse stock for ${rec.bags} bags of ${variety} (goes directly to outturn)`);
                      }
                    } else if (rec.movementType === 'shifting') {
                      // Normal shifting: Subtract from source, add to destination
                      const fromLocation = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                      const toLocation = `${rec.toKunchinittu?.code || ''} - ${rec.toWarehouseShift?.name || ''}`;
                      const fromKey = `${variety}-${fromLocation}`;
                      const toKey = `${variety}-${toLocation}`;

                      // Only proceed with shifting if source has enough stock
                      const bags = rec.bags || 0;
                      if (updateStock(closingStockByKey, fromKey, -bags, { variety, location: fromLocation })) {
                        // If source deduction was successful, add to destination
                        updateStock(closingStockByKey, toKey, bags, { variety, location: toLocation });
                      } else {
                        console.warn(`⚠️ Insufficient warehouse stock in ${fromLocation} for shifting ${bags} bags of ${variety}`);
                      }
                    } else if (rec.movementType === 'production-shifting') {
                      // Production-shifting: SUBTRACT from warehouse stock and ADD to production stock
                      const fromLocation = `${rec.fromKunchinittu?.code || ''} - ${rec.fromWarehouse?.name || ''}`;
                      const fromKey = `${variety}-${fromLocation}`;
                      const kunchinittu = rec.fromKunchinittu?.code || '';
                      const outturn = rec.outturn?.code || '';
                      const prodKey = `${variety}-${kunchinittu}-${outturn}`;
                      const bags = rec.bags || 0;

                      // Subtract from warehouse stock
                      if (updateStock(closingStockByKey, fromKey, -bags, { variety, location: fromLocation })) {
                        // If warehouse deduction was successful, add to production stock
                        updateStock(productionShiftingClosing, prodKey, bags, { variety, outturn, kunchinittu });
                      } else {
                        console.warn(`⚠️ Insufficient warehouse stock in ${fromLocation} for production shifting ${bags} bags of ${variety} to ${outturn}`);
                      }
                    } else if (rec.movementType === 'purchase' && rec.outturnId) {
                      // For Production Purchase: Add DIRECTLY to production stock (bypasses warehouse)
                      // This does NOT affect closingStockByKey (warehouse stock)
                      const kunchinittu = rec.fromKunchinittu?.code || 'Direct';
                      const outturn = rec.outturn?.code || `OUT${rec.outturnId}`;
                      const key = `${variety}-${kunchinittu}-${outturn}`;

                      console.log(`[${date}] For Production Purchase: Adding ${rec.bags} bags of ${variety} directly to production (${outturn})`);
                      updateStock(productionShiftingClosing, key, rec.bags || 0, { variety, outturn, kunchinittu });
                    }
                  });

                  // Subtract rice production bags from production shifting closing stock
                  let todayRiceProductions = allRiceProductions.filter((rp: any) => rp.date === date);
                  console.log(`[${date}] Today's rice productions:`, todayRiceProductions);
                  console.log(`[${date}] Production shifting closing BEFORE rice deduction:`, productionShiftingClosing);

                  todayRiceProductions.forEach((rp: any) => {
                    // CRITICAL FIX: Ignore 'loading' (dispatch) entries for PADDY STOCK calculation.
                    // Loading entries are Rice Dispatches and should NOT reduce Paddy Stock.
                    if (rp.movementType === 'loading') {
                      return;
                    }

                    const riceOutturnCode = rp.outturn?.code || '';
                    const riceBags = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '');

                    console.log(`[${date}] Rice production - Outturn: ${riceOutturnCode}, Paddy Bags Deducted: ${riceBags}`);
                    console.log(`[${date}] Production shifting keys:`, Object.keys(productionShiftingClosing));

                    // Try to find matching key in productionShiftingClosing
                    // The key format is: ${variety}-${kunchinittu}-${outturn}
                    let matchedKey = null;
                    for (const key of Object.keys(productionShiftingClosing)) {
                      const parts = key.split('-');
                      const keyOutturn = parts[parts.length - 1]; // Last part is outturn code

                      console.log(`[${date}] Comparing key outturn "${keyOutturn}" with rice outturn "${riceOutturnCode}"`);

                      if (keyOutturn === riceOutturnCode) {
                        matchedKey = key;
                        break;
                      }
                    }

                    if (matchedKey && productionShiftingClosing[matchedKey]) {
                      const currentBags = productionShiftingClosing[matchedKey].bags;
                      const newBags = Math.max(0, currentBags - riceBags);

                      console.log(`[${date}] Deducting ${riceBags} paddy bags from ${matchedKey}: ${currentBags} -> ${newBags}`);

                      productionShiftingClosing[matchedKey].bags = newBags;

                      // Remove entry if bags reach 0
                      if (newBags === 0) {
                        delete productionShiftingClosing[matchedKey];
                      }
                    } else {
                      console.warn(`[${date}] No matching production shifting found for rice production outturn: ${riceOutturnCode}`);
                    }
                  });

                  console.log(`[${date}] Production shifting closing AFTER rice deduction:`, productionShiftingClosing);

                  // Filter out cleared outturns from production shifting stock
                  // Check if there's a CLEARING entry for this outturn on or before this date
                  Object.keys(productionShiftingClosing).forEach(key => {
                    const item = productionShiftingClosing[key];
                    // Find CLEARING entry in rice productions for this outturn
                    const clearingEntry = allRiceProductions.find((rp: any) =>
                      rp.outturn?.code === item.outturn &&
                      rp.locationCode === 'CLEARING'
                    );
                    if (clearingEntry) {
                      const clearingDate = clearingEntry.date;
                      // If outturn was cleared on or before this date, remove it from stock
                      if (clearingDate <= date) {
                        console.log(`[${date}] Removing cleared outturn ${item.outturn} (cleared on ${clearingDate}) from production shifting stock`);
                        delete productionShiftingClosing[key];
                      }
                    }
                  });

                  const closingStockItems = Object.values(closingStockByKey);
                  const productionShiftingItems = Object.values(productionShiftingClosing).filter((item: any) => item.bags > 0);

                  // Consistency check: Validate stock calculations
                  (() => {
                    const openingTotal = openingStockItems.reduce((sum: number, item: any) => sum + item.bags, 0) +
                      Object.values(openingProductionShifting).reduce((sum: number, item: any) => sum + item.bags, 0);
                    const closingTotal = closingStockItems.reduce((sum: number, item: any) => sum + item.bags, 0) +
                      productionShiftingItems.reduce((sum: number, item: any) => sum + item.bags, 0);

                    // Calculate net movements (purchases add, rice production subtracts)
                    const purchases = dateRecords.filter((r: Arrival) => r.movementType === 'purchase')
                      .reduce((sum: number, r: Arrival) => sum + (r.bags || 0), 0);
                    const riceProduction = todayRiceProductions.reduce((sum: number, rp: any) => sum + (rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '')), 0);
                    const forProduction = dateRecords.filter((r: Arrival) => r.movementType === 'purchase' && r.outturnId)
                      .reduce((sum: number, r: Arrival) => sum + (r.bags || 0), 0);

                    const expectedClosing = openingTotal + purchases + forProduction - riceProduction;

                    // Allow small rounding differences (< 1 bag)
                    if (Math.abs(closingTotal - expectedClosing) > 0.5) {
                      console.warn(`[${date}] Stock calculation mismatch detected:`, {
                        opening: openingTotal,
                        purchases,
                        forProduction,
                        riceProduction,
                        expectedClosing,
                        actualClosing: closingTotal,
                        difference: closingTotal - expectedClosing
                      });
                    }
                  })();

                  // Check if this is a working day (has transactions or rice productions)
                  const hasTransactions = dateRecords.length > 0 || todayRiceProductions.length > 0;

                  return (
                    <StockSection key={date} style={{
                      backgroundColor: hasTransactions ? 'white' : '#f9fafb'
                    }}>
                      <StockDate style={{
                        backgroundColor: hasTransactions ? '#4472c4' : '#9ca3af',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>
                          {new Date(date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          }).replace(/\u200E/g, '').trim()}
                        </span>
                        {!hasTransactions && (
                          <span style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            Mill Closed
                          </span>
                        )}
                      </StockDate>

                      {/* Calculate kunchinittu stock BEFORE layout so both columns can use it */}
                      {(() => {
                        // Use the already-calculated openingProductionShifting
                        const productionShiftingBags = openingProductionShifting;

                        // Calculate kunchinittu-wise stock (regular stock, NOT including production-shifting)
                        // Group by kunchinittu only, not by warehouse
                        const kunchinintuStock: { [key: string]: { bags: number; variety: string; kunchinittu: string; warehouse: string } } = {};
                        openingStockItems.forEach((item: any) => {
                          const locationParts = item.location.split(' - ');
                          const kunchinittu = locationParts[0] || '';
                          const warehouse = locationParts[1] || '';
                          const key = `${item.variety}-${kunchinittu}`;

                          if (!kunchinintuStock[key]) {
                            kunchinintuStock[key] = { bags: 0, variety: item.variety, kunchinittu, warehouse };
                          }
                          kunchinintuStock[key].bags += item.bags;
                        });

                        const kunchinintuTotal = Object.values(kunchinintuStock).reduce((sum: number, item: any) => sum + item.bags, 0);
                        const productionTotal = Object.values(productionShiftingBags).reduce((sum: number, item: any) => sum + item.bags, 0);

                        return (
                          <>
                            {/* Two column layout: Left = Kunchinittu-wise (full width), Right = Variety-wise summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
                              {/* LEFT COLUMN: Kunchinittu-wise bifurcation */}
                              <div>

                                {/* Opening Stock - Separate display for kunchinittu stock and production-shifting */}
                                {(openingStockItems.length > 0 || Object.values(openingProductionShifting).some((item: any) => item.bags > 0)) && (
                                  <>
                                    {(() => {

                                      return (
                                        <>
                                          {/* Kunchinittu-wise stock */}
                                          <table style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontFamily: 'Calibri, sans-serif',
                                            fontSize: '11pt',
                                            marginBottom: '5px',
                                            border: 'none'
                                          }}>
                                            <tbody>
                                              {Object.values(kunchinintuStock)
                                                .filter((item: any) => item.bags > 0)
                                                .sort((a: any, b: any) => {
                                                  // Sort by variety first, then by kunchinittu
                                                  const varietyCompare = a.variety.localeCompare(b.variety);
                                                  if (varietyCompare !== 0) return varietyCompare;
                                                  return a.kunchinittu.localeCompare(b.kunchinittu);
                                                })
                                                .map((item: any, idx: number) => {
                                                  // Check if this kunchinittu was used for production shifting, purchase, OR shifting today
                                                  const isUsedToday = dateRecords.some((rec: Arrival) =>
                                                    (rec.movementType === 'production-shifting' || rec.movementType === 'purchase' || rec.movementType === 'shifting') &&
                                                    (rec.fromKunchinittu?.code === item.kunchinittu || rec.toKunchinittu?.code === item.kunchinittu)
                                                  );

                                                  return (
                                                    <tr key={idx}>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: isUsedToday ? '#fff3cd' : 'transparent',
                                                        fontWeight: 'bold',
                                                        width: '10%',
                                                        textAlign: 'right'
                                                      }}>
                                                        {item.bags}
                                                      </td>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        fontWeight: 'bold',
                                                        width: '15%',
                                                        textAlign: 'left'
                                                      }}>
                                                        {item.variety}
                                                      </td>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        fontWeight: 'bold',
                                                        width: '75%',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        color: '#2563eb'
                                                      }}
                                                        onClick={() => {
                                                          // Navigate to Kunchinittu Ledger page
                                                          // Open in new tab with kunchinittu code as query parameter
                                                          console.log('🔗 Opening ledger for kunchinittu:', item.kunchinittu);
                                                          const url = `/ledger?code=${item.kunchinittu}`;
                                                          console.log('🔗 URL:', url);
                                                          window.open(url, '_blank');
                                                        }}
                                                      >
                                                        {item.kunchinittu} - {item.warehouse}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                            </tbody>
                                          </table>

                                          {/* Kunchinittu subtotal - only show if there are production entries */}
                                          {kunchinintuTotal > 0 && productionTotal > 0 && (
                                            <div style={{
                                              borderTop: '3px solid #000',
                                              padding: '8px 8px 8px 0',
                                              fontWeight: 'bold',
                                              fontSize: '11pt',
                                              fontFamily: 'Calibri, sans-serif',
                                              marginBottom: '5px',
                                              width: '10%',
                                              textAlign: 'right'
                                            }}>
                                              {kunchinintuTotal}
                                            </div>
                                          )}

                                          {/* Production-shifting stock (Outturn remaining bags) - in table format to align with kunchinittu entries */}
                                          {Object.values(productionShiftingBags).filter((item: any) => item.bags > 0).length > 0 && (
                                            <table style={{
                                              width: '100%',
                                              borderCollapse: 'collapse',
                                              fontFamily: 'Calibri, sans-serif',
                                              fontSize: '11pt',
                                              marginBottom: '5px',
                                              border: 'none'
                                            }}>
                                              <tbody>
                                                {Object.values(productionShiftingBags)
                                                  .filter((item: any) => item.bags > 0)
                                                  .sort((a: any, b: any) => {
                                                    // Sort by outturn code (out01, out02, etc.)
                                                    const aNum = parseInt(a.outturn.replace(/\D/g, '')) || 0;
                                                    const bNum = parseInt(b.outturn.replace(/\D/g, '')) || 0;
                                                    return aNum - bNum;
                                                  })
                                                  .map((item: any, idx: number) => (
                                                    <tr key={`prod-${idx}`}>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: '#ffb366',
                                                        fontWeight: 'bold',
                                                        width: '10%',
                                                        textAlign: 'right'
                                                      }}>
                                                        {item.bags}
                                                      </td>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        fontWeight: 'bold',
                                                        width: '15%',
                                                        textAlign: 'left'
                                                      }}>
                                                        {item.variety}
                                                      </td>
                                                      <td style={{
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        backgroundColor: 'transparent',
                                                        fontWeight: 'bold',
                                                        width: '75%',
                                                        textAlign: 'left',
                                                        color: '#7c3aed',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                      }}
                                                        onClick={() => {
                                                          // Find the outturn by code (check both outturnNumber and code fields)
                                                          const outturn = outturns.find((o: any) =>
                                                            (o.outturnNumber === item.outturn) || (o.code === item.outturn)
                                                          );
                                                          if (outturn) {
                                                            setSelectedOutturnId(outturn.id.toString());
                                                            setActiveTab('outturn-report');
                                                          }
                                                        }}
                                                      >
                                                        {item.outturn}
                                                      </td>
                                                    </tr>
                                                  ))}
                                              </tbody>
                                            </table>
                                          )}


                                          {/* Total Opening Stock */}
                                          <div style={{
                                            borderTop: '3px solid #000',
                                            padding: '8px 8px 8px 0',
                                            fontWeight: 'bold',
                                            fontSize: '11pt',
                                            fontFamily: 'Calibri, sans-serif',
                                            marginBottom: '15px',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}>
                                            <span style={{ width: '10%', textAlign: 'right', paddingRight: '8px' }}>
                                              {kunchinintuTotal + productionTotal}
                                            </span>
                                            <span style={{ width: '90%', textAlign: 'left' }}>
                                              Opening Stock
                                            </span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </>
                                )}

                                {/* Daily Movements - Grouped by variety with color coding and highlight matching */}
                                {(() => {
                                  // Create a set of variety-kunchinittu combinations from opening stock for highlighting
                                  const openingStockKeys = new Set(
                                    openingStockItems.map((item: any) => {
                                      const kunchinintuCode = item.location.split(' - ')[0]; // Extract kunchinittu code
                                      return `${item.variety}-${kunchinintuCode}`;
                                    })
                                  );

                                  // Group purchases by variety and destination
                                  const purchaseGroups: { [key: string]: { bags: number; broker: string; variety: string; date: string; to: string; outturn?: string; highlight: boolean } } = {};
                                  const shiftingGroups: { [key: string]: { bags: number; variety: string; date: string; from: string; to: string; highlight: boolean } } = {};
                                  const productionGroups: { [key: string]: { bags: number; variety: string; date: string; from: string; to: string; highlight: boolean } } = {};

                                  dateRecords.forEach((record: Arrival) => {
                                    if (record.movementType === 'purchase') {
                                      // Check if this is a for-production purchase (has outturnId)
                                      const isForProduction = !!record.outturnId;

                                      console.log(`🔍 Purchase Record #${record.id}:`, {
                                        movementType: record.movementType,
                                        outturnId: record.outturnId,
                                        isForProduction: isForProduction,
                                        outturn: record.outturn,
                                        variety: record.variety,
                                        broker: record.broker
                                      });

                                      if (isForProduction) {
                                        // For Production purchase - goes directly to outturn (bypasses warehouse)
                                        const outturnCode = record.outturn?.code || (record.outturnId ? `OUT${record.outturnId}` : 'UNKNOWN');
                                        const outturnDisplay = record.outturn ? `${record.outturn.code} - ${record.outturn.allottedVariety || ''}` : outturnCode;
                                        console.log(`✓ For Production Purchase #${record.id}:`, {
                                          variety: record.variety,
                                          bags: record.bags,
                                          broker: record.broker,
                                          outturnId: record.outturnId,
                                          outturnCode: outturnCode,
                                          outturnObject: record.outturn
                                        });
                                        const key = `${record.variety}-${record.broker}-${outturnCode}-${record.id}`;

                                        if (!purchaseGroups[key]) {
                                          purchaseGroups[key] = {
                                            bags: 0,
                                            broker: record.broker || '-',
                                            variety: record.variety || '-',
                                            date: record.date || '',
                                            to: outturnDisplay,
                                            outturn: outturnCode,
                                            highlight: false
                                          };
                                        }
                                        purchaseGroups[key].bags += record.bags || 0;
                                        console.log(`✓ Created purchase group with outturn: ${outturnCode}`);
                                      } else {
                                        // Normal purchase - goes to warehouse (will later be shifted to production)
                                        const toKunchinittu = record.toKunchinittu?.code || '';
                                        const toWarehouse = record.toWarehouse?.name || '';
                                        console.log(`✓ Normal Purchase #${record.id}: ${record.variety} (${record.bags} bags) → Warehouse: ${toKunchinittu} - ${toWarehouse} | Broker: ${record.broker}`);

                                        const key = `${record.variety}-${record.broker}-${toKunchinittu}-${record.id}`;
                                        const highlightKey = `${record.variety}-${toKunchinittu}`;
                                        const shouldHighlight = openingStockKeys.has(highlightKey);

                                        if (!purchaseGroups[key]) {
                                          purchaseGroups[key] = {
                                            bags: 0,
                                            broker: record.broker || '-',
                                            variety: record.variety || '-',
                                            date: record.date || '',
                                            to: `${toKunchinittu} - ${toWarehouse}`,
                                            highlight: shouldHighlight
                                          };
                                        }
                                        purchaseGroups[key].bags += record.bags || 0;
                                      }
                                    } else if (record.movementType === 'production-shifting') {
                                      const fromKunchinittu = record.fromKunchinittu?.code || '';
                                      const outturnCode = record.outturn?.code || '';
                                      // Use record ID to keep each entry separate (no grouping on same day)
                                      const key = `${record.variety}-${fromKunchinittu}-${outturnCode}-${record.id}`;
                                      const highlightKey = `${record.variety}-${fromKunchinittu}`;
                                      const shouldHighlight = openingStockKeys.has(highlightKey);

                                      // Format destination with outturn code
                                      const destination = outturnCode
                                        ? `→ Production (${outturnCode})`
                                        : '→ Production';

                                      // Format source
                                      const from = `${fromKunchinittu} - ${record.fromWarehouse?.name || ''}`;

                                      if (!productionGroups[key]) {
                                        productionGroups[key] = {
                                          bags: 0,
                                          variety: record.variety || '-',
                                          date: record.date || '',
                                          from,
                                          to: destination,
                                          highlight: shouldHighlight
                                        };
                                      }
                                      productionGroups[key].bags += record.bags || 0;
                                    } else if (record.movementType === 'shifting') {
                                      const fromKunchinittu = record.fromKunchinittu?.code || '';
                                      const toKunchinittu = record.toKunchinittu?.code || '';
                                      // Use record ID to keep each entry separate (no grouping on same day)
                                      const key = `${record.variety}-${fromKunchinittu}-${toKunchinittu}-${record.id}`;
                                      const highlightKey = `${record.variety}-${fromKunchinittu}`;
                                      const shouldHighlight = openingStockKeys.has(highlightKey);

                                      if (!shiftingGroups[key]) {
                                        shiftingGroups[key] = {
                                          bags: 0,
                                          variety: record.variety || '-',
                                          date: record.date || '',
                                          from: `${fromKunchinittu} - ${record.fromWarehouse?.name || ''}`,
                                          to: `${toKunchinittu} - ${record.toWarehouseShift?.name || ''}`,
                                          highlight: shouldHighlight
                                        };
                                      }
                                      shiftingGroups[key].bags += record.bags || 0;
                                    }
                                  });

                                  return (
                                    <>
                                      {/* Purchase entries - GREEN */}
                                      <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontFamily: 'Calibri, sans-serif',
                                        fontSize: '11pt',
                                        marginBottom: '5px',
                                        border: 'none'
                                      }}>
                                        <tbody>
                                          {Object.values(purchaseGroups).map((group, idx) => {
                                            // Check if this is For Production by checking if outturn field exists
                                            const isForProduction = !!group.outturn && group.outturn !== '';

                                            // Debug: Log the entire group object
                                            console.log(`📊 Purchase Group #${idx}:`, group);

                                            // Determine what to display in destination column
                                            let destinationDisplay = '';
                                            let displayColor = '#000';

                                            if (isForProduction) {
                                              // For Production Purchase: show outturn in purple
                                              destinationDisplay = group.outturn || 'UNKNOWN';
                                              displayColor = '#7c3aed';
                                            } else {
                                              // Normal Purchase: show warehouse location in black
                                              // Clean up the display - remove empty parts
                                              const toValue = group.to || '';
                                              if (toValue === ' - ' || toValue === '-' || toValue.trim() === '') {
                                                destinationDisplay = '-';
                                              } else {
                                                destinationDisplay = toValue;
                                              }
                                              displayColor = '#000';
                                            }

                                            return (
                                              <tr key={`purchase-${idx}`}>
                                                <td style={{
                                                  backgroundColor: '#d4edda',
                                                  padding: '4px 8px',
                                                  border: 'none',
                                                  fontFamily: 'Calibri, sans-serif',
                                                  fontSize: '11pt',
                                                  fontWeight: 'bold',
                                                  width: '10%',
                                                  textAlign: 'right'
                                                }}>
                                                  +{group.bags}
                                                </td>
                                                <td style={{
                                                  backgroundColor: 'transparent',
                                                  padding: '4px 8px',
                                                  border: 'none',
                                                  fontFamily: 'Calibri, sans-serif',
                                                  fontSize: '11pt',
                                                  fontWeight: 'bold',
                                                  width: '15%',
                                                  textAlign: 'left'
                                                }}>
                                                  {group.variety}
                                                </td>
                                                <td style={{
                                                  backgroundColor: 'transparent',
                                                  padding: '4px 8px',
                                                  border: 'none',
                                                  fontFamily: 'Calibri, sans-serif',
                                                  fontSize: '11pt',
                                                  fontWeight: 'bold',
                                                  width: '18%',
                                                  textAlign: 'left'
                                                }}>
                                                  {group.broker}
                                                </td>
                                                <td style={{
                                                  backgroundColor: 'transparent',
                                                  padding: '4px 2px',
                                                  border: 'none',
                                                  fontFamily: 'Calibri, sans-serif',
                                                  fontSize: '11pt',
                                                  fontWeight: 'bold',
                                                  width: '3%',
                                                  textAlign: 'center',
                                                  color: '#000'
                                                }}>
                                                  to
                                                </td>
                                                <td style={{
                                                  backgroundColor: 'transparent',
                                                  padding: '4px 8px',
                                                  border: 'none',
                                                  fontFamily: 'Calibri, sans-serif',
                                                  fontSize: '11pt',
                                                  fontWeight: 'bold',
                                                  width: '54%',
                                                  textAlign: 'left',
                                                  color: displayColor
                                                }}>
                                                  {destinationDisplay}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>

                                      {/* Shifting entries - PURPLE/PINK (darker if highlighted) */}
                                      <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontFamily: 'Calibri, sans-serif',
                                        fontSize: '11pt',
                                        marginBottom: '5px',
                                        border: 'none'
                                      }}>
                                        <tbody>
                                          {Object.values(shiftingGroups).map((group, idx) => (
                                            <tr key={`shifting-${idx}`}>
                                              <td style={{
                                                backgroundColor: group.highlight ? '#d4bfe6' : '#e2d4ed',
                                                padding: '4px 8px',
                                                border: 'none',
                                                fontFamily: 'Calibri, sans-serif',
                                                fontSize: '11pt',
                                                fontWeight: 'bold',
                                                width: '10%',
                                                textAlign: 'right'
                                              }}>
                                                +-{group.bags}
                                              </td>
                                              <td style={{
                                                backgroundColor: 'transparent',
                                                padding: '4px 8px',
                                                border: 'none',
                                                fontFamily: 'Calibri, sans-serif',
                                                fontSize: '11pt',
                                                fontWeight: 'bold',
                                                width: '15%',
                                                textAlign: 'left'
                                              }}>
                                                {group.variety}
                                              </td>
                                              <td style={{
                                                backgroundColor: 'transparent',
                                                padding: '4px 8px',
                                                border: 'none',
                                                fontFamily: 'Calibri, sans-serif',
                                                fontSize: '11pt',
                                                fontWeight: 'bold',
                                                width: '18%',
                                                textAlign: 'left'
                                              }}>
                                                {group.from}
                                              </td>
                                              <td style={{
                                                backgroundColor: 'transparent',
                                                padding: '4px 2px',
                                                border: 'none',
                                                fontFamily: 'Calibri, sans-serif',
                                                fontSize: '11pt',
                                                fontWeight: 'bold',
                                                width: '3%',
                                                textAlign: 'center',
                                                color: '#000'
                                              }}>
                                                to
                                              </td>
                                              <td style={{
                                                backgroundColor: 'transparent',
                                                padding: '4px 8px',
                                                border: 'none',
                                                fontFamily: 'Calibri, sans-serif',
                                                fontSize: '11pt',
                                                fontWeight: 'bold',
                                                width: '54%',
                                                textAlign: 'left'
                                              }}>
                                                {group.to}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>

                                      {/* Production-Shifting entries - ORANGE - Show each entry individually */}
                                      <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontFamily: 'Calibri, sans-serif',
                                        fontSize: '11pt',
                                        marginBottom: '5px',
                                        border: 'none'
                                      }}>
                                        <tbody>
                                          {Object.values(productionGroups)
                                            .sort((a: any, b: any) => {
                                              // Sort by outturn code
                                              const aOutturn = a.to.match(/\(([^)]+)\)/)?.[1] || '';
                                              const bOutturn = b.to.match(/\(([^)]+)\)/)?.[1] || '';
                                              const aNum = parseInt(aOutturn.replace(/\D/g, '')) || 0;
                                              const bNum = parseInt(bOutturn.replace(/\D/g, '')) || 0;
                                              return aNum - bNum;
                                            })
                                            .map((group: any, idx: number) => {
                                              const outturn = group.to.match(/\(([^)]+)\)/)?.[1] || '';
                                              return (
                                                <tr key={`production-${idx}`}>
                                                  <td style={{
                                                    backgroundColor: '#ffb366',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    fontFamily: 'Calibri, sans-serif',
                                                    fontSize: '11pt',
                                                    fontWeight: 'bold',
                                                    width: '10%',
                                                    textAlign: 'right'
                                                  }}>
                                                    (-) {group.bags} → {outturn}
                                                  </td>
                                                  <td style={{
                                                    backgroundColor: 'transparent',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    fontFamily: 'Calibri, sans-serif',
                                                    fontSize: '11pt',
                                                    fontWeight: 'bold',
                                                    width: '15%',
                                                    textAlign: 'left'
                                                  }}>
                                                    {group.variety}
                                                  </td>
                                                  <td style={{
                                                    backgroundColor: 'transparent',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    fontFamily: 'Calibri, sans-serif',
                                                    fontSize: '11pt',
                                                    fontWeight: 'bold',
                                                    width: '18%',
                                                    textAlign: 'left'
                                                  }}>
                                                    {group.from}
                                                  </td>
                                                  <td style={{
                                                    backgroundColor: 'transparent',
                                                    padding: '4px 2px',
                                                    border: 'none',
                                                    fontFamily: 'Calibri, sans-serif',
                                                    fontSize: '11pt',
                                                    fontWeight: 'bold',
                                                    width: '3%',
                                                    textAlign: 'center',
                                                    color: '#000'
                                                  }}>
                                                    to
                                                  </td>
                                                  <td style={{
                                                    backgroundColor: 'transparent',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    fontFamily: 'Calibri, sans-serif',
                                                    fontSize: '11pt',
                                                    fontWeight: 'bold',
                                                    width: '54%',
                                                    textAlign: 'left'
                                                  }}>
                                                    {outturn}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                      </table>

                                      {/* Rice Production Consumption - RED - GROUPED BY OUTTURN */}
                                      {(() => {
                                        // Group rice productions by outturn
                                        const riceDeductionByOutturn: { [key: string]: { bags: number; variety: string; outturnCode: string } } = {};

                                        todayRiceProductions
                                          .filter((rp: any) => {
                                            // Filter out rice productions with 0 bags deducted (like Bran, Farm Bran)
                                            const deductedBags = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '');
                                            return deductedBags > 0;
                                          })
                                          .forEach((rp: any) => {
                                            const outturnCode = rp.outturn?.code || 'UNKNOWN';
                                            const deductedBags = rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '');

                                            // Get variety
                                            let variety = 'Unknown';
                                            if (rp.outturn?.allottedVariety) {
                                              variety = rp.outturn.allottedVariety;
                                            } else if (outturnCode) {
                                              const matchingKey = Object.keys(productionShiftingClosing).find(key => {
                                                const parts = key.split('-');
                                                const keyOutturn = parts[parts.length - 1];
                                                return keyOutturn === outturnCode;
                                              });

                                              if (matchingKey) {
                                                const parts = matchingKey.split('-');
                                                variety = parts[0];
                                              } else {
                                                const outturnArrival = Object.values(records).flat().find((rec: any) =>
                                                  (rec.movementType === 'production-shifting' || (rec.movementType === 'purchase' && rec.outturnId)) &&
                                                  rec.outturn?.code === outturnCode
                                                );
                                                if (outturnArrival) {
                                                  variety = outturnArrival.variety || 'Unknown';
                                                }
                                              }
                                            }

                                            // Group by outturn
                                            if (!riceDeductionByOutturn[outturnCode]) {
                                              riceDeductionByOutturn[outturnCode] = {
                                                bags: 0,
                                                variety,
                                                outturnCode
                                              };
                                            }
                                            riceDeductionByOutturn[outturnCode].bags += deductedBags;
                                          });

                                        const riceDeductionGroups = Object.values(riceDeductionByOutturn);

                                        return riceDeductionGroups.length > 0 && (
                                          <table style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontFamily: 'Calibri, sans-serif',
                                            fontSize: '11pt',
                                            marginBottom: '5px',
                                            border: 'none'
                                          }}>
                                            <tbody>
                                              {riceDeductionGroups.map((group, idx: number) => {
                                                return (
                                                  <tr key={`rice-deduction-${idx}`}>
                                                    <td style={{
                                                      padding: '4px 8px',
                                                      border: 'none',
                                                      backgroundColor: '#ff9999',
                                                      fontWeight: 'bold',
                                                      width: '10%',
                                                      textAlign: 'right',
                                                      color: '#991f1f'
                                                    }}>
                                                      (-) {group.bags}
                                                    </td>
                                                    <td style={{
                                                      padding: '4px 8px',
                                                      border: 'none',
                                                      backgroundColor: 'transparent',
                                                      fontWeight: 'bold',
                                                      width: '15%',
                                                      textAlign: 'left',
                                                      color: '#dc2626'
                                                    }}>
                                                      {group.variety}
                                                    </td>
                                                    <td style={{
                                                      padding: '4px 8px',
                                                      border: 'none',
                                                      backgroundColor: 'transparent',
                                                      fontWeight: 'bold',
                                                      width: '75%',
                                                      textAlign: 'left',
                                                      color: '#dc2626',
                                                      cursor: 'pointer',
                                                      textDecoration: 'underline'
                                                    }}
                                                      onClick={() => {
                                                        // Find the outturn by code (check both outturnNumber and code fields)
                                                        const outturn = outturns.find((o: any) =>
                                                          (o.outturnNumber === group.outturnCode) || (o.code === group.outturnCode)
                                                        );
                                                        if (outturn) {
                                                          setSelectedOutturnId(outturn.id.toString());
                                                          setActiveTab('outturn-report');
                                                        }
                                                      }}
                                                    >
                                                      {group.outturnCode} → Rice Production
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        );
                                      })()}

                                      {/* Loading (Dispatch) Entries - NOT SHOWN IN PADDY STOCK */}
                                      {/* Loading entries are rice dispatches and don't affect paddy stock */}
                                      {/* They represent rice being loaded onto trucks (already converted from paddy) */}
                                    </>
                                  );
                                })()}

                                {/* Closing Stock - Total only (bifurcation hidden but calculated in backend) */}
                                {(closingStockItems.length > 0 || productionShiftingItems.length > 0) && (
                                  <>
                                    {/* Calculate bifurcation for backend/internal use but don't display */}
                                    {(() => {
                                      // Group closing stock by variety and kunchinittu (not warehouse) - for calculation only
                                      const kunchinintuGrouped: { [key: string]: { bags: number; variety: string; kunchinittu: string; warehouse: string } } = {};

                                      closingStockItems.forEach((item: any) => {
                                        const locationParts = item.location.split(' - ');
                                        const kunchinittu = locationParts[0] || '';
                                        const warehouse = locationParts[1] || '';
                                        const key = `${item.variety}-${kunchinittu}`;

                                        if (!kunchinintuGrouped[key]) {
                                          kunchinintuGrouped[key] = {
                                            bags: 0,
                                            variety: item.variety,
                                            kunchinittu,
                                            warehouse
                                          };
                                        }
                                        kunchinintuGrouped[key].bags += item.bags;
                                      });

                                      // Bifurcation is calculated but not displayed
                                      // This data is available for backend processing if needed
                                      return null;
                                    })()}

                                    <div style={{
                                      borderTop: '3px solid #000',
                                      padding: '8px 8px 8px 0',
                                      fontWeight: 'bold',
                                      fontSize: '11pt',
                                      fontFamily: 'Calibri, sans-serif',
                                      marginTop: '15px',
                                      marginBottom: '15px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ width: '10%', textAlign: 'right', paddingRight: '8px' }}>
                                        {closingStockItems.reduce((sum: number, item: any) => sum + item.bags, 0) +
                                          productionShiftingItems.reduce((sum: number, item: any) => sum + item.bags, 0)}
                                      </span>
                                      <span style={{ width: '90%', textAlign: 'left' }}>
                                        Closing Stock
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* RIGHT COLUMN: Variety-wise summary AND Working section */}
                              <div style={{ position: 'sticky', top: '20px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                                {/* Working Section - Rice Production Deductions - ALWAYS SHOW on working days */}
                                {hasTransactions && (
                                  <div style={{
                                    backgroundColor: 'white',
                                    border: '2px solid #ef4444',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    maxWidth: '150px'
                                  }}>
                                    <div style={{
                                      backgroundColor: '#ef4444',
                                      color: 'white',
                                      padding: '0.3rem',
                                      fontWeight: 'bold',
                                      fontSize: '8pt',
                                      textAlign: 'center'
                                    }}>
                                      Working
                                    </div>
                                    <div style={{ padding: '0.4rem', fontSize: '8pt' }}>
                                      {(() => {
                                        // MONTH-WISE CALCULATION: Reset on 1st of each month
                                        const currentDate = new Date(date + 'T00:00:00');
                                        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                        const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];

                                        // Calculate cumulative total up to YESTERDAY (all days before today in current month)
                                        const daysBeforeToday = allRiceProductions.filter((rp: any) =>
                                          rp.date >= firstDayOfMonthStr && rp.date < date
                                        );
                                        const cumulativeBeforeToday = daysBeforeToday.reduce((sum: number, rp: any) =>
                                          sum + (rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '')), 0
                                        );

                                        // Calculate today's total
                                        const todayProds = allRiceProductions.filter((rp: any) => rp.date === date);
                                        const todayTotal = todayProds.reduce((sum: number, rp: any) =>
                                          sum + (rp.paddyBagsDeducted || calculatePaddyBagsDeducted(rp.quantityQuintals || 0, rp.productType || '')), 0
                                        );

                                        // Total for the month up to today
                                        const monthTotal = cumulativeBeforeToday + todayTotal;

                                        return (
                                          <div>
                                            {/* Show month-wise cumulative calculation */}
                                            <div>
                                              <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.15rem', fontSize: '7pt' }}>
                                                {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                              </div>
                                              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#374151' }}>
                                                {cumulativeBeforeToday}
                                              </div>
                                              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#dc2626', borderBottom: '1px solid #000', paddingBottom: '1px' }}>
                                                {todayTotal}
                                              </div>
                                              <div style={{ textAlign: 'right', fontSize: '8pt', fontWeight: 'bold', color: '#374151', paddingTop: '1px' }}>
                                                {monthTotal}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Variety-wise Opening Stock */}
                                {/* Group kunchinittu stock by variety, then show outturn entries separately */}
                                {(() => {
                                  // Group kunchinittu stock by variety only
                                  const kunchinintuVarietyMap: { [variety: string]: number } = {};
                                  Object.values(kunchinintuStock).forEach((item: any) => {
                                    if (!kunchinintuVarietyMap[item.variety]) {
                                      kunchinintuVarietyMap[item.variety] = 0;
                                    }
                                    kunchinintuVarietyMap[item.variety] += item.bags;
                                  });

                                  // Group production shifting by variety and outturn
                                  const productionVarietyMap: { [key: string]: { variety: string; outturn: string; bags: number } } = {};
                                  Object.values(productionShiftingBags).forEach((item: any) => {
                                    const key = `${item.variety}-${item.outturn}`;
                                    if (!productionVarietyMap[key]) {
                                      productionVarietyMap[key] = {
                                        variety: item.variety,
                                        outturn: item.outturn,
                                        bags: 0
                                      };
                                    }
                                    productionVarietyMap[key].bags += item.bags;
                                  });

                                  const sortedKunchinintuVarieties = Object.entries(kunchinintuVarietyMap)
                                    .filter(([_, bags]) => bags > 0)
                                    .sort((a, b) => a[0].localeCompare(b[0]));

                                  const sortedProductionEntries = Object.values(productionVarietyMap)
                                    .filter((item: any) => item.bags > 0)
                                    .sort((a: any, b: any) => {
                                      const varietyCompare = a.variety.localeCompare(b.variety);
                                      if (varietyCompare !== 0) return varietyCompare;
                                      return a.outturn.localeCompare(b.outturn);
                                    });

                                  const kunchinintuTotal = sortedKunchinintuVarieties.reduce((sum, [_, bags]) => sum + bags, 0);
                                  const productionTotal = sortedProductionEntries.reduce((sum, item) => sum + item.bags, 0);
                                  const totalBags = kunchinintuTotal + productionTotal;

                                  return (
                                    <div style={{
                                      backgroundColor: 'white',
                                      border: '2px solid #4a90e2',
                                      borderRadius: '8px',
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{
                                        backgroundColor: '#4a90e2',
                                        color: 'white',
                                        padding: '0.5rem',
                                        fontWeight: 'bold',
                                        fontSize: '11pt',
                                        textAlign: 'center'
                                      }}>
                                        Variety-wise Opening Stock
                                      </div>
                                      <ExcelTable style={{ fontSize: '10pt', marginBottom: 0 }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                                            <th>Variety</th>
                                            <th>Bags</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {/* Kunchinittu stock - grouped by variety */}
                                          {sortedKunchinintuVarieties.map(([variety, bags], idx) => (
                                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                                              <td>{variety}</td>
                                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{bags}</td>
                                            </tr>
                                          ))}

                                          {/* Production shifting - show with outturn, orange background */}
                                          {sortedProductionEntries.map((item: any, idx: number) => (
                                            <tr key={`prod-${idx}`} style={{ backgroundColor: '#ffe4cc' }}>
                                              <td>{item.variety} ({item.outturn})</td>
                                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.bags}</td>
                                            </tr>
                                          ))}

                                          <tr style={{ backgroundColor: '#4a90e2', color: 'white', fontWeight: 'bold' }}>
                                            <td>TOTAL</td>
                                            <td style={{ textAlign: 'right' }}>
                                              {totalBags}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </ExcelTable>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </StockSection>
                  );
                });
              })()}
            </RecordsContainer>
          </div>
        )
      ) : Object.keys(records).length === 0 ? (
        <EmptyState>
          <p>📭 No records found</p>
          {selectedMonth && (
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              No records available for {availableMonths.find(m => m.month === selectedMonth)?.month_label}
            </p>
          )}
        </EmptyState>
      ) : (
        <RecordsContainer>
          {Object.entries(records).map(([date, dateRecords]) => (
            <DateGroup key={date} expanded={true}>
              <DateHeader>
                <DateTitle>
                  {groupBy === 'week' ? (
                    `📅 ${getWeekRange(new Date(date))}`
                  ) : (
                    `📅 ${new Date(date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit'
                    }).replace(/\u200E/g, '').trim()}`
                  )}
                </DateTitle>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <RecordCount>{dateRecords.length} records</RecordCount>
                </div>
              </DateHeader>

              <TableContainer>
                {activeTab === 'arrivals' ? (
                  <ExcelTable>
                    <thead>
                      <tr>
                        <th>SL No</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Broker</th>
                        <th>From</th>
                        <th>To Kunchinittu</th>
                        <th>To Warehouse</th>
                        <th>Outturn</th>
                        <th>Variety</th>
                        <th>Bags</th>
                        <th>Moisture</th>
                        <th>Cutting</th>
                        <th>WB No</th>
                        <th>Gross Weight</th>
                        <th>Tare Weight</th>
                        <th>Net Weight</th>
                        <th>Lorry No</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateRecords.map((record) => {
                        const RowComponent = record.movementType === 'purchase' ? PurchaseRow : ShiftingRow;
                        const isLoose = record.movementType === 'loose';
                        return (
                          <React.Fragment key={record.id}>
                            <RowComponent style={isLoose ? { background: '#fffbeb' } : {}}>
                              <td>{record.slNo}</td>
                              <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                              <td style={{ textTransform: 'capitalize' }}>{record.movementType}</td>
                              <td>{isLoose ? '-' : (record.broker || '-')}</td>
                              <LocationCell
                                hasLocation={record.movementType === 'shifting'}
                                isPurple={true}
                              >
                                {isLoose ? '-' : (record.movementType === 'purchase'
                                  ? (record.outturnId ? (record.fromLocation || 'Direct Purchase') : (record.fromLocation || '-'))
                                  : record.movementType === 'production-shifting'
                                    ? `${record.fromKunchinittu?.code || '-'} - ${record.fromWarehouse?.name || '-'}`
                                    : `${record.fromKunchinittu?.name || '-'}`
                                )}
                              </LocationCell>
                              <LocationCell
                                hasLocation={!!(record.movementType === 'purchase' ? (record.outturnId ? false : record.toKunchinittu) : (record.movementType === 'production-shifting' ? record.outturn : record.toKunchinittu))}
                                isPurple={record.movementType !== 'purchase'}
                              >
                                {isLoose ? (record.toKunchinittu?.code || '-') : (record.movementType === 'purchase'
                                  ? (record.outturnId ? '-' : (record.toKunchinittu?.name || '-'))
                                  : record.movementType === 'production-shifting'
                                    ? `→ Production (${record.outturn?.code || '-'})`
                                    : record.toKunchinittu?.code || '-'
                                )}
                              </LocationCell>
                              <LocationCell
                                hasLocation={!!(record.movementType === 'purchase' ? (record.outturnId ? false : record.toWarehouse) : (record.movementType === 'production-shifting' ? record.toWarehouse : (record.fromWarehouse || record.toWarehouseShift)))}
                                isPurple={record.movementType !== 'purchase'}
                              >
                                {isLoose ? '-' : (record.movementType === 'purchase'
                                  ? (record.outturnId ? '-' : (record.toWarehouse?.name || '-'))
                                  : record.movementType === 'production-shifting'
                                    ? record.toWarehouse?.name || '-'
                                    : `${record.fromWarehouse?.name || '-'} → ${record.toWarehouseShift?.name || '-'}`
                                )}
                              </LocationCell>
                              <LocationCell
                                hasLocation={!!(record.movementType === 'purchase' && record.outturnId)}
                                isPurple={true}
                              >
                                {record.movementType === 'purchase' && record.outturnId
                                  ? record.outturn?.code || '-'
                                  : '-'}
                              </LocationCell>
                              <VarietyCell
                                hasLocation={!!(record.variety && (record.toKunchinittu || record.fromKunchinittu))}
                                isPurple={record.movementType !== 'purchase'}
                              >
                                {isLoose ? '-' : (record.variety || '-')}
                              </VarietyCell>
                              <td>{record.bags || '-'}</td>
                              <td>{isLoose ? '-' : (record.moisture || '-')}</td>
                              <td>{isLoose ? '-' : (record.cutting || '-')}</td>
                              <td>{isLoose ? '-' : record.wbNo}</td>
                              <td>{isLoose ? '-' : record.grossWeight}</td>
                              <td>{isLoose ? '-' : record.tareWeight}</td>
                              <td>{isLoose ? '-' : record.netWeight}</td>
                              <td>{isLoose ? '-' : record.lorryNumber}</td>
                              <td>
                                <StatusBadge status={record.status}>
                                  {record.status}
                                  {record.status === 'approved' && !record.adminApprovedBy && ' (Manager)'}
                                  {record.adminApprovedBy && ' (Admin ✓)'}
                                </StatusBadge>
                              </td>
                              <td>
                                <ActionButtons>
                                  {/* FIXED: Paddy Hamali Status Indicators - Use paddyHamaliEntries with OLD system structure */}
                                  {(paddyHamaliEntries[record.id] && (
                                    paddyHamaliEntries[record.id].hasLoadingHamali ||
                                    paddyHamaliEntries[record.id].hasUnloadingHamali ||
                                    paddyHamaliEntries[record.id].hasLooseTumbiddu
                                  )) && (
                                      <IconButton
                                        style={{
                                          background: '#10b981',
                                          color: 'white',
                                          fontSize: '0.8rem',
                                          padding: '0.25rem 0.5rem',
                                          marginRight: '0.25rem'
                                        }}
                                        title="Paddy Hamali Added"
                                      >
                                        ✓ 🌾
                                      </IconButton>
                                    )}

                                  {/* Manager approval for pending records */}
                                  {record.status === 'pending' && user?.role !== 'staff' && (
                                    <>
                                      <IconButton
                                        className="approve"
                                        onClick={() => handleApprove(record.id, 'approved')}
                                        title="Approve (Manager)"
                                      >
                                        ✓
                                      </IconButton>
                                      <IconButton
                                        className="delete"
                                        onClick={() => handleApprove(record.id, 'rejected')}
                                        title="Reject"
                                      >
                                        ✗
                                      </IconButton>
                                    </>
                                  )}

                                  {/* Admin approval for manager-approved records */}
                                  {record.status === 'approved' && !record.adminApprovedBy && user?.role === 'admin' && (
                                    <IconButton
                                      className="approve"
                                      onClick={() => handleAdminApprove(record.id)}
                                      title="Admin Approve (Add to Stock)"
                                    >
                                      ✓✓
                                    </IconButton>
                                  )}

                                  {/* Edit button - Only for Manager/Admin on approved records */}
                                  {(record.status === 'approved' || record.status === 'admin-approved') &&
                                    (user?.role === 'manager' || user?.role === 'admin') && (
                                      <IconButton
                                        className="edit"
                                        onClick={() => handleEdit(record)}
                                        title="Edit Record"
                                      >
                                        ✏️
                                      </IconButton>
                                    )}

                                  {/* Paddy Hamali Button - FIXED: Use paddyHamaliEntries with OLD system structure */}
                                  {record.status === 'approved' && (
                                    <IconButton
                                      className={(paddyHamaliEntries[record.id] && (
                                        paddyHamaliEntries[record.id].hasLoadingHamali ||
                                        paddyHamaliEntries[record.id].hasUnloadingHamali ||
                                        paddyHamaliEntries[record.id].hasLooseTumbiddu
                                      )) ? "approve" : "edit"}
                                      onClick={() => setExpandedHamaliRecordId(expandedHamaliRecordId === record.id ? null : record.id)}
                                      title={(paddyHamaliEntries[record.id] && (
                                        paddyHamaliEntries[record.id].hasLoadingHamali ||
                                        paddyHamaliEntries[record.id].hasUnloadingHamali ||
                                        paddyHamaliEntries[record.id].hasLooseTumbiddu
                                      )) ? "View Paddy Hamali" : "Add Paddy Hamali"}
                                      style={{
                                        background: (paddyHamaliEntries[record.id] && (
                                          paddyHamaliEntries[record.id].hasLoadingHamali ||
                                          paddyHamaliEntries[record.id].hasUnloadingHamali ||
                                          paddyHamaliEntries[record.id].hasLooseTumbiddu
                                        )) ? '#10b981' : '#f59e0b',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        padding: '0.25rem 0.5rem',
                                        marginRight: '0.25rem'
                                      }}
                                    >
                                      {(paddyHamaliEntries[record.id] && (
                                        paddyHamaliEntries[record.id].hasLoadingHamali ||
                                        paddyHamaliEntries[record.id].hasUnloadingHamali ||
                                        paddyHamaliEntries[record.id].hasLooseTumbiddu
                                      )) ? '✓' : '+'} 🌾
                                    </IconButton>
                                  )}

                                  {/* Delete button - Only for Manager/Admin on approved records */}
                                  {(record.status === 'approved' || record.status === 'admin-approved') &&
                                    (user?.role === 'manager' || user?.role === 'admin') && (
                                      <IconButton
                                        className="delete"
                                        onClick={() => handleDelete(record.id)}
                                        title="Delete"
                                      >
                                        🗑️
                                      </IconButton>
                                    )}


                                </ActionButtons>
                              </td>
                            </RowComponent>
                            {expandedHamaliRecordId === record.id && (
                              <tr>
                                <td colSpan={17} style={{ padding: 0 }}>
                                  {paddyHamaliEntries[record.id] ? (
                                    <div style={{
                                      background: '#f0fdf4',
                                      border: '2px solid #10b981',
                                      borderRadius: '8px',
                                      padding: '1.5rem',
                                      margin: '0.5rem 0'
                                    }}>
                                      <h4 style={{ color: '#10b981', margin: '0 0 1rem 0' }}>
                                        ✓ Hamali Already Added
                                      </h4>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        {paddyHamaliEntries[record.id].hasLoadingHamali && (
                                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                                            <strong>Loading Hamali:</strong> ₹{paddyHamaliEntries[record.id].loadingTotal}
                                            <br />
                                            <small style={{ color: '#6b7280' }}>
                                              {paddyHamaliEntries[record.id].loadingBags} bags × ₹{paddyHamaliEntries[record.id].loadingRate}
                                            </small>
                                          </div>
                                        )}
                                        {paddyHamaliEntries[record.id].hasUnloadingHamali && (
                                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                                            <strong>Unloading Hamali ({paddyHamaliEntries[record.id].unloadingType?.toUpperCase()}):</strong> ₹{paddyHamaliEntries[record.id].unloadingTotal}
                                            <br />
                                            <small style={{ color: '#6b7280' }}>
                                              {paddyHamaliEntries[record.id].unloadingBags} bags × ₹{paddyHamaliEntries[record.id].unloadingRate}
                                            </small>
                                          </div>
                                        )}
                                        {paddyHamaliEntries[record.id].hasLooseTumbiddu && (
                                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                                            <strong>Loose Tumbiddu:</strong> ₹{paddyHamaliEntries[record.id].looseTotal}
                                            <br />
                                            <small style={{ color: '#6b7280' }}>
                                              {paddyHamaliEntries[record.id].looseBags} bags × ₹{paddyHamaliEntries[record.id].looseRate}
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'right' }}>
                                        Grand Total: ₹{paddyHamaliEntries[record.id].grandTotal}
                                      </div>
                                      {paddyHamaliEntries[record.id].status === 'pending' && (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', color: '#92400e', fontWeight: '600' }}>
                                          ⏳ Pending Approval
                                        </div>
                                      )}
                                      {paddyHamaliEntries[record.id].status === 'approved' && (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', borderRadius: '6px', color: '#166534', fontWeight: '600' }}>
                                          ✓ Approved
                                        </div>
                                      )}
                                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        {paddyHamaliEntries[record.id].status === 'pending' && (user?.role === 'manager' || user?.role === 'admin') && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await axios.post(`/hamali-entries/${record.id}/approve`);
                                                toast.success('Hamali approved successfully!');
                                                fetchRecords();
                                              } catch (error: any) {
                                                toast.error(error.response?.data?.error || 'Failed to approve');
                                              }
                                            }}
                                            style={{
                                              padding: '0.5rem 1rem',
                                              background: '#10b981',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '6px',
                                              cursor: 'pointer',
                                              fontWeight: '600'
                                            }}
                                          >
                                            ✓ Approve
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setExpandedHamaliRecordId(null)}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            background: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                          }}
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <InlineHamaliForm
                                      arrival={record}
                                      onClose={() => setExpandedHamaliRecordId(null)}
                                      onSuccess={() => {
                                        fetchRecords();
                                        setExpandedHamaliRecordId(null);
                                      }}
                                    />
                                  )}
                                </td>
                              </tr>
                            )}

                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </ExcelTable>
                ) : activeTab === 'purchase' ? (
                  <ExcelTable>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type of Movement</th>
                        <th>Broker</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Variety</th>
                        <th>Bags</th>
                        <th>Moisture</th>
                        <th>Cutting</th>
                        <th>Wb No</th>
                        <th>Gross Weight</th>
                        <th>Tare Weight</th>
                        <th>Net Weight</th>
                        <th>Lorry No</th>
                        <th>Amount</th>
                        <th>Total Amount</th>
                        <th>Average Rate</th>
                        {canEdit && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dateRecords.map((record) => (
                        <React.Fragment key={record.id}>
                          <PurchaseRow>
                            <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                            <td>Purchase</td>
                            <td>{record.broker || '-'}</td>
                            <LocationCell hasLocation={!!record.fromLocation} isPurple={false}>
                              {record.fromLocation || '-'}
                            </LocationCell>
                            <LocationCell hasLocation={!!(record.outturnId || record.toKunchinittu || record.toWarehouse)} isPurple={record.outturnId ? true : false}>
                              {record.outturnId
                                ? `→ Production (${record.outturn?.code || `OUT${record.outturnId}`})`
                                : `${record.toKunchinittu?.name || ''} - ${record.toWarehouse?.name || ''}`
                              }
                            </LocationCell>
                            <VarietyCell hasLocation={!!record.variety} isPurple={false}>
                              {record.variety || '-'}
                            </VarietyCell>
                            <td>{record.bags || '-'}</td>
                            <td>{record.moisture || '-'}</td>
                            <td>{record.cutting || '-'}</td>
                            <td>{record.wbNo}</td>
                            <td>{record.grossWeight}</td>
                            <td>{record.tareWeight}</td>
                            <td>{record.netWeight}</td>
                            <td>{record.lorryNumber}</td>
                            <td style={{ whiteSpace: 'pre-line' }}>{record.purchaseRate?.amountFormula || '-'}</td>
                            <td>{record.purchaseRate?.totalAmount ? `₹${Number(record.purchaseRate.totalAmount).toFixed(2)}` : '-'}</td>
                            <td>{record.purchaseRate?.averageRate ? `₹${Number(record.purchaseRate.averageRate).toFixed(2)}` : '-'}</td>
                            {canEdit && (
                              <td>
                                <Button
                                  className={expandedRateRecordId === record.id ? "secondary" : "primary"}
                                  onClick={() => toggleRateForm(record.id)}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                >
                                  {expandedRateRecordId === record.id ? 'Close' : (record.purchaseRate ? 'Edit Rate' : 'Add Rate')}
                                </Button>
                              </td>
                            )}
                          </PurchaseRow>
                          {expandedRateRecordId === record.id && (
                            <InlineRateForm>
                              <RateFormCell colSpan={canEdit ? 17 : 16}>
                                <RateFormContainer>
                                  <RateFormTitle>📊 {record.purchaseRate ? 'Edit' : 'Add'} Purchase Rate</RateFormTitle>

                                  <RateFormGrid>
                                    <RateFormGroup>
                                      <RateLabel>Sute</RateLabel>
                                      <RateInput
                                        type="number"
                                        step="0.01"
                                        value={rateFormData.sute}
                                        onChange={(e) => handleRateInputChange('sute', e.target.value)}
                                        placeholder="0"
                                      />
                                      <RateRadioGroup>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="suteCalculationMethod"
                                            value="per_bag"
                                            checked={rateFormData.suteCalculationMethod === 'per_bag'}
                                            onChange={(e) => handleRateInputChange('suteCalculationMethod', e.target.value)}
                                          />
                                          Bag
                                        </RateRadioLabel>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="suteCalculationMethod"
                                            value="per_quintal"
                                            checked={rateFormData.suteCalculationMethod === 'per_quintal'}
                                            onChange={(e) => handleRateInputChange('suteCalculationMethod', e.target.value)}
                                          />
                                          Quintal
                                        </RateRadioLabel>
                                      </RateRadioGroup>
                                    </RateFormGroup>

                                    <RateFormGroup>
                                      <RateLabel>Base Rate *</RateLabel>
                                      <RateInput
                                        type="number"
                                        step="0.01"
                                        value={rateFormData.baseRate}
                                        onChange={(e) => handleRateInputChange('baseRate', e.target.value)}
                                        placeholder="Enter base rate"
                                      />
                                      <RateRadioGroup>
                                        {['CDL', 'CDWB', 'MDL', 'MDWB'].map(type => (
                                          <RateRadioLabel key={type}>
                                            <input
                                              type="radio"
                                              name="rateType"
                                              value={type}
                                              checked={rateFormData.rateType === type}
                                              onChange={(e) => handleRateInputChange('rateType', e.target.value)}
                                            />
                                            {type}
                                          </RateRadioLabel>
                                        ))}
                                      </RateRadioGroup>
                                      <RateRadioGroup style={{ marginTop: '0.5rem' }}>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="baseRateCalculationMethod"
                                            value="per_bag"
                                            checked={rateFormData.baseRateCalculationMethod === 'per_bag'}
                                            onChange={(e) => handleRateInputChange('baseRateCalculationMethod', e.target.value)}
                                          />
                                          Per Bag (÷75)
                                        </RateRadioLabel>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="baseRateCalculationMethod"
                                            value="per_quintal"
                                            checked={rateFormData.baseRateCalculationMethod === 'per_quintal'}
                                            onChange={(e) => handleRateInputChange('baseRateCalculationMethod', e.target.value)}
                                          />
                                          Per Quintal (÷100)
                                        </RateRadioLabel>
                                      </RateRadioGroup>
                                    </RateFormGroup>

                                    <RateFormGroup>
                                      <RateLabel>H</RateLabel>
                                      <RateInput
                                        type="number"
                                        step="0.01"
                                        value={rateFormData.h}
                                        onChange={(e) => handleRateInputChange('h', e.target.value)}
                                        placeholder="0"
                                      />
                                    </RateFormGroup>

                                    <RateFormGroup>
                                      <RateLabel>B</RateLabel>
                                      <RateInput
                                        type="number"
                                        step="0.01"
                                        value={rateFormData.b}
                                        onChange={(e) => handleRateInputChange('b', e.target.value)}
                                        placeholder="0"
                                      />
                                      <RateRadioGroup>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="bCalculationMethod"
                                            value="per_bag"
                                            checked={rateFormData.bCalculationMethod === 'per_bag'}
                                            onChange={(e) => handleRateInputChange('bCalculationMethod', e.target.value)}
                                          />
                                          Bag
                                        </RateRadioLabel>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="bCalculationMethod"
                                            value="per_quintal"
                                            checked={rateFormData.bCalculationMethod === 'per_quintal'}
                                            onChange={(e) => handleRateInputChange('bCalculationMethod', e.target.value)}
                                          />
                                          Quintal
                                        </RateRadioLabel>
                                      </RateRadioGroup>
                                    </RateFormGroup>

                                    <RateFormGroup>
                                      <RateLabel>LF</RateLabel>
                                      <RateInput
                                        type="number"
                                        step="0.01"
                                        value={rateFormData.lf}
                                        onChange={(e) => handleRateInputChange('lf', e.target.value)}
                                        placeholder="0"
                                      />
                                      <RateRadioGroup>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="lfCalculationMethod"
                                            value="per_bag"
                                            checked={rateFormData.lfCalculationMethod === 'per_bag'}
                                            onChange={(e) => handleRateInputChange('lfCalculationMethod', e.target.value)}
                                          />
                                          Bag
                                        </RateRadioLabel>
                                        <RateRadioLabel>
                                          <input
                                            type="radio"
                                            name="lfCalculationMethod"
                                            value="per_quintal"
                                            checked={rateFormData.lfCalculationMethod === 'per_quintal'}
                                            onChange={(e) => handleRateInputChange('lfCalculationMethod', e.target.value)}
                                          />
                                          Quintal
                                        </RateRadioLabel>
                                      </RateRadioGroup>
                                    </RateFormGroup>

                                    {/* EGB - Show for CDL and MDL */}
                                    {(rateFormData.rateType === 'CDL' || rateFormData.rateType === 'MDL') && (
                                      <RateFormGroup>
                                        <RateLabel>EGB</RateLabel>
                                        <RateInput
                                          type="number"
                                          step="0.01"
                                          value={rateFormData.egb}
                                          onChange={(e) => handleRateInputChange('egb', e.target.value)}
                                          placeholder="0"
                                        />
                                      </RateFormGroup>
                                    )}
                                  </RateFormGrid>

                                  <RateCalculationBox>
                                    <RateCalcRow>
                                      <RateCalcLabel>Net Weight:</RateCalcLabel>
                                      <RateCalcValue>{(parseFloat(record.netWeight.toString()) / 100).toFixed(2)} Q</RateCalcValue>
                                    </RateCalcRow>
                                    <RateCalcRow>
                                      <RateCalcLabel>Total Amount:</RateCalcLabel>
                                      <RateCalcValue>
                                        ₹{(() => {
                                          const bags = record.bags || 0;
                                          const actualNetWeight = parseFloat(record.netWeight.toString());
                                          const weightInQuintals = actualNetWeight / 100;

                                          // Calculate sute net weight and amount
                                          let suteNetWeight = actualNetWeight;
                                          let suteAmount = 0;
                                          const suteValue = parseFloat(rateFormData.sute || '0');
                                          if (suteValue > 0) {
                                            if (rateFormData.suteCalculationMethod === 'per_bag') {
                                              suteAmount = suteValue * bags;
                                              suteNetWeight = actualNetWeight - suteAmount;
                                            } else {
                                              suteAmount = (actualNetWeight / 100) * suteValue;
                                              suteNetWeight = actualNetWeight;
                                            }
                                          }

                                          // Base Rate Calculation
                                          let baseRateAmount = 0;
                                          const baseRateValue = parseFloat(rateFormData.baseRate || '0');
                                          if (rateFormData.baseRateCalculationMethod === 'per_bag') {
                                            baseRateAmount = (suteNetWeight / 75) * baseRateValue;
                                          } else {
                                            baseRateAmount = (actualNetWeight / 100) * baseRateValue;
                                          }

                                          // Hamali calculation
                                          const hamaliValue = parseFloat(rateFormData.h || '0');
                                          const hamaliAmount = bags * hamaliValue;

                                          // B calculation
                                          const bValue = parseFloat(rateFormData.b || '0');
                                          const bAmount = rateFormData.bCalculationMethod === 'per_bag'
                                            ? bValue * bags
                                            : bValue * weightInQuintals;

                                          // LF calculation
                                          const lfValue = parseFloat(rateFormData.lf || '0');
                                          const lfAmount = rateFormData.lfCalculationMethod === 'per_bag'
                                            ? lfValue * bags
                                            : lfValue * weightInQuintals;

                                          // EGB calculation
                                          const showEGB = rateFormData.rateType === 'CDL' || rateFormData.rateType === 'MDL';
                                          const egbAmount = showEGB ? bags * parseFloat(rateFormData.egb || '0') : 0;

                                          const totalAmount = baseRateAmount + hamaliAmount + bAmount + lfAmount + egbAmount;
                                          return totalAmount.toFixed(2);
                                        })()}
                                      </RateCalcValue>
                                    </RateCalcRow>
                                  </RateCalculationBox>

                                  <RateButtonGroup>
                                    <Button
                                      className="secondary"
                                      onClick={() => toggleRateForm(record.id)}
                                      disabled={savingRate}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className="success"
                                      onClick={() => handleSaveRate(record.id)}
                                      disabled={savingRate}
                                    >
                                      {savingRate ? 'Saving...' : 'Save Rate'}
                                    </Button>
                                  </RateButtonGroup>
                                </RateFormContainer>
                              </RateFormCell>
                            </InlineRateForm>
                          )}

                        </React.Fragment>
                      ))}
                    </tbody>
                  </ExcelTable>
                ) : activeTab === 'shifting' ? (
                  <ExcelTable>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type of Movement</th>
                        <th>From Kunchinittu</th>
                        <th>From Warehouse</th>
                        <th>To Kunchinittu</th>
                        <th>To Warehouse</th>
                        <th>Variety</th>
                        <th>Bags</th>
                        <th>Moisture</th>
                        <th>Cutting</th>
                        <th>Wb No</th>
                        <th>Gross Weight</th>
                        <th>Tare Weight</th>
                        <th>Net Weight</th>
                        <th>Lorry No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateRecords.map((record) => (
                        <ShiftingRow key={record.id}>
                          <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {record.movementType === 'production-shifting' ? 'Production-Shifting' :
                              record.movementType === 'for-production' ? 'For-Production' : 'Shifting'}
                          </td>
                          <LocationCell
                            hasLocation={!!(record.movementType === 'shifting' || record.movementType === 'production-shifting' || record.movementType === 'for-production') && !!record.fromKunchinittu}
                            isPurple={true}
                          >
                            {record.movementType === 'production-shifting' || record.movementType === 'for-production'
                              ? record.fromKunchinittu?.code || '-'
                              : record.fromKunchinittu?.name || '-'}
                          </LocationCell>
                          <LocationCell
                            hasLocation={!!(record.movementType === 'shifting' || record.movementType === 'production-shifting') && !!record.fromWarehouse}
                            isPurple={true}
                          >
                            {record.movementType === 'production-shifting'
                              ? record.fromWarehouse?.name || '-'
                              : record.fromWarehouse?.name || '-'}
                          </LocationCell>
                          <LocationCell
                            hasLocation={!!(record.movementType === 'production-shifting' ? record.outturn : record.toKunchinittu)}
                            isPurple={true}
                          >
                            {record.movementType === 'production-shifting'
                              ? `→ Production (${record.outturn?.code || '-'})`
                              : record.toKunchinittu?.name || '-'}
                          </LocationCell>
                          <LocationCell
                            hasLocation={!!(record.movementType === 'production-shifting' ? record.toWarehouse : record.toWarehouseShift)}
                            isPurple={true}
                          >
                            {record.movementType === 'production-shifting'
                              ? record.toWarehouse?.name || '-'
                              : record.toWarehouseShift?.name || '-'}
                          </LocationCell>
                          <VarietyCell hasLocation={!!record.variety} isPurple={true}>
                            {record.variety || '-'}
                          </VarietyCell>
                          <td>{record.bags || '-'}</td>
                          <td>{record.moisture || '-'}</td>
                          <td>{record.cutting || '-'}</td>
                          <td>{record.wbNo}</td>
                          <td>{record.grossWeight}</td>
                          <td>{record.tareWeight}</td>
                          <td>{record.netWeight}</td>
                          <td>{record.lorryNumber}</td>
                        </ShiftingRow>
                      ))}
                    </tbody>
                  </ExcelTable>
                ) : null}
              </TableContainer>
            </DateGroup>
          ))}

          {/* Enhanced Pagination - Different for Paddy Stock */}
          <Pagination>
            {(activeTab as string) === 'stock' ? (
              /* Month-wise Navigation for Paddy Stock */
              <>
                <PageButton
                  onClick={() => navigateMonth('prev')}
                  disabled={loading}
                >
                  ‹ Previous Month
                </PageButton>

                <div style={{
                  margin: '0 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                  color: '#374151'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    📅 {getCurrentMonthLabel()}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {Object.values(records).flat().length} stock entries this month
                  </div>
                </div>

                <PageButton
                  onClick={() => navigateMonth('next')}
                  disabled={loading}
                >
                  Next Month ›
                </PageButton>

                {/* Quick Month Selector */}
                <div style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#6b7280' }}>Jump to:</label>
                  <Select
                    value={selectedMonth || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedMonth(e.target.value);
                        toast.info('Loading selected month...');
                      }
                    }}
                    style={{ padding: '0.25rem', fontSize: '0.85rem', minWidth: '150px' }}
                  >
                    <option value="">Select Month</option>
                    {availableMonths.map((m) => (
                      <option key={m.month} value={m.month}>
                        {m.month_label}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : (
              /* Regular Pagination for Other Tabs */
              <>
                <PageButton
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  « First
                </PageButton>

                <PageButton
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Previous
                </PageButton>

                {/* Page Numbers */}
                {(() => {
                  const maxVisiblePages = 5;
                  const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  const pages = [];

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <PageButton
                        key={i}
                        $active={i === page}
                        onClick={() => setPage(i)}
                      >
                        {i}
                      </PageButton>
                    );
                  }

                  return pages;
                })()}

                <PageButton
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </PageButton>

                <PageButton
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last »
                </PageButton>

                <div style={{
                  margin: '0 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  color: '#6b7280'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#374151' }}>
                    Page {page} of {totalPages}
                  </div>
                  <div>
                    Showing {((page - 1) * 250) + 1}-{Math.min(page * 250, ((page - 1) * 250) + Object.values(records).flat().length)}
                    of {Object.values(records).flat().length > 0 ?
                      (showAllRecords ? 'all' : selectedMonth ? 'monthly' : 'filtered') : '0'} records
                  </div>
                </div>
              </>
            )}
          </Pagination>
        </RecordsContainer>
      )}

      {/* Edit Arrival Modal */}
      {
        editingRecord && (
          <EditArrivalModal
            arrival={editingRecord}
            onClose={() => setEditingRecord(null)}
            onSuccess={handleEditSuccess}
          />
        )
      }

      {/* Clear Outturn Dialog */}
      {
        showClearOutturnDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>
                Clear Outturn
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem' }}>
                    ⚠️ Remaining Bags: {availableBags} bags
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#78350f' }}>
                    These bags will be consumed and added to the working section on the selected date.
                  </div>
                </div>

                <Label>Select Clear Date *</Label>
                <Input
                  type="date"
                  value={clearOutturnDate}
                  onChange={(e) => setClearOutturnDate(e.target.value)}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                />
                <InfoText style={{ marginTop: '0.5rem' }}>
                  Choose the date when this outturn should be cleared
                </InfoText>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Button
                  className="secondary"
                  onClick={() => setShowClearOutturnDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="primary"
                  onClick={confirmClearOutturn}
                  disabled={!clearOutturnDate}
                >
                  Confirm Clear
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Pagination Controls */}
      {(activeTab === 'arrivals' || activeTab === 'purchase' || activeTab === 'shifting') && totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          recordsPerPage={250}
          onPageChange={(newPage) => {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          loading={loading}
        />
      )}

      {/* Paddy Hamali Modal */}
      {
        showPaddyHamaliModal && selectedArrivalForHamali && (
          <AddPaddyHamaliModal
            isOpen={showPaddyHamaliModal}
            onClose={() => {
              setShowPaddyHamaliModal(false);
              setSelectedArrivalForHamali(null);
            }}
            arrival={{
              id: selectedArrivalForHamali.id,
              arrivalNumber: selectedArrivalForHamali.slNo,        // ✅ Fixed: Map slNo to arrivalNumber
              partyName: selectedArrivalForHamali.broker || 'N/A', // ✅ Fixed: Map broker to partyName
              bags: selectedArrivalForHamali.bags || 0
            }}
            onSave={() => {
              setShowPaddyHamaliModal(false);
              setSelectedArrivalForHamali(null);
            }}
          />
        )
      }

      {/* Purchase/Sale modals removed - Rice Stock tab is display-only */}

      {/* Purchase Modal */}
      <SimplePurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          fetchRiceStock();
          fetchPendingMovements();
        }}
      />

      {/* Sale Modal */}
      <SimpleSaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        onSuccess={() => {
          fetchRiceStock();
          fetchPendingMovements();
        }}
      />

      {/* Enhanced Palti Modal - Multi-Target Support */}
      <EnhancedPaltiModal
        isOpen={showPaltiModal}
        onClose={() => setShowPaltiModal(false)}
        onSuccess={() => {
          fetchRiceStock();
          fetchPendingMovements();
        }}
      />

    </Container >
  );
};

export default Records;