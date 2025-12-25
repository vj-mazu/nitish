import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

// ============================================
// STYLED COMPONENTS - Premium Design
// ============================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  width: 95%;
  max-width: 950px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease;
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 1.5rem 2rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem 2rem;
  overflow-y: auto;
  max-height: calc(90vh - 200px);
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3<{ $color?: string }>`
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => props.$color || '#6b7280'};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.85rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  
  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const ProductTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ProductTypeButton = styled.button<{ $active: boolean; $color: string }>`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$active ? props.$color : '#e5e7eb'};
  background: ${props => props.$active ? props.$color : 'white'};
  color: ${props => props.$active ? 'white' : '#4b5563'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.$color};
    background: ${props => props.$active ? props.$color : `${props.$color}15`};
  }
`;

const SourceCard = styled.div`
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 1.25rem;
`;

const SourceInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 0.75rem;
`;

const SourceStat = styled.div`
  text-align: center;
`;

const SourceStatLabel = styled.div`
  font-size: 0.75rem;
  color: #1e40af;
  font-weight: 600;
  text-transform: uppercase;
`;

const SourceStatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e3a8a;
`;

const TargetsContainer = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  border: 2px dashed #d1d5db;
`;

const TargetEntry = styled.div`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: 1fr 120px 150px 40px;
  gap: 1rem;
  align-items: end;
  transition: all 0.2s;
  
  &:hover {
    border-color: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TargetNumber = styled.span`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  margin-right: 0.5rem;
`;

const WeightDisplay = styled.div`
  background: #f0fdf4;
  border: 1px solid #22c55e;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: #15803d;
  font-weight: 600;
  text-align: center;
`;

const DeleteButton = styled.button`
  background: #fee2e2;
  border: none;
  color: #dc2626;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s;
  
  &:hover {
    background: #fecaca;
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const AddTargetButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: white;
  border: 2px dashed #f59e0b;
  border-radius: 10px;
  color: #d97706;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background: #fffbeb;
    border-style: solid;
  }
