import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { S3Service } from './s3.service';

@ApiTags('s3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @ApiOperation({
    summary: 'Subir imagen de personalización',
    description: 'Sube una imagen de personalización a S3 y retorna la URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen a subir',
        },
        cartId: {
          type: 'string',
          description: 'ID del carrito (opcional)',
        },
        fieldName: {
          type: 'string',
          description: 'Nombre del campo de personalización (opcional)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        url: { type: 'string' },
        key: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post('upload/customization-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCustomizationImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('cartId') cartId?: string,
    @Body('fieldName') fieldName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validar que sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Construir folder path
    const folder = cartId
      ? `customizations/${cartId}`
      : 'customizations/general';

    // Generar nombre de archivo único (solo timestamp y extensión, sin nombre original)
    const timestamp = Date.now();
    const parts = file.originalname.split('.');
    const extension = parts.length > 1 ? parts.pop() : 'jpg';
    const filename = `${timestamp}.${extension}`;

    // Subir a S3
    const result = await this.s3Service.uploadImage(
      file.buffer,
      folder,
      filename,
      {
        'cart-id': cartId || 'unknown',
        'field-name': fieldName || 'unknown',
        'original-name': file.originalname,
      },
      file.mimetype, // Pasar el contentType correcto
    );

    if (!result.success) {
      throw new BadRequestException(
        `Failed to upload image: ${result.error}`,
      );
    }

    return {
      success: true,
      url: result.url,
      key: result.key,
    };
  }

  @ApiOperation({
    summary: 'Subir imagen de producto',
    description: 'Sube una imagen de producto a S3 y retorna la URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        productId: {
          type: 'string',
        },
        variant: {
          type: 'string',
          description: 'Variante del producto (opcional)',
        },
      },
      required: ['file', 'productId'],
    },
  })
  @Post('upload/product-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
    @Body('variant') variant?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    // Validar que sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const result = await this.s3Service.uploadProductImage(
      file.buffer,
      productId,
      file.originalname,
      variant,
    );

    if (!result.success) {
      throw new BadRequestException(
        `Failed to upload image: ${result.error}`,
      );
    }

    return {
      success: true,
      url: result.url,
      key: result.key,
    };
  }
}

