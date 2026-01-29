import { Test, TestingModule } from '@nestjs/testing';
import { PlanComptableController } from './plan-comptable.controller';

describe('PlanComptableController', () => {
  let controller: PlanComptableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanComptableController],
    }).compile();

    controller = module.get<PlanComptableController>(PlanComptableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
