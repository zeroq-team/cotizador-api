import type { OrganizationPaymentMethod } from '../../database/schemas';

export const mockOrganizationPaymentMethod: OrganizationPaymentMethod = {
  id: 1,
  organizationId: 1,
  isCheckActive: false,
  isWebPayActive: true,
  isBankTransferActive: false,
  isPurchaseOrderActive: false,
  webPayPrefix: 'zeroq',
  webPayChildCommerceCode: '597055555533',
  bankName: null,
  accountType: null,
  accountNumber: null,
  accountHolderName: null,
  documentType: null,
  documentNumber: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockOrganizationPaymentMethod2: OrganizationPaymentMethod = {
  id: 2,
  organizationId: 2,
  isCheckActive: true,
  isWebPayActive: false,
  isBankTransferActive: true,
  isPurchaseOrderActive: false,
  webPayPrefix: 'workit',
  webPayChildCommerceCode: '597055555534',
  bankName: null,
  accountType: null,
  accountNumber: null,
  accountHolderName: null,
  documentType: null,
  documentNumber: null,
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

export const mockOrganizationPaymentMethodWithoutWebPay: OrganizationPaymentMethod = {
  id: 3,
  organizationId: 3,
  isCheckActive: true,
  isWebPayActive: false,
  isBankTransferActive: false,
  isPurchaseOrderActive: false,
  webPayPrefix: null,
  webPayChildCommerceCode: null,
  bankName: null,
  accountType: null,
  accountNumber: null,
  accountHolderName: null,
  documentType: null,
  documentNumber: null,
  createdAt: new Date('2024-01-03T00:00:00Z'),
  updatedAt: new Date('2024-01-03T00:00:00Z'),
};

export const mockOrganizationPaymentMethods: OrganizationPaymentMethod[] = [
  mockOrganizationPaymentMethod,
  mockOrganizationPaymentMethod2,
  mockOrganizationPaymentMethodWithoutWebPay,
];

export const mockCreateOrganizationPaymentMethodDto = {
  organizationId: 1,
  isCheckActive: false,
  isWebPayActive: true,
  isBankTransferActive: false,
  isPurchaseOrderActive: false,
  webPayPrefix: 'zeroq',
  webPayChildCommerceCode: '597055555533',
};

export const mockUpdateOrganizationPaymentMethodDto = {
  isWebPayActive: false,
  isBankTransferActive: true,
  webPayPrefix: 'updated',
  webPayChildCommerceCode: '597055555535',
};

export const mockCreateOrganizationPaymentMethodDtoMinimal = {
  organizationId: 1,
};

export const mockUpdateOrganizationPaymentMethodDtoPartial = {
  isWebPayActive: true,
};

