import { Test, TestingModule } from '@nestjs/testing';
import { DeclarationsTvaController } from './declarations-tva.controller';

describe('DeclarationsTvaController', () => {
  let controller: DeclarationsTvaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeclarationsTvaController],
    }).compile();

    controller = module.get<DeclarationsTvaController>(DeclarationsTvaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
