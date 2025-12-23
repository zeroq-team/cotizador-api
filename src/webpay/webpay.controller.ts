import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { WebpayService } from './webpay.service';
import { CreateWebpayTransactionDto } from './dto/create-webpay-transaction.dto';
import { CommitWebpayTransactionDto } from './dto/commit-webpay-transaction.dto';
import {
  WebpayTransactionResponseDto,
  WebpayCommitResponseDto,
} from './dto/webpay-transaction-response.dto';

@ApiTags('webpay')
@Controller('webpay')
export class WebpayController {
  constructor(private readonly webpayService: WebpayService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create WebPay transaction',
    description:
      'Creates a WebPay Plus Mall transaction and returns the token and URL to redirect the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction created successfully',
    type: WebpayTransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or amount too low',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error creating transaction',
  })
  async create(
    @Body() createWebpayTransactionDto: CreateWebpayTransactionDto,
  ): Promise<WebpayTransactionResponseDto> {
    return await this.webpayService.createTransaction(
      createWebpayTransactionDto,
    );
  }

  @Post('commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Commit WebPay transaction',
    description:
      'Confirms a WebPay transaction after the user returns from the payment gateway',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction confirmed successfully',
    type: WebpayCommitResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Token not provided',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error confirming transaction',
  })
  async commit(
    @Body() commitWebpayTransactionDto: CommitWebpayTransactionDto,
  ): Promise<WebpayCommitResponseDto> {
    return await this.webpayService.commitTransaction(
      commitWebpayTransactionDto,
    );
  }
}

