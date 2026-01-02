import type { Payment, PaymentStatus, PaymentType } from '../../database/schemas';

export const mockPayment: Payment = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  cartId: '550e8400-e29b-41d4-a716-446655440001',
  amount: '10000.00',
  status: 'pending' as PaymentStatus,
  paymentType: 'webpay' as PaymentType,
  proofUrl: null,
  externalReference: null,
  transactionId: null,
  authorizationCode: null,
  cardLastFourDigits: null,
  paymentDate: null,
  confirmedAt: null,
  metadata: null,
  notes: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  organizationId: 1,
};

export const mockPaymentCompleted: Payment = {
  ...mockPayment,
  id: '550e8400-e29b-41d4-a716-446655440002',
  status: 'completed' as PaymentStatus,
  transactionId: 'TXN123456',
  authorizationCode: 'AUTH789',
  cardLastFourDigits: '1234',
  paymentDate: new Date('2024-01-02T00:00:00Z'),
  confirmedAt: new Date('2024-01-02T00:00:00Z'),
};

export const mockPaymentWithProof: Payment = {
  ...mockPayment,
  id: '550e8400-e29b-41d4-a716-446655440003',
  status: 'processing' as PaymentStatus,
  paymentType: 'bank_transfer' as PaymentType,
  proofUrl: 'https://example.com/proof.jpg',
  externalReference: 'TRANSFER123',
};

export const mockPayments: Payment[] = [
  mockPayment,
  mockPaymentCompleted,
  mockPaymentWithProof,
];

export const mockCreatePaymentDto = {
  cartId: '550e8400-e29b-41d4-a716-446655440001',
  amount: 10000,
  paymentType: 'webpay' as PaymentType,
  status: 'pending' as PaymentStatus,
};

export const mockUpdatePaymentDto = {
  amount: 15000,
  notes: 'Updated notes',
};

export const mockUploadProofDto = {
  proofUrl: 'https://example.com/proof.jpg',
  notes: 'Proof uploaded',
};

export const mockConfirmPaymentDto = {
  transactionId: 'TXN123456',
  externalReference: 'EXT123',
  notes: 'Payment confirmed',
};

export const mockCreateProofPaymentDto = {
  cartId: '550e8400-e29b-41d4-a716-446655440001',
  paymentType: 'bank_transfer' as PaymentType,
  amount: 10000,
  proofUrl: 'https://example.com/proof.jpg',
  externalReference: 'TRANSFER123',
  notes: 'Transfer proof',
};

export const mockValidateProofDto = {
  isValid: true,
  transactionId: 'TXN123456',
  notes: 'Proof validated',
};

export const mockPaginatedPayments = {
  data: mockPayments,
  pagination: {
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

export const mockGlobalStats = {
  total: 100,
  completed: 80,
  pending: 10,
  processing: 5,
  failed: 3,
  cancelled: 2,
  totalAmount: '1000000.00',
  completedAmount: '800000.00',
};

export const mockPaymentStats = {
  totalPaid: 30000.00,
  totalPending: 20000.00,
  totalFailed: 0,
  count: 5,
};

