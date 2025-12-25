import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const Title = styled.h2`
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled(Button)`
  background: #6b7280;
  color: white;

  &:hover {
    background: #4b5563;
  }
`;

interface SimplePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SimplePurchaseModal: React.FC<SimplePurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    billNumber: '',
    variety: 'Sum25 RNR Raw',
    bags: '',
    bagSize: '26.00',
    packaging: '',
    from: '',
    to: '',
    lorryNumber: ''
  });

  const [packagings, setPackagings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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
      console.error('Error fetching rice stock locations:', error);
      // Fallback locations
      setLocations([
        { code: 'WAREHOUSE1', name: 'WAREHOUSE1' }
      ]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.billNumber || !formData.bags || !formData.packaging || !formData.to) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Calculate QTL'S
      const qtls = (parseInt(formData.bags) * parseFloat(formData.bagSize)) / 100;
      
      await axios.post('/rice-stock-management/movements', {
        date: formData.date,
        movementType: 'purchase',
        productType: 'Rice', // Default product type
        variety: formData.variety,
        bags: parseInt(formData.bags),
        bagSizeKg: parseFloat(formData.bagSize),
        quantityQuintals: qtls,
        packagingId: parseInt(formData.packaging),
        locationCode: formData.to,
        fromLocation: formData.from,
        billNumber: formData.billNumber,
        lorryNumber: formData.lorryNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Purchase added successfully!');
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        billNumber: '',
        variety: 'Sum25 RNR Raw',
        bags: '',
        bagSize: '26.00',
        packaging: '',
        from: '',
        to: '',
        lorryNumber: ''
      });
      
    } catch (error: any) {
      console.error('Error adding purchase:', error);
      toast.error(error.response?.data?.error || 'Failed to add purchase');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>📦 Add Purchase</Title>
        
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Bill Number *</Label>
              <Input
                type="text"
                value={formData.billNumber}
                onChange={(e) => handleInputChange('billNumber', e.target.value)}
                placeholder="Enter bill number"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Variety</Label>
              <Input
                type="text"
                value={formData.variety}
                onChange={(e) => handleInputChange('variety', e.target.value)}
                placeholder="Sum25 RNR Raw"
              />
            </FormGroup>

            <FormGroup>
              <Label>Bags *</Label>
              <Input
                type="number"
                value={formData.bags}
                onChange={(e) => handleInputChange('bags', e.target.value)}
                min="1"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Bag Size (KG)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.bagSize}
                onChange={(e) => handleInputChange('bagSize', e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label>Packaging *</Label>
              <Select
                value={formData.packaging}
                onChange={(e) => handleInputChange('packaging', e.target.value)}
                required
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
              <Label>From</Label>
              <Input
                type="text"
                value={formData.from}
                onChange={(e) => handleInputChange('from', e.target.value)}
                placeholder="Supplier/Source"
              />
            </FormGroup>

            <FormGroup>
              <Label>To *</Label>
              <Select
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                required
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name ? `${loc.code} - ${loc.name}` : loc.code}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <Label>Lorry Number</Label>
              <Input
                type="text"
                value={formData.lorryNumber}
                onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                placeholder="Vehicle number"
              />
            </FormGroup>
          </FormGrid>

          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Purchase'}
            </SaveButton>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SimplePurchaseModal;