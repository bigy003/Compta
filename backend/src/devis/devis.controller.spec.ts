import { Test, TestingModule } from '@nestjs/testing';
import { DevisController } from './devis.controller';

describe('DevisController', () => {
  let controller: DevisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevisController],
    }).compile();

    controller = module.get<DevisController>(DevisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