`;

const ShortageCard = styled.div<{ $hasShortage: boolean }>`
  background: ${props => props.$hasShortage
        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
        : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'};
  border: 2px solid ${props => props.$hasShortage ? '#f59e0b' : '#10b981'};
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
`;

const ShortageTitle = styled.h4<{ $hasShortage: boolean }>`
  margin: 0 0 1rem 0;
  color: ${props => props.$hasShortage ? '#92400e' : '#065f46'};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ShortageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
`;

const ShortageItem = styled.div`
  text-align: center;
`;

const ShortageLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #78716c;
  text-transform: uppercase;
`;

const ShortageValue = styled.div<{ $highlight?: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.$highlight ? '#dc2626' : '#1f2937'};
`;

const ModalFooter = styled.div`
  padding: 1rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CancelButton = styled(Button)`
  background: #e5e7eb;
  color: #4b5563;
  
  &:hover {
    background: #d1d5db;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px 0 rgba(245, 158, 11, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorText = styled.span`
  color: #dc2626;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

// ============================================
// PRODUCT TYPES with colors
// ============================================
const PRODUCT_TYPES = [
    { value: 'Rice', label: 'Rice', color: '#10b981' },
    { value: 'Broken', label: 'Broken', color: '#f59e0b' },
    { value: 'Bran', label: 'Bran', color: '#8b5cf6' },
    { value: 'RJ Rice 1', label: 'RJ Rice 1', color: '#3b82f6' },
    { value: 'RJ Rice (2)', label: 'RJ Rice 2', color: '#06b6d4' },
    { value: 'Sizer Broken', label: 'Sizer Broken', color: '#ec4899' },
    { value: '0 Broken', label: '0 Broken', color: '#ef4444' },
    { value: 'Faram', label: 'Faram', color: '#84cc16' },
];

// ============================================
// TYPES
// ============================================

interface TargetConversion {
    id: string;
    targetPackagingId: string;
    bags: string;
}

interface Packaging {
    id: number;
    brandName: string;
    allottedKg: number;
}

interface Location {
    code: string;
    name: string;
}

interface EnhancedPaltiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

const EnhancedPaltiModal: React.FC<EnhancedPaltiModalProps> = ({ isOpen, onClose, onSuccess }) => {
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [productType, setProductType] = useState('Rice'); // Important: Product type for stock tracking
    const [variety, setVariety] = useState('Sum25 RNR Raw');
    const [sourcePackagingId, setSourcePackagingId] = useState('');
    const [sourceBags, setSourceBags] = useState('');
    const [locationCode, setLocationCode] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [lorryNumber, setLorryNumber] = useState('');

    // Target Conversions - Start with one empty entry
    const [targets, setTargets] = useState<TargetConversion[]>([
        { id: '1', targetPackagingId: '', bags: '' }
    ]);

    // Data State
    const [packagings, setPackagings] = useState<Packaging[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Fetch packagings and locations
    useEffect(() => {
        if (isOpen) {
            fetchPackagings();
            fetchLocations();
        }
    }, [isOpen]);

    const fetchPackagings = async () => {
        try {
            const response = await axios.get('/packagings');
            setPackagings((response.data as any).packagings || []);
        } catch (error) {
            console.error('Error fetching packagings:', error);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await axios.get('/locations/rice-stock-locations');
            setLocations((response.data as any).locations || []);
        } catch (error) {
            console.error('Error fetching locations:', error);
            setLocations([{ code: 'WAREHOUSE1', name: 'WAREHOUSE1' }]);
        }
    };

    // Get selected source packaging details
    const sourcePackaging = packagings.find(p => p.id === parseInt(sourcePackagingId));
    const sourceTotalKg = sourcePackaging && sourceBags
        ? parseInt(sourceBags) * parseFloat(String(sourcePackaging.allottedKg))
        : 0;
    const sourceQtls = sourceTotalKg / 100;

    // Calculate totals for all targets
    const calculateTargetTotals = useCallback(() => {
        let totalKg = 0;
        let totalBags = 0;

        targets.forEach(target => {
            if (target.targetPackagingId && target.bags) {
                const pkg = packagings.find(p => p.id === parseInt(target.targetPackagingId));
                if (pkg) {
                    const bags = parseInt(target.bags) || 0;
                    totalBags += bags;
                    totalKg += bags * parseFloat(String(pkg.allottedKg));
                }
            }
        });

        return { totalKg, totalBags, totalQtls: totalKg / 100 };
    }, [targets, packagings]);

    const targetTotals = calculateTargetTotals();
    const shortageKg = sourceTotalKg - targetTotals.totalKg;
    const shortageQtls = shortageKg / 100;
    const shortagePercentage = sourceTotalKg > 0 ? (shortageKg / sourceTotalKg) * 100 : 0;
    const hasValidConversion = sourceTotalKg > 0 && targetTotals.totalKg > 0;

    // Add new target entry
    const addTarget = () => {
        const newId = String(Date.now());
        setTargets([...targets, { id: newId, targetPackagingId: '', bags: '' }]);
    };

    // Remove target entry
    const removeTarget = (id: string) => {
        if (targets.length > 1) {
            setTargets(targets.filter(t => t.id !== id));
        }
    };

    // Update target entry
    const updateTarget = (id: string, field: 'targetPackagingId' | 'bags', value: string) => {
        setTargets(targets.map(t =>
            t.id === id ? { ...t, [field]: value } : t
        ));
    };

    // Get weight display for a target
    const getTargetWeight = (target: TargetConversion) => {
        if (!target.targetPackagingId || !target.bags) return null;
        const pkg = packagings.find(p => p.id === parseInt(target.targetPackagingId));
        if (!pkg) return null;
        const bags = parseInt(target.bags) || 0;
        const kg = bags * parseFloat(String(pkg.allottedKg));
        return { kg, qtls: kg / 100 };
    };

    // Validate form
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!date) newErrors.date = 'Date is required';
        if (!productType) newErrors.productType = 'Select product type';
        if (!sourcePackagingId) newErrors.sourcePackaging = 'Select source packaging';
        if (!sourceBags || parseInt(sourceBags) <= 0) newErrors.sourceBags = 'Enter valid bags';
        if (!locationCode) newErrors.location = 'Select location';

        // Validate targets
        const validTargets = targets.filter(t => t.targetPackagingId && parseInt(t.bags) > 0);
        if (validTargets.length === 0) {
            newErrors.targets = 'Add at least one target conversion';
        }

        // Check if target weight exceeds source
        if (targetTotals.totalKg > sourceTotalKg) {
            newErrors.targets = 'Target weight cannot exceed source weight';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (saving) return;
        if (!validate()) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');

            // Filter valid targets
            const validTargets = targets.filter(t => t.targetPackagingId && parseInt(t.bags) > 0);

            // Generate unique batch ID for grouping
            const batchId = `PALTI-${Date.now()}`;

            // Create each target as a separate palti movement
            for (let index = 0; index < validTargets.length; index++) {
                const target = validTargets[index];
                const targetPkg = packagings.find(p => p.id === parseInt(target.targetPackagingId));
                const targetBags = parseInt(target.bags);
                const targetKg = targetBags * parseFloat(String(targetPkg?.allottedKg || 26));
                const targetQtls = targetKg / 100;

                // FIXED: Store TOTAL shortage on first entry only (not split proportionally)
                // This ensures the combined shortage for the entire batch is shown once
                const isFirstEntry = index === 0;
                const entryShortageKg = isFirstEntry ? shortageKg : 0;
                const entryShortageBags = isFirstEntry ? (shortageKg / (targetPkg?.allottedKg || 26)) : 0;

                console.log('📦 Creating Palti entry:', {
                    productType,
                    variety,
                    targetBags,
                    targetKg,
                    targetQtls,
                    isFirstEntry,
                    entryShortageKg,
                    totalShortageKg: shortageKg
                });

                await axios.post('/rice-stock-management/movements', {
                    date,
                    movementType: 'palti',
                    productType: productType, // Use actual product type (Rice, Bran, etc.)
                    variety,
                    sourcePackagingId: parseInt(sourcePackagingId),
                    targetPackagingId: parseInt(target.targetPackagingId),
                    sourceBags: parseInt(sourceBags),
                    bags: targetBags,
                    quantityQuintals: targetQtls,
                    bagSizeKg: targetPkg?.allottedKg || 26,
                    locationCode,
                    billNumber: billNumber || batchId,
                    lorryNumber,
                    // Include shortage data - TOTAL on first entry only
                    conversionShortageKg: entryShortageKg,
                    conversionShortageBags: entryShortageBags,
                    // Also store total shortage reference for display purposes
                    totalBatchShortageKg: shortageKg,
                    totalBatchShortageQtl: shortageKg / 100
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            toast.success(
                `✅ Palti conversion created successfully!\n` +
                `${validTargets.length} conversion(s) for ${productType}\n` +
                `Shortage: ${shortageKg.toFixed(2)}kg (${shortagePercentage.toFixed(2)}%)`
            );

            onSuccess();
            onClose();
            resetForm();

        } catch (error: any) {
            console.error('Error creating Palti:', error);
            toast.error(error.response?.data?.error || 'Failed to create Palti conversion');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setProductType('Rice');
        setVariety('Sum25 RNR Raw');
        setSourcePackagingId('');
        setSourceBags('');
        setLocationCode('');
        setBillNumber('');
        setLorryNumber('');
        setTargets([{ id: '1', targetPackagingId: '', bags: '' }]);
        setErrors({});
    };

    if (!isOpen) return null;

    const selectedTypeColor = PRODUCT_TYPES.find(t => t.value === productType)?.color || '#f59e0b';

    return (
        <ModalOverlay onClick={onClose}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader style={{ background: `linear-gradient(135deg, ${selectedTypeColor} 0%, ${selectedTypeColor}dd 100%)` }}>
                    <ModalTitle>
                        🔄 Palti - {productType} Conversion
                    </ModalTitle>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </ModalHeader>

                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        {/* Product Type Selection */}
                        <Section>
                            <SectionTitle $color="#6b7280">
                                📦 Select Product Type *
                            </SectionTitle>
                            <ProductTypeGrid>
                                {PRODUCT_TYPES.map(type => (
                                    <ProductTypeButton
                                        key={type.value}
                                        type="button"
                                        $active={productType === type.value}
                                        $color={type.color}
                                        onClick={() => setProductType(type.value)}
                                    >
                                        {type.label}
                                    </ProductTypeButton>
                                ))}
                            </ProductTypeGrid>
                            {errors.productType && <ErrorText>{errors.productType}</ErrorText>}
                        </Section>

                        {/* Basic Info */}
                        <Section>
                            <FormGrid>
                                <FormGroup>
                                    <Label>Date *</Label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    {errors.date && <ErrorText>{errors.date}</ErrorText>}
                                </FormGroup>
                                <FormGroup>
                                    <Label>Variety</Label>
                                    <Input
                                        type="text"
                                        value={variety}
                                        onChange={(e) => setVariety(e.target.value)}
                                        placeholder="Sum25 RNR Raw"
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label>Location *</Label>
                                    <Select
                                        value={locationCode}
                                        onChange={(e) => setLocationCode(e.target.value)}
                                    >
                                        <option value="">Select location...</option>
                                        {locations.map(loc => (
                                            <option key={loc.code} value={loc.code}>
                                                {loc.name || loc.code}
                                            </option>
                                        ))}
                                    </Select>
                                    {errors.location && <ErrorText>{errors.location}</ErrorText>}
                                </FormGroup>
                            </FormGrid>
                        </Section>

                        {/* Source Section */}
                        <Section>
                            <SectionTitle $color="#3b82f6">
                                📦 Source (Converting From)
                            </SectionTitle>
                            <SourceCard>
                                <FormGrid>
                                    <FormGroup>
                                        <Label>Source Packaging *</Label>
                                        <Select
                                            value={sourcePackagingId}
                                            onChange={(e) => setSourcePackagingId(e.target.value)}
                                        >
                                            <option value="">Select packaging...</option>
                                            {packagings.map(pkg => (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.brandName} ({pkg.allottedKg}kg)
                                                </option>
                                            ))}
                                        </Select>
                                        {errors.sourcePackaging && <ErrorText>{errors.sourcePackaging}</ErrorText>}
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>Number of Bags *</Label>
                                        <Input
                                            type="number"
                                            value={sourceBags}
                                            onChange={(e) => setSourceBags(e.target.value)}
                                            min="1"
                                            placeholder="Enter bags"
                                        />
                                        {errors.sourceBags && <ErrorText>{errors.sourceBags}</ErrorText>}
                                    </FormGroup>
                                </FormGrid>

                                {sourceTotalKg > 0 && (
                                    <SourceInfo>
                                        <SourceStat>
                                            <SourceStatLabel>Total Weight</SourceStatLabel>
                                            <SourceStatValue>{sourceTotalKg.toFixed(2)} kg</SourceStatValue>
                                        </SourceStat>
                                        <SourceStat>
                                            <SourceStatLabel>Quintals</SourceStatLabel>
                                            <SourceStatValue>{sourceQtls.toFixed(2)} QTL</SourceStatValue>
                                        </SourceStat>
                                        <SourceStat>
                                            <SourceStatLabel>Bag Size</SourceStatLabel>
                                            <SourceStatValue>{sourcePackaging?.allottedKg} kg</SourceStatValue>
                                        </SourceStat>
                                    </SourceInfo>
                                )}
                            </SourceCard>
                        </Section>

                        {/* Target Conversions Section */}
                        <Section>
                            <SectionTitle $color={selectedTypeColor}>
                                🎯 Target Conversions (Converting To)
                            </SectionTitle>
                            <TargetsContainer>
                                {targets.map((target, index) => {
                                    const weight = getTargetWeight(target);
                                    return (
                                        <TargetEntry key={target.id}>
                                            <FormGroup>
                                                <Label>
                                                    <TargetNumber style={{ background: selectedTypeColor }}>{index + 1}</TargetNumber>
                                                    Target Packaging
                                                </Label>
                                                <Select
                                                    value={target.targetPackagingId}
                                                    onChange={(e) => updateTarget(target.id, 'targetPackagingId', e.target.value)}
                                                >
                                                    <option value="">Select packaging...</option>
                                                    {packagings.map(pkg => (
                                                        <option key={pkg.id} value={pkg.id}>
                                                            {pkg.brandName} ({pkg.allottedKg}kg)
                                                        </option>
                                                    ))}
                                                </Select>
                                            </FormGroup>
                                            <FormGroup>
                                                <Label>Bags</Label>
                                                <Input
                                                    type="number"
                                                    value={target.bags}
                                                    onChange={(e) => updateTarget(target.id, 'bags', e.target.value)}
                                                    min="1"
                                                    placeholder="0"
                                                />
                                            </FormGroup>
                                            <div>
                                                {weight && (
                                                    <WeightDisplay>
                                                        {weight.qtls.toFixed(2)} QTL
                                                    </WeightDisplay>
                                                )}
                                            </div>
                                            <DeleteButton
                                                type="button"
                                                onClick={() => removeTarget(target.id)}
                                                disabled={targets.length === 1}
                                                title="Remove this target"
                                            >
                                                🗑️
                                            </DeleteButton>
                                        </TargetEntry>
                                    );
                                })}

                                <AddTargetButton type="button" onClick={addTarget}>
                                    ➕ Add Another Target Packaging
                                </AddTargetButton>

                                {errors.targets && <ErrorText style={{ marginTop: '0.5rem' }}>{errors.targets}</ErrorText>}
                            </TargetsContainer>
                        </Section>

                        {/* Shortage Calculation */}
                        {hasValidConversion && (
                            <ShortageCard $hasShortage={shortageKg > 0}>
                                <ShortageTitle $hasShortage={shortageKg > 0}>
                                    {shortageKg > 0 ? `⚠️ ${productType} Conversion Summary - SHORTAGE` : `✅ ${productType} Conversion Summary`}
                                </ShortageTitle>
                                <ShortageGrid>
                                    <ShortageItem>
                                        <ShortageLabel>Source Total</ShortageLabel>
                                        <ShortageValue>{sourceQtls.toFixed(2)} QTL</ShortageValue>
                                    </ShortageItem>
                                    <ShortageItem>
                                        <ShortageLabel>Target Total</ShortageLabel>
                                        <ShortageValue>{targetTotals.totalQtls.toFixed(2)} QTL</ShortageValue>
                                    </ShortageItem>
                                    <ShortageItem>
                                        <ShortageLabel>Shortage KG</ShortageLabel>
                                        <ShortageValue $highlight={shortageKg > 0}>
                                            {shortageKg.toFixed(2)} kg
                                        </ShortageValue>
                                    </ShortageItem>
                                    <ShortageItem>
                                        <ShortageLabel>Shortage QTL</ShortageLabel>
                                        <ShortageValue $highlight={shortageKg > 0}>
                                            {shortageQtls.toFixed(2)} QTL
                                        </ShortageValue>
                                    </ShortageItem>
                                    <ShortageItem>
                                        <ShortageLabel>Shortage %</ShortageLabel>
                                        <ShortageValue $highlight={shortagePercentage > 1}>
                                            {shortagePercentage.toFixed(2)}%
                                        </ShortageValue>
                                    </ShortageItem>
                                </ShortageGrid>
                            </ShortageCard>
                        )}

                        {/* Optional Fields */}
                        <Section style={{ marginTop: '1.5rem' }}>
                            <FormGrid>
                                <FormGroup>
                                    <Label>Bill Number (Optional)</Label>
                                    <Input
                                        type="text"
                                        value={billNumber}
                                        onChange={(e) => setBillNumber(e.target.value)}
                                        placeholder="Auto-generated if empty"
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label>Lorry Number (Optional)</Label>
                                    <Input
                                        type="text"
                                        value={lorryNumber}
                                        onChange={(e) => setLorryNumber(e.target.value)}
                                        placeholder="Vehicle number"
                                    />
                                </FormGroup>
                            </FormGrid>
                        </Section>
                    </ModalBody>

                    <ModalFooter>
                        <CancelButton type="button" onClick={onClose}>
                            Cancel
                        </CancelButton>
                        <SaveButton
                            type="submit"
                            disabled={saving || !hasValidConversion}
                            style={{ background: `linear-gradient(135deg, ${selectedTypeColor} 0%, ${selectedTypeColor}dd 100%)` }}
                        >
                            {saving ? '⏳ Creating...' : `✅ Create ${productType} Palti`}
                        </SaveButton>
                    </ModalFooter>
                </form>
            </ModalContent>
        </ModalOverlay>
    );
};

export default EnhancedPaltiModal;
