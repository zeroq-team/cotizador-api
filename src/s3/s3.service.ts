import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Tipos para las operaciones
export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface PresignedUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucketName: string;
  private region: string;
  private imagesFolder: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.imagesFolder =
      this.configService.get<string>('AWS_S3_IMAGES_FOLDER') || 'images';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!accessKeyId || !secretAccessKey) {
      console.warn(
        'AWS credentials not fully configured. S3 operations may fail.',
      );
    }

    if (!this.bucketName) {
      console.warn('AWS_S3_BUCKET_NAME not configured. S3 operations may fail.');
    }

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      // Asegurar que use signature v4
      forcePathStyle: false,
    });
  }

  /**
   * Sanitiza metadatos para S3 (solo ASCII imprimibles, sin caracteres especiales)
   */
  private sanitizeMetadata(
    metadata?: Record<string, string>,
  ): Record<string, string> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Sanitizar clave: solo letras, números, guiones y guiones bajos
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      // Sanitizar valor: solo ASCII imprimibles
      const sanitizedValue = value
        .replace(/[^\x20-\x7E]/g, '')
        .substring(0, 1024); // S3 tiene límite de 2KB por metadata, pero limitamos a 1024 chars por valor
      sanitized[sanitizedKey] = sanitizedValue;
    }
    return sanitized;
  }

  /**
   * Subir un archivo a S3
   */
  async uploadFile(
    file: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      // Validar que bucketName esté configurado
      if (!this.bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME is not configured');
      }

      // Validar credenciales
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials are not configured');
      }

      // Sanitizar metadatos
      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      // Agregar prefijo de carpeta para imágenes
      if (contentType.startsWith('image/')) {
        key = this.imagesFolder + '/' + key;
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: sanitizedMetadata,
      });

      await this.client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subir imagen con optimizaciones
   */
  async uploadImage(
    file: Buffer | Uint8Array | string,
    folder: string,
    filename: string,
    metadata?: Record<string, string>,
    contentType: string = 'image/jpeg',
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const key = `${folder}/${timestamp}-${filename}`;

    return this.uploadFile(file, key, contentType, {
      ...metadata,
      'uploaded-at': new Date().toISOString(),
    });
  }

  /**
   * Subir imagen de producto
   */
  async uploadProductImage(
    file: Buffer | Uint8Array | string,
    productId: string,
    filename: string,
    variant?: string,
  ): Promise<UploadResult> {
    const folder = variant
      ? `products/${productId}/${variant}`
      : `products/${productId}`;
    return this.uploadImage(file, folder, filename, {
      'product-id': productId,
      'image-type': variant || 'main',
    });
  }

  /**
   * Subir avatar de usuario
   */
  async uploadUserAvatar(
    file: Buffer | Uint8Array | string,
    userId: string,
    filename: string,
  ): Promise<UploadResult> {
    return this.uploadImage(file, `users/${userId}`, filename, {
      'user-id': userId,
      'image-type': 'avatar',
    });
  }

  /**
   * Eliminar archivo de S3
   */
  async deleteFile(key: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generar URL firmada para acceso temporal
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<PresignedUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      return {
        success: true,
        url,
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generar URL pública (para archivos públicos)
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extraer key de una URL S3
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch {
      return null;
    }
  }

  /**
   * Eliminar archivo por URL
   */
  async deleteFileByUrl(url: string): Promise<DeleteResult> {
    const key = this.extractKeyFromUrl(url);
    if (!key) {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }
    return this.deleteFile(key);
  }
}