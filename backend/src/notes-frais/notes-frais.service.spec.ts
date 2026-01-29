import { Test, TestingModule } from '@nestjs/testing';
import { NotesFraisService } from './notes-frais.service';

describe('NotesFraisService', () => {
  let service: NotesFraisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotesFraisService],
    }).compile();

    service = module.get<NotesFraisService>(NotesFraisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
