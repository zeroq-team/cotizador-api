import { ApiProperty } from '@nestjs/swagger';

export class WebpayTransactionResponseDto {
  @ApiProperty({ description: 'WebPay transaction token' })
  token: string;

  @ApiProperty({ description: 'WebPay redirect URL' })
  url: string;

  @ApiProperty({ description: 'Buy order identifier' })
  buyOrder: string;

  @ApiProperty({ description: 'Session identifier' })
  sessionId: string;

  @ApiProperty({ description: 'Payment ID in our system' })
  paymentId: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class WebpayCommitResponseDto {
  @ApiProperty({ description: 'Transaction was successful' })
  success: boolean;

  @ApiProperty({
    description: 'Transaction details',
    type: Object,
  })
  transaction: {
    vci: string;
    amount: number;
    status: string;
    authorization_code: string;
    payment_type_code: string;
    response_code: number;
    installments_number: number;
    buy_order: string;
    session_id: string;
    card_detail: {
      card_number: string;
    };
    accounting_date: string;
    transaction_date: string;
    details: any[];
  };
}

