import { Test, TestingModule } from '@nestjs/testing';
import { WebpayController } from './webpay.controller';
import { WebpayService } from './webpay.service';
import { CreateWebpayTransactionDto } from './dto/create-webpay-transaction.dto';
import { CommitWebpayTransactionDto } from './dto/commit-webpay-transaction.dto';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('WebpayController', () => {
  let controller: WebpayController;
  let webpayService: jest.Mocked<WebpayService>;

  const mockWebpayService = {
    createTransaction: jest.fn(),
    commitTransaction: jest.fn(),
  };

  const mockCreateTransactionResponse = {
    token: '01ab123456789012345678901234567890123456789012345678901234567890',
    url: 'https://webpay3g.transbank.cl/webpayserver/initTransaction',
    buyOrder: 'zeroq-1234567890abcdef',
    sessionId: 'zeroq-1234567890abcdef',
    paymentId: '550e8400-e29b-41d4-a716-446655440000',
    message: 'Transacción creada exitosamente',
  };

  const mockCommitTransactionResponse = {
    success: true,
    transaction: {
      vci: 'TSY',
      amount: 10000,
      status: 'AUTHORIZED',
      authorization_code: '123456',
      payment_type_code: 'VN',
      response_code: 0,
      installments_number: 0,
      buy_order: 'zeroq-1234567890abcdef',
      session_id: 'zeroq-1234567890abcdef',
      card_detail: {
        card_number: '1234',
      },
      accounting_date: '2024-01-01',
      transaction_date: '2024-01-01T00:00:00.000Z',
      details: [],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebpayController],
      providers: [
        {
          provide: WebpayService,
          useValue: mockWebpayService,
        },
      ],
    }).compile();

    controller = module.get<WebpayController>(WebpayController);
    webpayService = module.get(WebpayService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateWebpayTransactionDto = {
      cartId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 10000,
      organizationId: 3,
    };

    it('should create a transaction successfully', async () => {
      webpayService.createTransaction.mockResolvedValue(
        mockCreateTransactionResponse,
      );

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreateTransactionResponse);
      expect(webpayService.createTransaction).toHaveBeenCalledWith(createDto);
      expect(webpayService.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const error = new BadRequestException('WebPay no está activo');
      webpayService.createTransaction.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(webpayService.createTransaction).toHaveBeenCalledWith(createDto);
    });

    it('should throw NotFoundException when service throws NotFoundException', async () => {
      const error = new NotFoundException(
        'No se encontró configuración de pagos',
      );
      webpayService.createTransaction.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(webpayService.createTransaction).toHaveBeenCalledWith(createDto);
    });

    it('should throw InternalServerErrorException when service throws InternalServerErrorException', async () => {
      const error = new InternalServerErrorException('Error al crear la transacción');
      webpayService.createTransaction.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(webpayService.createTransaction).toHaveBeenCalledWith(createDto);
    });

    it('should propagate generic errors', async () => {
      const error = new Error('Unexpected error');
      webpayService.createTransaction.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(Error);
      expect(webpayService.createTransaction).toHaveBeenCalledWith(createDto);
    });

    it('should handle different cart IDs', async () => {
      const differentDto = {
        ...createDto,
        cartId: 'different-cart-id-12345',
      };

      webpayService.createTransaction.mockResolvedValue(
        mockCreateTransactionResponse,
      );

      const result = await controller.create(differentDto);

      expect(result).toEqual(mockCreateTransactionResponse);
      expect(webpayService.createTransaction).toHaveBeenCalledWith(
        differentDto,
      );
    });

    it('should handle different amounts', async () => {
      const differentDto = {
        ...createDto,
        amount: 50000,
      };

      webpayService.createTransaction.mockResolvedValue(
        mockCreateTransactionResponse,
      );

      const result = await controller.create(differentDto);

      expect(result).toEqual(mockCreateTransactionResponse);
      expect(webpayService.createTransaction).toHaveBeenCalledWith(
        differentDto,
      );
    });

    it('should handle different organization IDs', async () => {
      const differentDto = {
        ...createDto,
        organizationId: 5,
      };

      webpayService.createTransaction.mockResolvedValue(
        mockCreateTransactionResponse,
      );

      const result = await controller.create(differentDto);

      expect(result).toEqual(mockCreateTransactionResponse);
      expect(webpayService.createTransaction).toHaveBeenCalledWith(
        differentDto,
      );
    });
  });

  describe('commit', () => {
    const commitDto: CommitWebpayTransactionDto = {
      token: '01ab123456789012345678901234567890123456789012345678901234567890',
    };

    it('should commit a transaction successfully', async () => {
      webpayService.commitTransaction.mockResolvedValue(
        mockCommitTransactionResponse,
      );

      const result = await controller.commit(commitDto);

      expect(result).toEqual(mockCommitTransactionResponse);
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(commitDto);
      expect(webpayService.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when service throws InternalServerErrorException', async () => {
      const error = new InternalServerErrorException(
        'Error al confirmar la transacción',
      );
      webpayService.commitTransaction.mockRejectedValue(error);

      await expect(controller.commit(commitDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(commitDto);
    });

    it('should propagate generic errors', async () => {
      const error = new Error('Unexpected error');
      webpayService.commitTransaction.mockRejectedValue(error);

      await expect(controller.commit(commitDto)).rejects.toThrow(Error);
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(commitDto);
    });

    it('should handle different tokens', async () => {
      const differentDto = {
        token: 'different-token-123456789012345678901234567890123456789012345678901234567890',
      };

      webpayService.commitTransaction.mockResolvedValue(
        mockCommitTransactionResponse,
      );

      const result = await controller.commit(differentDto);

      expect(result).toEqual(mockCommitTransactionResponse);
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(
        differentDto,
      );
    });

    it('should handle failed transaction response', async () => {
      const failedResponse = {
        success: true,
        transaction: {
          ...mockCommitTransactionResponse.transaction,
          status: 'REJECTED',
          response_code: -1,
        },
      };

      webpayService.commitTransaction.mockResolvedValue(failedResponse);

      const result = await controller.commit(commitDto);

      expect(result).toEqual(failedResponse);
      expect(result.transaction.status).toBe('REJECTED');
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(commitDto);
    });

    it('should handle authorized transaction response', async () => {
      const authorizedResponse = {
        success: true,
        transaction: {
          ...mockCommitTransactionResponse.transaction,
          status: 'AUTHORIZED',
          response_code: 0,
        },
      };

      webpayService.commitTransaction.mockResolvedValue(authorizedResponse);

      const result = await controller.commit(commitDto);

      expect(result).toEqual(authorizedResponse);
      expect(result.transaction.status).toBe('AUTHORIZED');
      expect(webpayService.commitTransaction).toHaveBeenCalledWith(commitDto);
    });
  });
});

