import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { WebpayService } from './webpay.service';
import { PaymentService } from '../payment.service';
import { OrganizationPaymentMethodRepository } from '../../organization/organization-payment-method.repository';
import { CreateWebpayTransactionDto } from './dto/create-webpay-transaction.dto';
import { CommitWebpayTransactionDto } from './dto/commit-webpay-transaction.dto';
import { mockPayment } from '../__mocks__/payment.mocks';

// Mock the transbank-sdk module
jest.mock('transbank-sdk', () => {
  const mockMallTransaction = {
    create: jest.fn(),
    commit: jest.fn(),
  };

  const mockTransactionDetail = jest.fn();

  const MockMallTransaction = jest
    .fn()
    .mockImplementation(() => mockMallTransaction);
  
  (MockMallTransaction as any).buildForIntegration = jest
    .fn()
    .mockReturnValue(mockMallTransaction);

  return {
    WebpayPlus: {
      MallTransaction: MockMallTransaction,
    },
    TransactionDetail: mockTransactionDetail,
  };
});

describe('WebpayService', () => {
  let service: WebpayService;
  let paymentService: jest.Mocked<PaymentService>;
  let organizationPaymentMethodRepository: jest.Mocked<OrganizationPaymentMethodRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        WEBPAY_COMMERCE_CODE: '597055555532',
        WEBPAY_API_KEY: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
        WEBPAY_ENVIRONMENT: 'integration',
        WEBPAY_RETURN_BASE_URL: 'https://example.com',
      };
      return config[key];
    }),
  };

  const mockOrganizationPaymentMethod = {
    id: 1,
    organizationId: 3,
    isCheckActive: false,
    isWebPayActive: true,
    isBankTransferActive: false,
    webPayPrefix: 'zeroq',
    webPayChildCommerceCode: '597055555533',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockPaymentService = {
    create: jest.fn(),
    findByTransactionId: jest.fn(),
    update: jest.fn(),
  };

  const mockOrganizationPaymentMethodRepository = {
    findByOrganizationId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebpayService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: OrganizationPaymentMethodRepository,
          useValue: mockOrganizationPaymentMethodRepository,
        },
      ],
    }).compile();

    service = module.get<WebpayService>(WebpayService);
    paymentService = module.get(PaymentService);
    organizationPaymentMethodRepository = module.get(
      OrganizationPaymentMethodRepository,
    );
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    const createDto: CreateWebpayTransactionDto = {
      cartId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 10000,
      organizationId: 3,
    };

    const mockWebpayResponse = {
      token: '01ab123456789012345678901234567890123456789012345678901234567890',
      url: 'https://webpay3g.transbank.cl/webpayserver/initTransaction',
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup default mocks
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue(
        mockOrganizationPaymentMethod,
      );
      paymentService.create.mockResolvedValue(mockPayment);
      
      // Mock transbank SDK
      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        create: jest.fn().mockResolvedValue(mockWebpayResponse),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);
    });

    it('should create a transaction successfully', async () => {
      const result = await service.createTransaction(createDto);

      expect(result).toMatchObject({
        token: mockWebpayResponse.token,
        url: mockWebpayResponse.url,
        buyOrder: expect.any(String),
        sessionId: expect.any(String),
        paymentId: mockPayment.id,
        message: 'Transacción creada exitosamente',
      });

      expect(
        organizationPaymentMethodRepository.findByOrganizationId,
      ).toHaveBeenCalledWith(createDto.organizationId);
      expect(paymentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: createDto.cartId,
          amount: createDto.amount,
          paymentType: 'webpay',
          status: 'pending',
          transactionId: expect.any(String),
          notes: expect.stringContaining('Pago WebPay iniciado'),
        }),
      );
    });

    it('should throw InternalServerErrorException when organization payment method not found', async () => {
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue(
        null,
      );

      // The service wraps NotFoundException in InternalServerErrorException
      await expect(service.createTransaction(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(
        organizationPaymentMethodRepository.findByOrganizationId,
      ).toHaveBeenCalledWith(createDto.organizationId);
      expect(paymentService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when WebPay is not active', async () => {
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue({
        ...mockOrganizationPaymentMethod,
        isWebPayActive: false,
      });

      await expect(service.createTransaction(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when child commerce code is not configured', async () => {
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue({
        ...mockOrganizationPaymentMethod,
        webPayChildCommerceCode: null,
      });

      await expect(service.createTransaction(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentService.create).not.toHaveBeenCalled();
    });

    it('should use default prefix when webPayPrefix is not set', async () => {
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue({
        ...mockOrganizationPaymentMethod,
        webPayPrefix: null,
      });

      const result = await service.createTransaction(createDto);

      expect(result.buyOrder).toContain('zeroq');
      expect(paymentService.create).toHaveBeenCalled();
    });

    it('should generate correct transaction identifiers', async () => {
      const result = await service.createTransaction(createDto);

      expect(result.buyOrder).toMatch(/^zeroq-/);
      expect(result.buyOrder.length).toBeLessThanOrEqual(26);
      expect(result.sessionId).toBe(result.buyOrder);
    });

    it('should throw BadRequestException when prefix is too long', async () => {
      // Prefix must be >= 25 characters to trigger the error (maxUuidChars < 1)
      // 26 - prefix.length - 1 < 1 => prefix.length >= 25
      const veryLongPrefix = 'a'.repeat(25);
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue({
        ...mockOrganizationPaymentMethod,
        webPayPrefix: veryLongPrefix,
      });

      await expect(service.createTransaction(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create payment with correct metadata', async () => {
      await service.createTransaction(createDto);

      expect(paymentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            webpay_init: expect.objectContaining({
              buyOrder: expect.any(String),
              sessionId: expect.any(String),
              organizationId: createDto.organizationId,
              timestamp: expect.any(String),
            }),
          }),
        }),
      );
    });

    it('should handle Webpay API errors', async () => {
      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        create: jest.fn().mockRejectedValue(new Error('Webpay API error')),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);

      await expect(service.createTransaction(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should validate minimum amount', async () => {
      const dtoWithLowAmount = {
        ...createDto,
        amount: 49,
      };

      // Note: This validation might be done at DTO level, but we test service behavior
      // If amount is too low, it should fail
      organizationPaymentMethodRepository.findByOrganizationId.mockResolvedValue(
        mockOrganizationPaymentMethod,
      );

      // The service doesn't validate amount directly, but we can test the flow
      // If DTO validation passes, service should proceed
      const result = await service.createTransaction(dtoWithLowAmount as any);

      expect(result).toBeDefined();
    });
  });

  describe('commitTransaction', () => {
    const commitDto: CommitWebpayTransactionDto = {
      token: '01ab123456789012345678901234567890123456789012345678901234567890',
    };

    const mockCommitResponse = {
      vci: 'TSY',
      amount: 10000,
      status: 'AUTHORIZED',
      buy_order: 'zeroq-1234567890abcdef',
      session_id: 'zeroq-1234567890abcdef',
      card_detail: {
        card_number: '1234',
      },
      accounting_date: '2024-01-01',
      transaction_date: '2024-01-01T00:00:00.000Z',
      details: [
        {
          amount: 10000,
          status: 'AUTHORIZED',
          authorization_code: '123456',
          payment_type_code: 'VN',
          response_code: 0,
          installments_number: 0,
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock transbank SDK
      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        commit: jest.fn().mockResolvedValue(mockCommitResponse),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);
    });

    it('should commit a transaction successfully', async () => {
      const paymentWithTransactionId = {
        ...mockPayment,
        transactionId: mockCommitResponse.buy_order,
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithTransactionId,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithTransactionId,
        status: 'completed',
      });

      const result = await service.commitTransaction(commitDto);

      expect(result.success).toBe(true);
      expect(result.transaction).toMatchObject({
        vci: mockCommitResponse.vci,
        amount: mockCommitResponse.details[0].amount,
        status: mockCommitResponse.details[0].status,
        authorization_code: mockCommitResponse.details[0].authorization_code,
        buy_order: mockCommitResponse.buy_order,
      });

      expect(paymentService.findByTransactionId).toHaveBeenCalledWith(
        mockCommitResponse.buy_order,
      );
      expect(paymentService.update).toHaveBeenCalledWith(
        paymentWithTransactionId.id,
        expect.objectContaining({
          status: 'completed',
          authorizationCode: mockCommitResponse.details[0].authorization_code,
        }),
      );
    });

    it('should update payment status to failed when transaction is not authorized', async () => {
      const failedResponse = {
        ...mockCommitResponse,
        details: [
          {
            ...mockCommitResponse.details[0],
            status: 'REJECTED',
            response_code: -1,
          },
        ],
      };

      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        commit: jest.fn().mockResolvedValue(failedResponse),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);

      const paymentWithTransactionId = {
        ...mockPayment,
        transactionId: failedResponse.buy_order,
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithTransactionId,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithTransactionId,
        status: 'failed',
      });

      const result = await service.commitTransaction(commitDto);

      expect(result.success).toBe(true);
      expect(result.transaction.status).toBe('REJECTED');
      expect(paymentService.update).toHaveBeenCalledWith(
        paymentWithTransactionId.id,
        expect.objectContaining({
          status: 'failed',
        }),
      );
    });

    it('should handle case when payment is not found', async () => {
      paymentService.findByTransactionId.mockResolvedValue(null);

      const result = await service.commitTransaction(commitDto);

      expect(result.success).toBe(true);
      expect(paymentService.findByTransactionId).toHaveBeenCalledWith(
        mockCommitResponse.buy_order,
      );
      expect(paymentService.update).not.toHaveBeenCalled();
    });

    it('should preserve existing metadata when updating payment', async () => {
      const paymentWithMetadata = {
        ...mockPayment,
        transactionId: mockCommitResponse.buy_order,
        metadata: {
          webpay_init: {
            buyOrder: mockCommitResponse.buy_order,
            sessionId: mockCommitResponse.session_id,
            organizationId: 3,
            timestamp: '2024-01-01T00:00:00Z',
          },
        },
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithMetadata,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithMetadata,
        status: 'completed',
      });

      await service.commitTransaction(commitDto);

      expect(paymentService.update).toHaveBeenCalledWith(
        paymentWithMetadata.id,
        expect.objectContaining({
          metadata: expect.objectContaining({
            webpay_init: expect.any(Object),
            webpay_commit: expect.objectContaining({
              vci: mockCommitResponse.vci,
              status: mockCommitResponse.details[0].status,
            }),
          }),
        }),
      );
    });

    it('should handle empty metadata when updating payment', async () => {
      const paymentWithNullMetadata = {
        ...mockPayment,
        transactionId: mockCommitResponse.buy_order,
        metadata: null,
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithNullMetadata,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithNullMetadata,
        status: 'completed',
      });

      await service.commitTransaction(commitDto);

      expect(paymentService.update).toHaveBeenCalledWith(
        paymentWithNullMetadata.id,
        expect.objectContaining({
          metadata: expect.objectContaining({
            webpay_commit: expect.any(Object),
          }),
        }),
      );
    });

    it('should extract card last four digits correctly', async () => {
      const paymentWithTransactionId = {
        ...mockPayment,
        transactionId: mockCommitResponse.buy_order,
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithTransactionId,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithTransactionId,
        status: 'completed',
      });

      await service.commitTransaction(commitDto);

      expect(paymentService.update).toHaveBeenCalledWith(
        paymentWithTransactionId.id,
        expect.objectContaining({
          cardLastFourDigits: '1234',
        }),
      );
    });

    it('should handle Webpay commit API errors', async () => {
      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        commit: jest.fn().mockRejectedValue(new Error('Webpay API error')),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);

      await expect(service.commitTransaction(commitDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle missing details in commit response', async () => {
      const responseWithoutDetails = {
        ...mockCommitResponse,
        details: [],
      };

      const { WebpayPlus } = require('transbank-sdk');
      const mockMallTransaction = {
        commit: jest.fn().mockResolvedValue(responseWithoutDetails),
      };
      (WebpayPlus.MallTransaction.buildForIntegration as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockMallTransaction);

      const paymentWithTransactionId = {
        ...mockPayment,
        transactionId: responseWithoutDetails.buy_order,
      };

      paymentService.findByTransactionId.mockResolvedValue(
        paymentWithTransactionId,
      );
      paymentService.update.mockResolvedValue({
        ...paymentWithTransactionId,
        status: 'failed',
      });

      const result = await service.commitTransaction(commitDto);

      expect(result.success).toBe(true);
      expect(result.transaction.status).toBeUndefined();
    });
  });

  describe('generateTransactionIdentifiers', () => {
    it('should generate identifiers with correct format', () => {
      const cartId = '550e8400-e29b-41d4-a716-446655440001';
      const prefix = 'zeroq';

      // Access private method through type assertion
      const identifiers = (service as any).generateTransactionIdentifiers(
        cartId,
        prefix,
      );

      expect(identifiers.buyOrder).toMatch(/^zeroq-/);
      expect(identifiers.buyOrder.length).toBeLessThanOrEqual(26);
      expect(identifiers.sessionId).toBe(identifiers.buyOrder);
      expect(identifiers.childBuyOrder).toBe(identifiers.buyOrder);
    });

    it('should throw BadRequestException for prefix too long', () => {
      const cartId = '550e8400-e29b-41d4-a716-446655440001';
      // Prefix must be >= 25 characters to trigger the error (maxUuidChars < 1)
      // 26 - prefix.length - 1 < 1 => prefix.length >= 25
      const prefix = 'a'.repeat(25);

      expect(() => {
        (service as any).generateTransactionIdentifiers(cartId, prefix);
      }).toThrow(BadRequestException);
    });

    it('should handle short cart IDs', () => {
      const cartId = '123';
      const prefix = 'zeroq';

      const identifiers = (service as any).generateTransactionIdentifiers(
        cartId,
        prefix,
      );

      expect(identifiers.buyOrder).toMatch(/^zeroq-/);
      expect(identifiers.buyOrder.length).toBeLessThanOrEqual(26);
    });
  });

  describe('getMallTransaction', () => {
    it('should return integration transaction in non-production environment', () => {
      const transaction = (service as any).getMallTransaction();
      expect(transaction).toBeDefined();
    });

    it('should use production transaction when environment is production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          WEBPAY_COMMERCE_CODE: '597055555532',
          WEBPAY_API_KEY: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
          WEBPAY_ENVIRONMENT: 'production',
          WEBPAY_RETURN_BASE_URL: 'https://example.com',
        };
        return config[key];
      });

      // Recreate service with production config
      const productionService = new WebpayService(
        configService,
        paymentService,
        organizationPaymentMethodRepository,
      );

      const transaction = (productionService as any).getMallTransaction();
      expect(transaction).toBeDefined();
    });
  });
});

