import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CnpjController } from '../../../../src/modules/cnpj/cnpj.controller';
import { CnpjService } from '../../../../src/modules/cnpj/cnpj.service';

const mockCnpjService = {
  buscarPorCnpj: jest.fn(),
  listar: jest.fn(),
};

describe('CnpjController', () => {
  let controller: CnpjController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [CnpjController],
      providers: [{ provide: CnpjService, useValue: mockCnpjService }],
    }).compile();

    controller = module.get<CnpjController>(CnpjController);
    jest.clearAllMocks();
  });

  describe('buscarPorCnpj', () => {
    it('deve chamar service.buscarPorCnpj com o CNPJ recebido', async () => {
      const expected = { cnpjBasico: '00000000', razaoSocial: 'EMPRESA' };
      mockCnpjService.buscarPorCnpj.mockResolvedValue(expected);

      const result = await controller.buscarPorCnpj('00000000000191');

      expect(mockCnpjService.buscarPorCnpj).toHaveBeenCalledWith('00000000000191');
      expect(result).toEqual(expected);
    });

    it('deve propagar BadRequestException do service', async () => {
      mockCnpjService.buscarPorCnpj.mockRejectedValue(new BadRequestException('CNPJ inválido'));

      await expect(controller.buscarPorCnpj('invalido')).rejects.toThrow(BadRequestException);
    });

    it('deve propagar NotFoundException do service', async () => {
      mockCnpjService.buscarPorCnpj.mockRejectedValue(new NotFoundException());

      await expect(controller.buscarPorCnpj('00000000000191')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listar', () => {
    it('deve chamar service.listar com os parâmetros do dto', async () => {
      const expected = { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } };
      mockCnpjService.listar.mockResolvedValue(expected);

      const result = await controller.listar({ page: 1, limit: 20 });

      expect(mockCnpjService.listar).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual(expected);
    });

    it('deve passar filtros para o service', async () => {
      mockCnpjService.listar.mockResolvedValue({ data: [], meta: {} });

      await controller.listar({ uf: 'MG', situacao_cadastral: '02', page: 1, limit: 10 });

      expect(mockCnpjService.listar).toHaveBeenCalledWith({
        uf: 'MG',
        situacao_cadastral: '02',
        page: 1,
        limit: 10,
      });
    });
  });
});
