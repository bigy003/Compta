import { Test, TestingModule } from '@nestjs/testing';
import { ComptesBancairesService } from './comptes-bancaires.service';

describe('ComptesBancairesService', () => {
  let service: ComptesBancairesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComptesBancairesService],
    }).compile();

    service = module.get<ComptesBancairesService>(ComptesBancairesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
