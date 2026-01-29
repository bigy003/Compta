import { Test, TestingModule } from '@nestjs/testing';
import { DevisService } from './devis.service';

describe('DevisService', () => {
  let service: DevisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DevisService],
    }).compile();

    service = module.get<DevisService>(DevisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
