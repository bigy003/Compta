import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('societes/:societeId/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('unites')
  getUnites() {
    return this.stockService.getUnites();
  }

  // Produits
  @Post('produits')
  createProduit(
    @Param('societeId') societeId: string,
    @Body()
    body: {
      reference: string;
      designation: string;
      unite?: string;
      quantiteEnStock?: number;
      seuilAlerte?: number;
    },
  ) {
    return this.stockService.createProduit(societeId, body);
  }

  @Get('produits')
  findAllProduits(@Param('societeId') societeId: string) {
    return this.stockService.findAllProduits(societeId);
  }

  @Get('produits/alerte')
  getProduitsEnAlerte(@Param('societeId') societeId: string) {
    return this.stockService.getProduitsEnAlerte(societeId);
  }

  @Get('produits/:id')
  findOneProduit(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.stockService.findOneProduit(societeId, id);
  }

  @Patch('produits/:id')
  updateProduit(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      reference: string;
      designation: string;
      unite: string;
      seuilAlerte: number | null;
    }>,
  ) {
    return this.stockService.updateProduit(societeId, id, body);
  }

  @Delete('produits/:id')
  deleteProduit(
    @Param('societeId') societeId: string,
    @Param('id') id: string,
  ) {
    return this.stockService.deleteProduit(societeId, id);
  }

  // Mouvements
  @Post('mouvements')
  createMouvement(
    @Param('societeId') societeId: string,
    @Body()
    body: {
      produitId: string;
      type: 'ENTREE' | 'SORTIE';
      quantite: number;
      date: string;
      libelle?: string;
    },
  ) {
    return this.stockService.createMouvement(societeId, body);
  }

  @Get('mouvements')
  listMouvements(
    @Param('societeId') societeId: string,
    @Query('produitId') produitId?: string,
  ) {
    return this.stockService.listMouvements(societeId, produitId);
  }

  // Inventaires
  @Post('inventaires')
  createInventaire(
    @Param('societeId') societeId: string,
    @Body() body: { dateInventaire: string; commentaire?: string },
  ) {
    return this.stockService.createInventaire(societeId, body);
  }

  @Get('inventaires')
  findAllInventaires(@Param('societeId') societeId: string) {
    return this.stockService.findAllInventaires(societeId);
  }

  @Get('inventaires/:inventaireId')
  findOneInventaire(
    @Param('societeId') societeId: string,
    @Param('inventaireId') inventaireId: string,
  ) {
    return this.stockService.findOneInventaire(societeId, inventaireId);
  }

  @Post('inventaires/:inventaireId/lignes')
  ajouterLigneInventaire(
    @Param('societeId') societeId: string,
    @Param('inventaireId') inventaireId: string,
    @Body() body: { produitId: string; quantiteComptee: number },
  ) {
    return this.stockService.ajouterLigneInventaire(
      societeId,
      inventaireId,
      body,
    );
  }

  @Post('inventaires/:inventaireId/cloturer')
  cloturerInventaire(
    @Param('societeId') societeId: string,
    @Param('inventaireId') inventaireId: string,
  ) {
    return this.stockService.cloturerInventaire(societeId, inventaireId);
  }
}
