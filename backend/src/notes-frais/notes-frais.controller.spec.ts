import { Test, TestingModule } from '@nestjs/testing';
import { NotesFraisController } from './notes-frais.controller';

describe('NotesFraisController', () => {
  let controller: NotesFraisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesFraisController],
    }).compile();

    controller = module.get<NotesFraisController>(NotesFraisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
