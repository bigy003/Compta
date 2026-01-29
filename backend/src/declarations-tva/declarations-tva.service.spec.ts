import { Test, TestingModule } from '@nestjs/testing';
import { DeclarationsTvaService } from './declarations-tva.service';

describe('DeclarationsTvaService', () => {
  let service: DeclarationsTvaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeclarationsTvaService],
    }).compile();

    service = module.get<DeclarationsTvaService>(DeclarationsTvaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
