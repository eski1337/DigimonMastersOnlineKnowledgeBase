/**
 * Scraper Controller — orchestrates import/save/batch operations.
 * Routes → Controller → Services → Repositories
 */
import type { Request, Response } from 'express';
import { createLogger } from '../services/logger';
import { ScraperService } from '../services/scraper.service';
import { ImageService } from '../services/image.service';
import { transformForSave } from '../services/transform.service';
import { DigimonRepository } from '../repositories/digimon.repository';
import { MediaRepository } from '../repositories/media.repository';
import type { BatchProgress } from '../types/scraper.types';
import type { Payload } from 'payload';

const log = createLogger('scraper-controller');

// Global progress tracker for batch imports
let currentProgress: BatchProgress | null = null;

export function createScraperController(payload: Payload) {
  const digimonRepo = new DigimonRepository(payload);
  const mediaRepo = new MediaRepository(payload);
  const scraperService = new ScraperService(mediaRepo);
  const imageService = new ImageService(mediaRepo);

  return {
    /** POST /api/import-digimon */
    async importDigimon(req: Request, res: Response): Promise<void> {
      try {
        const { slug, html: pastedHtml } = req.body;
        if (!slug) {
          res.status(400).json({ error: 'Digimon name or URL is required' });
          return;
        }

        const result = await scraperService.importDigimon(slug, pastedHtml);

        if (!result.success) {
          res.status(404).json({
            error: result.error,
            hint: 'If Cloudflare is blocking, open the wiki page in your browser, press Ctrl+U to view source, copy the HTML, and use the "Paste HTML" mode.',
          });
          return;
        }

        res.json({ success: true, preview: result.preview, validation: result.validation });
      } catch (error: any) {
        log.error({ error: error.message }, 'Import error');
        res.status(500).json({ error: error.message || 'Failed to import from DMO Wiki' });
      }
    },

    /** GET /api/import-digimon/popular */
    async getPopularDigimon(_req: Request, res: Response): Promise<void> {
      try {
        const popularDigimon = [
          'Agumon', 'Greymon', 'MetalGreymon', 'WarGreymon', 'Omegamon',
          'Gabumon', 'Garurumon', 'WereGarurumon', 'MetalGarurumon',
          'Veemon', 'ExVeemon', 'Paildramon', 'Imperialdramon',
          'Guilmon', 'Growlmon', 'WarGrowlmon', 'Gallantmon',
          'Alphamon', 'Alphamon (X-Antibody)', 'Omegamon X',
          'Imperialdramon (Fighter Mode)', 'Imperialdramon (Paladin Mode)',
          'Susanoomon', 'Lucemon (Satan Mode)', 'Beelzemon',
          'ShineGreymon', 'ShineGreymon (Burst Mode)', 'MirageGaogamon',
          'ZeedMillenniummon', 'Moon Millenniumon', 'Apocalymon',
          'Crusadermon', 'Leopardmon', 'Examon', 'Gankoomon',
          'Jesmon', 'Jesmon GX', 'Omegamon (Merciful Mode)',
          'ShineGreymon (Burst Mode)', 'MirageGaogamon (Burst Mode)',
          'Rosemon (Burst Mode)', 'Ravemon (Burst Mode)',
          'Alphamon (X-Antibody)', 'Omegamon X', 'WarGreymon X',
          'MetalGarurumon X', 'Gallantmon X', 'Dukemon X',
        ];
        res.json({ success: true, digimon: [...new Set(popularDigimon)].sort() });
      } catch (error: any) {
        log.error({ error: error.message }, 'Popular list error');
        res.status(500).json({ error: error.message });
      }
    },

    /** POST /api/import-digimon/save */
    async saveDigimon(req: Request, res: Response): Promise<void> {
      let digimonData: any = null;
      try {
        digimonData = req.body;
        if (!digimonData?.name) {
          res.status(400).json({ error: 'Invalid Digimon data: missing name' });
          return;
        }
        if (!digimonData.slug) {
          res.status(400).json({ error: 'Invalid Digimon data: missing slug' });
          return;
        }

        // Check if already exists
        const existing = await digimonRepo.findBySlug(digimonData.slug);
        const isUpdate = !!existing;
        const existingId = existing ? String(existing.id) : null;

        log.info({ name: digimonData.name, isUpdate }, isUpdate ? 'Updating existing Digimon' : 'Creating new Digimon');

        // Transform for Payload CMS
        digimonData = transformForSave(digimonData);

        let result;
        if (isUpdate && existingId) {
          result = await digimonRepo.update(existingId, digimonData);
        } else {
          result = await digimonRepo.create(digimonData);
        }

        log.info({ name: (result as any).name, id: result.id }, 'Digimon saved successfully');
        res.json({ success: true, digimon: result, isUpdate });
      } catch (error: any) {
        log.error({ error: error.message, name: digimonData?.name }, 'Save error');
        res.status(500).json({
          error: error.message || 'Failed to save Digimon',
          details: error.data || null,
        });
      }
    },

    /** GET /api/batch-import-progress */
    getBatchProgress(_req: Request, res: Response): void {
      res.json(currentProgress || { status: 'idle' });
    },

    /** POST /api/batch-import-digimon */
    async batchImportDigimon(req: Request, res: Response): Promise<void> {
      try {
        const { letters, names } = req.body;
        const DMOWIKI_API = 'https://dmowiki.com/api.php';
        const DELAY_BETWEEN_IMPORTS = 3000;

        let digimonList: string[] = [];

        if (names && Array.isArray(names)) {
          log.info({ count: names.length }, 'Retrying failed Digimon');
          digimonList = names;
          currentProgress = {
            status: 'retrying', message: `Retrying ${names.length} failed Digimon...`,
            current: null, totalFound: names.length, imported: 0, skipped: 0, failed: 0,
          };
        } else if (letters && Array.isArray(letters)) {
          log.info({ letters }, 'Starting batch import');
          currentProgress = {
            status: 'fetching', message: 'Fetching Digimon list from DMO Wiki...',
            current: null, totalFound: 0, imported: 0, skipped: 0, failed: 0,
          };

          const allDigimon: string[] = [];
          for (const letter of letters) {
            let continueToken: string | undefined;
            do {
              const params = new URLSearchParams({
                action: 'query', list: 'categorymembers', cmtitle: 'Category:Digimon',
                cmstartsortkeyprefix: letter, cmendsortkeyprefix: letter + 'Z',
                cmlimit: '500', cmtype: 'page', format: 'json',
              });
              if (continueToken) params.append('cmcontinue', continueToken);
              const response = await fetch(`${DMOWIKI_API}?${params.toString()}`);
              const data: any = await response.json();
              if (data.query?.categorymembers) {
                data.query.categorymembers.forEach((m: any) => {
                  if (!m.title.includes(':') && m.title.startsWith(letter)) allDigimon.push(m.title);
                });
              }
              continueToken = data.continue?.cmcontinue;
              await new Promise((r) => setTimeout(r, 1000));
            } while (continueToken);
          }

          digimonList = [...new Set(allDigimon)];
          currentProgress.totalFound = digimonList.length;
          currentProgress.message = `Found ${digimonList.length} Digimon`;
        } else {
          res.status(400).json({ error: 'Either letters or names parameter required' });
          return;
        }

        if (digimonList.length === 0) {
          currentProgress = null;
          res.json({ totalFound: 0, imported: 0, skipped: 0, failed: 0, importedList: [], failedList: [] });
          return;
        }

        // Filter existing
        currentProgress!.status = 'checking';
        currentProgress!.message = 'Checking which Digimon already exist...';

        const toImport: string[] = [];
        let skipped = 0;
        const isRetryMode = !!names && Array.isArray(names);

        if (isRetryMode) {
          toImport.push(...digimonList);
        } else {
          for (const name of digimonList) {
            const existing = await digimonRepo.findByName(name);
            existing ? skipped++ : toImport.push(name);
          }
        }

        currentProgress!.skipped = skipped;
        currentProgress!.message = `Need to import: ${toImport.length}, Already exist: ${skipped}`;

        // Import each
        const importedList: string[] = [];
        const failedList: { name: string; error: string }[] = [];
        currentProgress!.status = 'importing';
        currentProgress!.total = toImport.length;
        currentProgress!.current = 0;

        const selfUrl = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

        for (let i = 0; i < toImport.length; i++) {
          const name = toImport[i];
          currentProgress!.current = i + 1;
          currentProgress!.currentDigimon = name;
          currentProgress!.message = `Importing ${i + 1}/${toImport.length}: ${name}`;

          try {
            const slug = name.replace(/\s+/g, '_');
            const importResp = await fetch(`${selfUrl}/api/import-digimon`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug }),
            });

            if (!importResp.ok) {
              const errorText = await importResp.text();
              throw new Error(`HTTP ${importResp.status}: ${errorText.substring(0, 100)}`);
            }

            const importResult = await importResp.json();
            if (importResult.error) throw new Error(importResult.error);
            if (!importResult.success || !importResult.preview) throw new Error('Invalid data structure');

            const saveResp = await fetch(`${selfUrl}/api/import-digimon/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(importResult.preview),
            });

            if (!saveResp.ok) {
              const errorText = await saveResp.text();
              throw new Error(`Save HTTP ${saveResp.status}: ${errorText.substring(0, 100)}`);
            }

            const saveResult = await saveResp.json();
            if (saveResult.success) {
              importedList.push(name);
              currentProgress!.imported = (currentProgress!.imported || 0) + 1;
            } else {
              failedList.push({ name, error: saveResult.error || 'Unknown save error' });
              currentProgress!.failed = (currentProgress!.failed || 0) + 1;
            }
          } catch (error: any) {
            failedList.push({ name, error: error.message || String(error) });
            currentProgress!.failed = (currentProgress!.failed || 0) + 1;
          }

          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_IMPORTS));
        }

        log.info({ imported: importedList.length, failed: failedList.length, skipped }, 'Batch import complete');
        currentProgress = null;

        res.json({
          totalFound: digimonList.length,
          imported: importedList.length,
          skipped,
          failed: failedList.length,
          importedList,
          failedList,
        });
      } catch (error: any) {
        log.error({ error: error.message }, 'Batch import error');
        currentProgress = null;
        res.status(500).json({ error: error.message || 'Batch import failed' });
      }
    },

    /** POST /api/batch-fix */
    async batchFix(req: Request, res: Response): Promise<void> {
      try {
        const fixes: any[] = [];
        const errors: any[] = [];

        const allDigimon = await digimonRepo.findAllPaginated(1);
        log.info({ count: allDigimon.length }, 'Processing batch fix');

        const byName: Record<string, any> = {};
        for (const d of allDigimon) byName[d.name] = d;

        const knownStages: Record<string, string> = {
          'Calumon': 'Rookie', 'Ogudomon': 'Mega', 'MedievalGallantmon': 'Mega',
          'MagnaGarurumon': 'Mega', 'KaiserGreymon': 'Mega', 'Wolfmon': 'Hybrid',
          'Garmmon': 'Hybrid', 'Löwemon': 'Hybrid', 'JägerLöwemon': 'Hybrid',
          'Agnimon': 'Hybrid', 'Mercuremon': 'Hybrid', 'Ranamon': 'Hybrid',
          'Grumblemon': 'Hybrid', 'Arbormon': 'Hybrid', 'Kumamon': 'Hybrid',
          'Kazemon': 'Hybrid', 'Korikakumon': 'Hybrid', 'BurningGreymon': 'Hybrid',
          'Dracomon': 'Rookie', 'Hagurumon': 'Rookie', 'Keramon': 'Rookie',
          'Wormmon': 'Rookie', 'Shoutmon': 'Rookie', 'DemiDevimon': 'Rookie',
          'Calumon (NPC)': 'Rookie',
        };

        const stageOrder = ['Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega'];

        for (const d of allDigimon) {
          let newForm: string | null = null;

          // X-Antibody: inherit from base
          if (d.name.endsWith(' X') && d.form === 'Rookie') {
            const base = byName[d.name.replace(/ X$/, '')];
            if (base?.form && base.form !== 'Rookie') {
              newForm = base.form;
            } else if (d.digivolutions?.digivolvesFrom?.length > 0) {
              const fromDigimon = byName[d.digivolutions.digivolvesFrom[0].name];
              if (fromDigimon) {
                const idx = stageOrder.indexOf(fromDigimon.form);
                if (idx >= 0 && idx < stageOrder.length - 1) newForm = stageOrder[idx + 1];
              }
            }
          }

          // Known overrides
          if (d.form === 'Rookie' && knownStages[d.name] && knownStages[d.name] !== d.form) {
            newForm = knownStages[d.name];
          }

          // Infer from digivolvesFrom
          if (!newForm && d.form === 'Rookie' && !d.name.endsWith(' X') && !knownStages[d.name]) {
            if (d.digivolutions?.digivolvesFrom?.length > 0) {
              const fromDigimon = byName[d.digivolutions.digivolvesFrom[0].name];
              if (fromDigimon?.form) {
                const idx = stageOrder.indexOf(fromDigimon.form);
                if (idx >= 0 && idx < stageOrder.length - 1 && stageOrder[idx + 1] !== 'Rookie') {
                  newForm = stageOrder[idx + 1];
                }
              }
            }
          }

          if (newForm && newForm !== d.form) {
            try {
              await digimonRepo.update(d.id, { form: newForm });
              fixes.push({ name: d.name, field: 'form', from: d.form, to: newForm });
            } catch (err: any) {
              errors.push({ name: d.name, field: 'form', error: err.message });
            }
          }
        }

        // Fix missing images
        const wikiNameMap: Record<string, string> = {
          'JägerLöwemon': 'JagerLoweemon', 'SunFlowmon': 'Sunflowmon',
          'GinRyumon': 'Ginryumon', 'FanBeemon': 'Fanbeemon', 'Löwemon': 'Lowemon',
        };

        const missingImages = allDigimon.filter((d: any) => !d.icon?.url || !d.mainImage?.url);
        for (const d of missingImages) {
          const hasIcon = d.icon && (typeof d.icon === 'object' ? d.icon.url : true);
          const hasMainImage = d.mainImage && (typeof d.mainImage === 'object' ? d.mainImage.url : true);
          const wikiName = wikiNameMap[d.name] || d.name.replace(/[äÄ]/g, 'a').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u');

          if (!hasIcon) {
            const url = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(wikiName)}_Icon.png`;
            try {
              const id = await imageService.downloadAndUpload(url, `${d.name} Icon`, { imageType: 'digimon-icon', belongsTo: { digimon: d.name }, tags: ['digimon-icon'] });
              if (id) {
                await digimonRepo.update(d.id, { icon: id });
                fixes.push({ name: d.name, field: 'icon', status: 'downloaded' });
              } else {
                errors.push({ name: d.name, field: 'icon', error: 'download returned null' });
              }
            } catch (err: any) {
              errors.push({ name: d.name, field: 'icon', error: err.message });
            }
          }

          if (!hasMainImage) {
            const url = `https://dmowiki.com/Special:Redirect/file/${encodeURIComponent(wikiName)}.png`;
            try {
              const id = await imageService.downloadAndUpload(url, d.name, { imageType: 'digimon-main', belongsTo: { digimon: d.name }, tags: ['digimon-main'] });
              if (id) {
                await digimonRepo.update(d.id, { mainImage: id });
                fixes.push({ name: d.name, field: 'mainImage', status: 'downloaded' });
              } else {
                errors.push({ name: d.name, field: 'mainImage', error: 'download returned null' });
              }
            } catch (err: any) {
              errors.push({ name: d.name, field: 'mainImage', error: err.message });
            }
          }
        }

        res.json({
          success: true,
          totalProcessed: allDigimon.length,
          fixes: fixes.length,
          errors: errors.length,
          fixDetails: fixes,
          errorDetails: errors,
        });
      } catch (error: any) {
        log.error({ error: error.message }, 'Batch fix error');
        res.status(500).json({ error: error.message });
      }
    },
  };
}
