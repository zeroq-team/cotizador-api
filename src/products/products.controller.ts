import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  ProductFiltersDto,
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  PaginatedProductsDto,
  CreateProductMediaDto,
  UpdateProductMediaDto,
  UpsertProductPriceDto,
} from './dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos' })
  @ApiResponse({ status: 200, description: 'Lista de productos', type: PaginatedProductsDto })
  async getProducts(
    @Query() filters: ProductFiltersDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.productsService.getProducts(organizationId, filters);
  }

  @Get('random')
  @ApiOperation({ summary: 'Obtener productos aleatorios' })
  @ApiQuery({ name: 'limit', description: 'Cantidad de productos', required: false })
  @ApiResponse({ status: 200, description: 'Productos aleatorios', type: [ProductResponseDto] })
  async getRandomProducts(
    @Headers('x-organization-id') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.productsService.getRandomProducts(organizationId, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async getProduct(
    @Param('id') id: string,
    @Query() query: any,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.productsService.getProductById(Number(id), organizationId, query);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Obtener productos relacionados' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiQuery({ name: 'relationType', description: 'Tipo de relación', required: false })
  @ApiQuery({ name: 'limit', description: 'Cantidad máxima', required: false })
  @ApiResponse({ status: 200, description: 'Productos relacionados', type: [ProductResponseDto] })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async getRelatedProducts(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
    @Query('relationType') relationType?: string,
    @Query('limit') limit?: string,
  ) {
    const productId = parseInt(id, 10);
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.productsService.getRelatedProducts(productId, organizationId, relationType, limitNum);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.productsService.post('/products', createProductDto, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.productsService.put(`/products/${id}`, updateProductDto, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 204, description: 'Producto eliminado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deleteProduct(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return await this.productsService.delete(`/products/${id}`, organizationId);
  }

  // ============================================
  // PRODUCT MEDIA ENDPOINTS
  // ============================================

  @Get(':id/media')
  @ApiOperation({ summary: 'Obtener media del producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Lista de media' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async getProductMedia(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.getProductMedia(Number(id), organizationId);
  }

  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar media al producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 201, description: 'Media agregada' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async addProductMedia(
    @Param('id') id: string,
    @Body() media: CreateProductMediaDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.addProductMedia(Number(id), organizationId, media);
  }

  @Put(':id/media/:mediaId')
  @ApiOperation({ summary: 'Actualizar media del producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiParam({ name: 'mediaId', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media actualizada' })
  @ApiResponse({ status: 404, description: 'Producto o media no encontrado' })
  async updateProductMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Body() media: UpdateProductMediaDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.updateProductMedia(Number(id), Number(mediaId), organizationId, media);
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar media del producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiParam({ name: 'mediaId', description: 'ID del media' })
  @ApiResponse({ status: 204, description: 'Media eliminada' })
  @ApiResponse({ status: 404, description: 'Producto o media no encontrado' })
  async deleteProductMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.deleteProductMedia(Number(id), Number(mediaId), organizationId);
  }

  // ============================================
  // PRODUCT PRICES ENDPOINTS
  // ============================================

  @Get(':id/prices')
  @ApiOperation({ summary: 'Obtener todos los precios del producto' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Lista de precios del producto' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async getProductPrices(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.getProductPrices(Number(id), organizationId);
  }

  @Post(':id/prices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear o actualizar precio del producto en una lista de precios' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ status: 201, description: 'Precio creado/actualizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async upsertProductPrice(
    @Param('id') id: string,
    @Body() priceData: UpsertProductPriceDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.upsertProductPrice(Number(id), organizationId, priceData);
  }

  @Delete(':id/prices/:priceListId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar precio del producto de una lista de precios' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiParam({ name: 'priceListId', description: 'ID de la lista de precios' })
  @ApiResponse({ status: 204, description: 'Precio eliminado' })
  @ApiResponse({ status: 404, description: 'Producto o precio no encontrado' })
  async deleteProductPrice(
    @Param('id') id: string,
    @Param('priceListId') priceListId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('El header X-Organization-ID es obligatorio');
    }
    return await this.productsService.deleteProductPrice(Number(id), Number(priceListId), organizationId);
  }
}
