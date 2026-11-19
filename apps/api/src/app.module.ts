import { Controller, Get, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import { PrismaModule } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MailService } from './auth/mail.service';
import { GoogleVerifier } from './auth/google.verifier';
import { UsersController } from './users/users.controller';
import { AdminController } from './common/admin.controller';
import { RegionsController, AdminWardsController } from './regions/regions.controller';
import { ProductsController, WishlistController } from './products/products.controller';
import { AdminProductsController } from './admin/admin-products.controller';
import { UploadsController } from './uploads/uploads.controller';
import { StorageService } from './uploads/storage.service';
import { CartController } from './cart/cart.controller';
import { OrdersController } from './orders/orders.controller';
import { PricingService } from './orders/pricing.service';
import { AdminGeoController } from './regions/admin-geo.controller';
import { GeoService } from './regions/geo.service';
import { AdminOrdersController } from './admin/admin-orders.controller';
import { AdminDashboardController } from './admin/admin-dashboard.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { NotifyService } from './notifications/notify.service';
import { OutboxService } from './notifications/outbox.service';
import { OrderFlowService } from './orders/order-flow.service';
import { PreviewsController } from './previews/previews.controller';
import { PreviewsService } from './previews/previews.service';
import { PreviewJobsService } from './previews/preview-jobs.service';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';
import { ReviewJobsService } from './reviews/review-jobs.service';
import { AdminReviewsController } from './admin/admin-reviews.controller';
import { GardenController } from './garden/garden.controller';
import { GardenService } from './garden/garden.service';
import { AdminShopInfoController, ShopInfoController, ShopInfoService } from './content/shop-info';
import { GardenConfigService } from './garden/garden-config';
import { AdminGardenController } from './garden/admin-garden.controller';
import { ContentController, AdminContentController } from './content/content.controller';
import { AdminTaxonomyController } from './admin/admin-taxonomy.controller';
import { AdminInterRatesController } from './admin/admin-inter-rates.controller';
import { AdminCardsController } from './admin/admin-cards.controller';
import { ShippingService } from './orders/shipping.service';
import { TaxonomyService } from './admin/taxonomy.service';
import { JwtAuthGuard, RolesGuard } from './common/roles';
import { APP_FILTER } from '@nestjs/core';
import { AlertService, ErrorAlertFilter } from './common/alert.service';
import { RateLimitGuard } from './common/rate-limit';
import { AdminBootstrapService } from './common/admin-bootstrap.service';

@ApiTags('Hệ thống')
@Controller()
class HealthController {
  @Get('health') health() { return { status: 'ok', time: new Date().toISOString() }; }
}

@Module({
  imports: [PrismaModule, JwtModule.register({ global: true })],
  controllers: [HealthController, AuthController, UsersController, AdminController, RegionsController, AdminWardsController, ProductsController, WishlistController, AdminProductsController, UploadsController, CartController, OrdersController, AdminGeoController, AdminOrdersController, AdminDashboardController, NotificationsController, PreviewsController, ReviewsController, AdminReviewsController, GardenController, ContentController, AdminContentController, AdminTaxonomyController, AdminInterRatesController, AdminGardenController, AdminCardsController, ShopInfoController, AdminShopInfoController],
  providers: [ShopInfoService, GardenConfigService, ShippingService, TaxonomyService, AdminBootstrapService, AlertService, { provide: APP_FILTER, useClass: ErrorAlertFilter }, RateLimitGuard, GardenService, ReviewsService, ReviewJobsService, PreviewsService, PreviewJobsService, NotifyService, OutboxService, OrderFlowService, GeoService, PricingService, StorageService, AuthService, MailService, GoogleVerifier, JwtAuthGuard, RolesGuard],
})
export class AppModule {}
