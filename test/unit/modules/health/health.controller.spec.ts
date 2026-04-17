import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from '../../../../src/modules/health/health.controller';
import { PrismaService } from '../../../../src/prisma/prisma.service';

const mockHealthCheckService = {
  check: jest.fn(),
};

const mockPrismaService = {
  isHealthy: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('deve retornar status ok imediatamente sem checar banco', () => {
      const result = controller.liveness();

      expect(result).toEqual({ status: 'ok' });
      expect(mockPrismaService.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('deve retornar status ok e database connected quando banco está disponível', async () => {
      mockPrismaService.isHealthy.mockResolvedValue(true);

      const result = await controller.readiness();

      expect(mockPrismaService.isHealthy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'ok', database: 'connected' });
    });

    it('deve lançar erro quando banco não está disponível', async () => {
      mockPrismaService.isHealthy.mockResolvedValue(false);

      await expect(controller.readiness()).rejects.toThrow('Database unavailable');
    });
  });
});
