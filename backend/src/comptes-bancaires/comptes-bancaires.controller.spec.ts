import { Test, TestingModule } from '@nestjs/testing';
import { ComptesBancairesController } from './comptes-bancaires.controller';

describe('ComptesBancairesController', () => {
  let controller: ComptesBancairesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComptesBancairesController],
    }).compile();

    controller = module.get<ComptesBancairesController>(ComptesBancairesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
