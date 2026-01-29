import { Test, TestingModule } from '@nestjs/testing';
import { PlanComptableService } from './plan-comptable.service';

describe('PlanComptableService', () => {
  let service: PlanComptableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanComptableService],
    }).compile();

    service = module.get<PlanComptableService>(PlanComptableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
