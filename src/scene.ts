import Phaser from 'phaser';
import { GameEngine } from './engine';
import { ENEMIES } from './content';
import type { EnemyState, Interaction, SkillId, TileType } from './types';

const TILE = 32;
const VISION = 11;
const STEP = 0.1;
const SKILL_KEYS: SkillId[] = ['strike', 'fireball', 'heal', 'dash', 'frost', 'ward'];
const PALETTE: Record<TileType, [string, string]> = {
  grass: ['#526a46', '#899b65'], forest: ['#344a38', '#65784d'], path: ['#8b7655', '#c2aa7b'],
  water: ['#284d59', '#527b82'], rock: ['#656765', '#99988b'], marsh: ['#454f3a', '#737955'],
  floor: ['#60645a', '#92917e'], wall: ['#4b514b', '#979989'], sand: ['#b09a70', '#d0bc8e'],
};

type ActorVisual = { root: Phaser.GameObjects.Container; image: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; previousX: number; previousY: number; walk: number };
type PropVisual = { object: Phaser.GameObjects.GameObject & { setAlpha: (a: number) => unknown; setVisible: (v: boolean) => unknown; destroy: () => void }; x: number; y: number };

function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function polygon(ctx: CanvasRenderingContext2D, pts: number[][], color: string, stroke?: string): void {
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function segment(ctx: CanvasRenderingContext2D, a: number[], b: number[], color: string, width = 1): void {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}
function editable(): boolean {
  const active = document.activeElement as HTMLElement | null;
  return !!active?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"][aria-modal="true"],dialog[open]') ||
    !!document.querySelector('[role="dialog"][aria-modal="true"]:not([hidden]):not(.hidden),dialog[open],.dialog-backdrop:not([hidden])');
}

/** The renderer consumes the simulation; its visual random generator never changes game RNG. */
export function createGameScene(engine: GameEngine, onInteract: (event: Interaction) => void, onChange: () => void): typeof Phaser.Scene {
  return class WorldScene extends Phaser.Scene {
    private keys = new Set<string>();
    private accumulator = 0;
    private uiElapsed = 0;
    private mapElapsed = 1;
    private phase = 0;
    private playerVisual!: ActorVisual;
    private enemies = new Map<string, ActorVisual>();
    private tiles = new Map<number, Phaser.GameObjects.Image>();
    private props = new Map<string, PropVisual>();
    private texturesOwned: string[] = [];
    private knownEvents = new Set<number>();
    private exploredTiles = new Set<number>();
    private exploredCount = 0;
    private path: Array<{ x: number; y: number }> = [];
    private chase: string | null = null;
    private hoverId: string | null = null;
    private combatOverlay!: Phaser.GameObjects.Graphics;
    private atmosphere!: Phaser.GameObjects.Graphics;
    private fog!: Phaser.GameObjects.Image;
    private hoverText!: Phaser.GameObjects.Text;
    private destination!: Phaser.GameObjects.Graphics;
    private dayLight = -1;
    private listenerCleanup: Array<() => void> = [];

    constructor() { super({ key: 'world' }); }

    create(): void {
      this.cameras.main.setBackgroundColor('#111d1d');
      this.cameras.main.setBounds(-512, -256, engine.world.width * TILE + 1024, engine.world.height * TILE + 512);
      this.makeTextures();
      this.fog = this.add.image(-512, -256, 'tf-fog').setOrigin(0).setDisplaySize(engine.world.width * TILE + 1024, engine.world.height * TILE + 512).setDepth(-100);
      this.playerVisual = this.actor('hero1', engine.state.player.x * TILE, engine.state.player.y * TILE);
      this.cameras.main.startFollow(this.playerVisual.root, true, 0.1, 0.1);
      this.cameras.main.setZoom(1.35);
      this.cameras.main.centerOn(engine.state.player.x * TILE, engine.state.player.y * TILE);
      this.cameras.main.preRender();
      this.destination = this.add.graphics().setDepth(1);
      this.combatOverlay = this.add.graphics().setDepth(9000);
      this.atmosphere = this.add.graphics().setScrollFactor(0).setDepth(20000);
      this.hoverText = this.add.text(0, 0, '', {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#fff1cf', backgroundColor: '#17201eed',
        padding: { x: 9, y: 6 }, stroke: '#101812', strokeThickness: 2,
      }).setDepth(25000).setScrollFactor(0).setVisible(false);
      this.bindInput();
      this.syncTerrain();
      this.syncActors(0);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clean());
    }

    private texture(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
      const name = 'tf-' + key;
      if (this.textures.exists(name)) return;
      const texture = this.textures.createCanvas(name, width, height);
      if (!texture) return;
      draw(texture.context); texture.refresh(); this.texturesOwned.push(name);
    }

    private makeTextures(): void {
      this.texture('fog', 512, 512, ctx => {
        ctx.fillStyle = '#152420'; ctx.fillRect(0, 0, 512, 512);
        const rand = seeded(41732);
        for (let i = 0; i < 45; i++) {
          const x = rand() * 512, y = rand() * 512, radius = 30 + rand() * 120;
          const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
          gradient.addColorStop(0, i % 2 ? '#3e554b25' : '#16282840'); gradient.addColorStop(1, '#14211e00');
          ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        for (let i = 0; i < 350; i++) ellipse(ctx, rand() * 512, rand() * 512, 0.7, 0.5, '#a2b29a0a');
      });
      for (const tile of Object.keys(PALETTE) as TileType[]) for (let variant = 0; variant < 5; variant++) {
        this.texture(tile + variant, TILE, TILE, ctx => {
          const rand = seeded(7919 + variant * 103 + Object.keys(PALETTE).indexOf(tile) * 919);
          const [base, detail] = PALETTE[tile];
          ctx.fillStyle = base; ctx.fillRect(0, 0, TILE, TILE);
          for (let i = 0; i < 45; i++) {
            const x = rand() * TILE, y = rand() * TILE;
            ctx.globalAlpha = 0.1 + rand() * 0.13;
            ellipse(ctx, x, y, 1 + rand() * 3, 0.4 + rand(), rand() > 0.4 ? detail : '#101a13');
          }
          ctx.globalAlpha = 1;
          if (tile === 'grass' || tile === 'forest' || tile === 'marsh') {
            for (let i = 0; i < 9; i++) {
              const x = rand() * TILE, y = rand() * TILE;
              segment(ctx, [x, y], [x - 1, y - 3], detail, 0.8);
              segment(ctx, [x, y], [x + 2, y - 2], '#708557', 0.7);
            }
            if (variant === 2 && tile === 'grass') for (let i = 0; i < 3; i++) ellipse(ctx, 7 + i * 7, 10 + rand() * 15, 1.2, 1, '#d9bd86');
          }
          if (tile === 'water') {
            for (let i = 0; i < 5; i++) { const x = rand() * 27, y = rand() * 32; segment(ctx, [x, y], [x + 4 + rand() * 5, y - 1], '#709697', 0.6); }
          }
          if (tile === 'floor' || tile === 'wall') {
            segment(ctx, [0, 16], [32, 16], '#363d38');
            segment(ctx, [variant % 2 ? 10 : 22, 0], [variant % 2 ? 10 : 22, 16], '#383e37');
            segment(ctx, [variant % 2 ? 22 : 10, 16], [variant % 2 ? 22 : 10, 32], '#383e37');
            segment(ctx, [0, 1], [32, 1], '#a2a08c', 0.7);
          }
          if (tile === 'path' || tile === 'sand' || tile === 'rock') for (let i = 0; i < 5; i++) {
            const x = rand() * 30, y = rand() * 30; ellipse(ctx, x, y, 1.8, 1, '#b0a184');
          }
        });
      }
      for (let variant = 0; variant < 3; variant++) {
        this.texture('tree' + variant, 88, 112, ctx => this.drawTree(ctx, variant));
        this.texture('pine' + variant, 68, 112, ctx => this.drawPine(ctx, variant));
        this.texture('boulder' + variant, 52, 42, ctx => this.drawBoulder(ctx, variant));
      }
      for (let frame = 0; frame < 3; frame++) this.texture('hero' + frame, 36, 50, ctx => this.drawHuman(ctx, '#637c6d', '#bcaa76', frame, true));
      this.texture('npc', 34, 47, ctx => this.drawHuman(ctx, '#b09768', '#d5b18b', 1, false));
      this.texture('bandit', 38, 50, ctx => this.drawHuman(ctx, '#724c43', '#a99c7a', 1, false));
      this.texture('skeleton', 34, 48, ctx => this.drawSkeleton(ctx));
      this.texture('wolf', 52, 38, ctx => this.drawWolf(ctx));
      this.texture('spider', 48, 39, ctx => this.drawSpider(ctx));
      this.texture('golem', 56, 63, ctx => this.drawGolem(ctx, false));
      this.texture('boss', 74, 89, ctx => this.drawGolem(ctx, true));
      this.texture('herb', 28, 26, ctx => {
        ellipse(ctx, 14, 23, 10, 3, '#16271c60');
        for (let i = 0; i < 7; i++) { const x = 5 + i * 3; segment(ctx, [14, 23], [x, 7 + i % 3 * 4], '#799467', 2); ellipse(ctx, x, 8 + i % 3 * 4, 3, 2, i % 2 ? '#9baa71' : '#627d54'); }
        ellipse(ctx, 14, 7, 2, 2, '#dccb80');
      });
      this.texture('ore', 36, 31, ctx => { this.drawBoulder(ctx, 0, 0.65); polygon(ctx, [[10, 15], [13, 4], [19, 8], [18, 18]], '#9fafaa', '#d1d5b3'); polygon(ctx, [[21, 20], [24, 10], [29, 13], [27, 23]], '#8ba1a3', '#b5c8be'); });
      this.texture('chest', 36, 32, ctx => {
        ellipse(ctx, 18, 29, 15, 3, '#111b1670'); polygon(ctx, [[4, 14], [29, 14], [32, 27], [6, 29]], '#65482e', '#b99756');
        polygon(ctx, [[4, 14], [8, 5], [28, 5], [31, 14]], '#9b723e', '#d1b470');
        segment(ctx, [12, 6], [12, 28], '#ccae68', 3); segment(ctx, [25, 6], [25, 27], '#ccae68', 3);
        ctx.fillStyle = '#d4bf78'; ctx.fillRect(17, 14, 5, 6); ctx.fillStyle = '#3e321e'; ctx.fillRect(19, 17, 1, 3);
      });
      this.texture('flowers', 28, 24, ctx => {
        ellipse(ctx, 14, 21, 11, 3, '#263d2660');
        for (let i = 0; i < 9; i++) {
          const x = 4 + i * 2.5, y = 6 + (i * 7) % 11;
          segment(ctx, [x, 20], [x, y], '#6c8851', 1);
          ellipse(ctx, x, y, 2.1, 1.6, i % 3 === 0 ? '#cfbe81' : i % 3 === 1 ? '#a4879e' : '#d2c8a1');
        }
      });
      this.texture('planter', 29, 32, ctx => {
        polygon(ctx, [[6, 19], [23, 19], [20, 30], [9, 30]], '#9a7755', '#bca477');
        segment(ctx, [5, 19], [24, 19], '#d2b28a', 3);
        for (let i = 0; i < 7; i++) { const x = 5 + i * 3; segment(ctx, [14, 19], [x, 8 + i % 3 * 3], '#789159', 2); ellipse(ctx, x, 9 + i % 3 * 3, 2.5, 2, i % 2 ? '#c5b67d' : '#a383a0'); }
      });
      this.texture('banner', 26, 57, ctx => {
        segment(ctx, [8, 55], [8, 3], '#b1a481', 2);
        polygon(ctx, [[10, 5], [23, 7], [24, 29], [18, 26], [11, 31]], '#587d70', '#97b6a1');
        segment(ctx, [17, 11], [17, 22], '#dccca0', 1.5); segment(ctx, [13, 16], [21, 16], '#dccca0', 1.5);
        ellipse(ctx, 8, 3, 2, 2, '#d7c599');
      });
      this.texture('house', 150, 132, ctx => this.drawHouse(ctx));
      this.texture('ruin', 62, 78, ctx => {
        ellipse(ctx, 29, 69, 26, 7, '#111d1570'); polygon(ctx, [[15, 67], [15, 13], [22, 8], [28, 13], [28, 67]], '#8a8d75', '#b7b59a');
        polygon(ctx, [[40, 68], [40, 28], [49, 18], [54, 27], [54, 68]], '#727d68', '#a1a98a');
        polygon(ctx, [[8, 14], [10, 6], [32, 3], [37, 12], [31, 18]], '#9b9d81', '#b5b39a');
        for (let i = 0; i < 7; i++) { const y = 22 + i * 6; segment(ctx, [16, y], [27, y], '#5b6454'); }
        polygon(ctx, [[1, 71], [11, 60], [24, 66], [29, 76]], '#737760'); ellipse(ctx, 17, 58, 8, 3, '#637551');
      });
      this.texture('shrine', 66, 76, ctx => {
        ellipse(ctx, 33, 70, 30, 5, '#111c1766'); polygon(ctx, [[10, 65], [56, 65], [49, 53], [16, 53]], '#808675', '#b7b698');
        polygon(ctx, [[23, 54], [26, 22], [39, 22], [43, 54]], '#818d7b', '#b1b9a1');
        polygon(ctx, [[33, 7], [45, 22], [33, 38], [21, 22]], '#79a994', '#c3dac0');
        segment(ctx, [33, 15], [33, 31], '#e0efd0', 2); segment(ctx, [26, 23], [40, 23], '#e0efd0', 2);
      });
      this.texture('camp', 42, 40, ctx => {
        ellipse(ctx, 21, 34, 18, 5, '#1c241868');
        segment(ctx, [10, 31], [32, 36], '#58432e', 5); segment(ctx, [11, 36], [31, 29], '#947145', 4);
        for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; ellipse(ctx, 21 + Math.cos(angle) * 16, 32 + Math.sin(angle) * 6, 3, 2, '#939080'); }
        polygon(ctx, [[12, 31], [15, 15], [20, 21], [22, 5], [30, 25], [27, 33]], '#dd7d36');
        polygon(ctx, [[17, 31], [21, 18], [24, 27], [27, 20], [27, 32]], '#f4c974');
      });
      this.texture('bridge', 68, 104, ctx => {
        polygon(ctx, [[10, 6], [58, 6], [61, 98], [7, 98]], '#8e7855', '#d1b78b');
        for (let i = 0; i < 12; i++) segment(ctx, [9, 10 + i * 7], [59, 10 + i * 7], '#514937', 2);
        segment(ctx, [4, 6], [4, 102], '#bc9c66', 4); segment(ctx, [64, 6], [64, 102], '#bc9c66', 4);
      });
      this.texture('spark', 12, 12, ctx => { const glow = ctx.createRadialGradient(6, 6, 0, 6, 6, 6); glow.addColorStop(0, '#ffebad'); glow.addColorStop(0.25, '#e8b064cc'); glow.addColorStop(1, '#e8b06400'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 12, 12); });
    }

    private drawTree(ctx: CanvasRenderingContext2D, variant: number): void {
      const rand = seeded(400 + variant), x = 43;
      ellipse(ctx, 47, 102, 31, 8, '#0f201365');
      polygon(ctx, [[x - 7, 105], [x - 3, 62], [x + 5, 56], [x + 8, 105]], '#6e593d', '#a08753');
      segment(ctx, [x, 87], [x - 21, 53], '#756041', 4); segment(ctx, [x + 1, 73], [x + 24, 45], '#756041', 4);
      const shades = variant === 2 ? ['#75804a', '#949650', '#adb06b', '#4d613d'] : ['#36553d', '#466748', '#5d7e50', '#809362'];
      for (let i = 0; i < 29; i++) { const xx = 16 + rand() * 56, yy = 17 + rand() * 50; ellipse(ctx, xx, yy, 11 + rand() * 8, 9 + rand() * 6, shades[i % 4]); }
      for (let i = 0; i < 30; i++) ellipse(ctx, 15 + rand() * 59, 13 + rand() * 53, 2 + rand() * 2, 1.3, '#a6b07965');
      segment(ctx, [40, 97], [40, 79], '#c0a875', 1); ellipse(ctx, 42, 103, 10, 3, '#6b794b');
    }
    private drawPine(ctx: CanvasRenderingContext2D, variant: number): void {
      ellipse(ctx, 36, 106, 28, 5, '#101e1760'); ctx.fillStyle = '#6a5841'; ctx.fillRect(30, 78, 7, 30);
      const colors = ['#294d41', '#355b48', '#416750', '#55795d'];
      for (let i = 0; i < 5; i++) { const y = 10 + i * 13, width = 11 + i * 4; polygon(ctx, [[34, y], [34 - width, y + 28], [31, y + 23], [34 + width, y + 26]], colors[(i + variant) % 4]); segment(ctx, [34, y + 5], [34 + width - 3, y + 24], '#8c9d6e55', 1); }
    }
    private drawBoulder(ctx: CanvasRenderingContext2D, variant: number, scale = 1): void {
      ctx.save(); ctx.scale(scale, scale); ellipse(ctx, 26, 36, 24, 5, '#17231b60');
      polygon(ctx, [[3, 29], [11, 11], [30, 5 + variant * 2], [45, 14], [49, 31], [31, 39], [10, 36]], '#6d776b', '#9caa8d');
      polygon(ctx, [[11, 11], [30, 5 + variant * 2], [45, 14], [31, 22]], '#939b85');
      polygon(ctx, [[31, 22], [45, 14], [49, 31], [31, 39]], '#525f55');
      segment(ctx, [16, 14], [12, 27], '#c1c4a3', 1); ellipse(ctx, 12, 32, 8, 3, '#72834c'); ctx.restore();
    }
    private drawHuman(ctx: CanvasRenderingContext2D, cloak: string, skin: string, frame: number, hero: boolean): void {
      const swing = frame - 1;
      segment(ctx, [14, 35], [13 - swing, 47], '#2d2a27', 6); segment(ctx, [23, 35], [24 + swing, 46], '#35312a', 5);
      polygon(ctx, [[11, 17], [23, 17], [29, 39], [23, 44], [8, 40]], cloak, '#253b35');
      polygon(ctx, [[11, 19], [17, 25], [14, 39], [8, 40]], '#344a43');
      segment(ctx, [22, 21], [30, 34 - swing], skin, 5); segment(ctx, [11, 22], [7, 32 + swing], skin, 4);
      ellipse(ctx, 17, 12, 7, 8, skin); polygon(ctx, [[9, 14], [10, 4], [18, 2], [24, 8], [21, 11], [14, 9]], hero ? '#4c5141' : '#5d4036');
      segment(ctx, [17, 13], [21, 13], '#332d26'); ctx.fillStyle = '#af9157'; ctx.fillRect(10, 27, 15, 3);
      if (hero) { segment(ctx, [30, 32], [33, 14], '#d2d6c2', 2); segment(ctx, [27, 31], [34, 32], '#c6aa6c', 2); ellipse(ctx, 14, 23, 2, 2, '#dec99c'); }
    }
    private drawWolf(ctx: CanvasRenderingContext2D): void {
      ellipse(ctx, 24, 24, 18, 10, '#6a7470'); polygon(ctx, [[7, 22], [0, 14], [4, 26], [12, 29]], '#77827a');
      polygon(ctx, [[34, 11], [46, 8], [50, 17], [45, 23], [34, 22]], '#92978b');
      polygon(ctx, [[36, 12], [35, 2], [41, 8]], '#9ca08e'); polygon(ctx, [[43, 10], [46, 1], [48, 11]], '#657267');
      for (const x of [10, 20, 32, 39]) segment(ctx, [x, 25], [x + 2, 36], '#505f5c', 4);
      ellipse(ctx, 45, 13, 1.4, 1.1, '#e3c371'); ellipse(ctx, 49, 18, 2, 1.5, '#26312d');
    }
    private drawSpider(ctx: CanvasRenderingContext2D): void {
      for (let i = 0; i < 4; i++) {
        const y = 13 + i * 5;
        segment(ctx, [18, 20], [8 - i, y - 4], '#725b45', 2); segment(ctx, [8 - i, y - 4], [2 + i, y + 9], '#463f32', 2);
        segment(ctx, [29, 20], [40 + i, y - 4], '#725b45', 2); segment(ctx, [40 + i, y - 4], [46 - i, y + 9], '#463f32', 2);
      }
      ellipse(ctx, 24, 15, 11, 10, '#554f3a'); ellipse(ctx, 24, 26, 8, 7, '#706847');
      ellipse(ctx, 21, 25, 1.5, 1.5, '#e5b578'); ellipse(ctx, 27, 25, 1.5, 1.5, '#e5b578');
      polygon(ctx, [[20, 31], [20, 37], [23, 32]], '#c8b795'); polygon(ctx, [[28, 31], [28, 37], [25, 32]], '#c8b795');
    }
    private drawSkeleton(ctx: CanvasRenderingContext2D): void {
      const bone = '#cdc9a8'; ellipse(ctx, 16, 10, 7, 8, bone); ellipse(ctx, 13, 10, 2, 2, '#514b3e'); ellipse(ctx, 19, 10, 2, 2, '#514b3e');
      segment(ctx, [16, 18], [16, 34], bone, 3); for (let i = 0; i < 4; i++) segment(ctx, [10, 21 + i * 3], [22, 21 + i * 3], bone, 2);
      segment(ctx, [10, 22], [5, 33], bone, 3); segment(ctx, [22, 22], [29, 32], bone, 3);
      segment(ctx, [13, 34], [10, 46], bone, 3); segment(ctx, [19, 34], [23, 46], bone, 3);
      segment(ctx, [29, 33], [31, 15], '#8f998c', 2); polygon(ctx, [[7, 32], [2, 25], [1, 37], [7, 41]], '#6e6650', '#b4a786');
    }
    private drawGolem(ctx: CanvasRenderingContext2D, boss: boolean): void {
      const x = boss ? 37 : 28, base = boss ? 78 : 57;
      polygon(ctx, [[x - 20, base - 32], [x - 12, base - 47], [x + 13, base - 45], [x + 22, base - 28], [x + 12, base - 7], [x - 13, base - 8]], boss ? '#4e665b' : '#6a7164', '#97a08a');
      polygon(ctx, [[x - 20, base - 32], [x - 29, base - 16], [x - 22, base]], '#697668', '#9ca185');
      polygon(ctx, [[x + 20, base - 32], [x + 30, base - 16], [x + 22, base]], '#566356', '#8e9782');
      segment(ctx, [x - 10, base - 11], [x - 13, base + 5], '#46564d', 10); segment(ctx, [x + 10, base - 11], [x + 13, base + 5], '#536256', 10);
      polygon(ctx, [[x - 12, base - 47], [x - 9, base - 59], [x + 7, base - 60], [x + 14, base - 47], [x + 8, base - 34], [x - 7, base - 36]], boss ? '#b6b499' : '#8e9580', '#c3c6aa');
      ellipse(ctx, x - 5, base - 48, 2.5, 2, boss ? '#efb16e' : '#a6cfb1'); ellipse(ctx, x + 5, base - 48, 2.5, 2, boss ? '#efb16e' : '#a6cfb1');
      if (boss) { polygon(ctx, [[x - 9, base - 58], [x - 20, base - 77], [x - 17, base - 51]], '#adad95'); polygon(ctx, [[x + 8, base - 58], [x + 20, base - 77], [x + 17, base - 51]], '#adad95'); segment(ctx, [x, base - 31], [x, base - 18], '#dba979', 3); }
    }
    private drawHouse(ctx: CanvasRenderingContext2D): void {
      ellipse(ctx, 80, 120, 68, 10, '#14221870'); polygon(ctx, [[24, 64], [117, 65], [120, 114], [24, 117]], '#a59873', '#d8c296');
      polygon(ctx, [[24, 65], [37, 35], [127, 34], [141, 65]], '#9b6344', '#d09263');
      polygon(ctx, [[9, 71], [32, 20], [125, 20], [144, 70]], '#705342', '#aa7c51');
      for (let y = 27; y < 70; y += 7) {
        const inset = (70 - y) * 0.37; segment(ctx, [11 + inset, y], [142 - inset, y], '#b08056', 1);
        for (let x = 22; x < 135; x += 12) segment(ctx, [x + (y % 2) * 3, y], [x - 2 + (y % 2) * 3, y + 6], '#503e34');
      }
      ctx.fillStyle = '#645841'; ctx.fillRect(66, 79, 25, 38); ctx.fillStyle = '#d8bb79'; ctx.fillRect(39, 80, 14, 18); ctx.fillRect(101, 79, 12, 17);
      segment(ctx, [46, 81], [46, 98], '#5d513b', 2); segment(ctx, [39, 89], [53, 89], '#5d513b', 2);
      ctx.fillStyle = '#8c8065'; ctx.fillRect(103, 7, 12, 28); ctx.fillStyle = '#ada081'; ctx.fillRect(102, 5, 14, 5);
      segment(ctx, [26, 72], [26, 115], '#675842', 4); segment(ctx, [118, 72], [119, 113], '#675842', 4);
      ellipse(ctx, 87, 99, 1.5, 1.5, '#d6ba74'); polygon(ctx, [[60, 117], [97, 117], [99, 124], [57, 124]], '#7e8067');
    }

    private actor(texture: string, x: number, y: number): ActorVisual {
      const shadow = this.add.ellipse(0, -2, texture === 'boss' ? 52 : 27, 8, 0x09110d, 0.38);
      const image = this.add.image(0, 2, 'tf-' + texture).setOrigin(0.5, 1);
      const root = this.add.container(x, y, [shadow, image]).setDepth(y + 10);
      return { root, image, shadow, previousX: x, previousY: y, walk: 0 };
    }

    private bindInput(): void {
      const down = (event: KeyboardEvent) => {
        if (editable() || engine.state.status === 'dead') return;
        const code = event.code;
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(code)) {
          event.preventDefault(); this.keys.add(code); this.path = []; this.chase = null; return;
        }
        if (event.repeat) return;
        if (code === 'Space') { event.preventDefault(); engine.dispatch({ type: 'pause', value: !engine.state.paused }); this.path = []; this.keys.clear(); onChange(); }
        else if (code === 'KeyE') { const result = engine.dispatch({ type: 'interact' }); if (result) onInteract(result); onChange(); }
        else if (code === 'KeyF') { engine.dispatch({ type: 'attack' }); onChange(); }
        else if (/^Digit[1-6]$/.test(code)) { engine.dispatch({ type: 'skill', skill: SKILL_KEYS[Number(code.slice(-1)) - 1] }); onChange(); }
      };
      const up = (event: KeyboardEvent) => this.keys.delete(event.code);
      const blur = () => this.keys.clear();
      const visibility = () => { if (document.hidden) { this.keys.clear(); this.path = []; engine.dispatch({ type: 'pause', value: true }); onChange(); } };
      window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
      this.listenerCleanup.push(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); });
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (editable() || pointer.button !== 0 || engine.state.paused || engine.state.status === 'dead') return;
        const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const near = this.enemyAt(point.x, point.y);
        if (near) {
          engine.dispatch({ type: 'target', enemyId: near.id }); this.chase = near.id; this.path = [];
          if (this.distance(near.x, near.y) <= this.attackRange()) engine.dispatch({ type: 'attack', enemyId: near.id });
          else this.path = this.findPath(near.x, near.y);
        } else {
          this.chase = null; engine.dispatch({ type: 'target', enemyId: null });
          this.path = this.findPath(point.x / TILE, point.y / TILE);
          this.destination.clear().lineStyle(1.4, 0xdac996, 0.9).strokeEllipse(point.x, point.y, 17, 10);
          const tx = Math.floor(point.x / TILE), ty = Math.floor(point.y / TILE);
          const npc = engine.world.npcs.find(n => Math.abs(n.x - tx) < 1 && Math.abs(n.y - ty) < 1);
          if (npc && this.distance(npc.x + 0.5, npc.y + 0.5) < 2.1) { const result = engine.dispatch({ type: 'interact', entityId: npc.id }); if (result) onInteract(result); }
        }
        onChange();
      });
      this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        if (editable()) return;
        this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom - Math.sign(dy) * 0.12, 1.05, 2.4)); this.mapElapsed = 1;
      });
    }

    update(_time: number, delta: number): void {
      // Phaser smooths large startup deltas for 120 frames; the fixed-step simulation uses elapsed time.
      const dt = Math.min((this.game.loop.rawDelta || delta) / 1000, 0.2);
      this.phase += dt; this.accumulator += dt; this.uiElapsed += dt; this.mapElapsed += dt;
      while (this.accumulator >= STEP) {
        this.accumulator -= STEP;
        this.playerVisual.previousX = engine.state.player.x * TILE; this.playerVisual.previousY = engine.state.player.y * TILE;
        this.enemies.forEach((actor, id) => { const enemy = engine.state.enemies.find(e => e.id === id); if (enemy) { actor.previousX = enemy.x * TILE; actor.previousY = enemy.y * TILE; } });
        if (!editable() && !engine.state.paused && engine.state.status !== 'dead') this.moveStep();
        engine.tick(STEP);
      }
      this.syncActors(this.accumulator / STEP);
      if (this.mapElapsed > 0.18) { this.mapElapsed = 0; this.syncTerrain(); }
      this.drawCombat(); this.drawAtmosphere(); this.displayEvents(); this.updateHover();
      if (this.uiElapsed >= 0.2) { this.uiElapsed = 0; onChange(); }
    }

    private moveStep(): void {
      const p = engine.state.player;
      let dx = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      let dy = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
      let movementDt = STEP;
      if (!dx && !dy && this.chase) {
        const enemy = engine.state.enemies.find(e => e.id === this.chase && e.alive);
        if (!enemy) { this.chase = null; this.path = []; }
        else if (this.distance(enemy.x, enemy.y) < this.attackRange() - 0.15) { this.path = []; engine.dispatch({ type: 'attack', enemyId: enemy.id }); }
        else if (this.path.length === 0 || this.phase % 1.2 < STEP) this.path = this.findPath(enemy.x, enemy.y);
      }
      if (!dx && !dy && this.path.length) {
        while (this.path.length && Math.hypot(this.path[0].x - p.x, this.path[0].y - p.y) < 0.12) this.path.shift();
        if (!this.path.length) this.destination.clear();
        else {
          const next = this.path[0], dist = Math.hypot(next.x - p.x, next.y - p.y);
          dx = (next.x - p.x) / dist; dy = (next.y - p.y) / dist;
          movementDt = Math.min(STEP, dist / 3.6);
        }
      }
      if (dx || dy) engine.dispatch({ type: 'move', dx, dy, dt: movementDt });
    }

    private findPath(targetX: number, targetY: number): Array<{ x: number; y: number }> {
      const world = engine.world, p = engine.state.player;
      const sx = Math.floor(p.x), sy = Math.floor(p.y), tx = Math.floor(targetX), ty = Math.floor(targetY);
      const valid = (x: number, y: number) => x >= 0 && y >= 0 && x < world.width && y < world.height && !world.blocked[y * world.width + x];
      if (!valid(tx, ty)) return [];
      const start = sy * world.width + sx, goal = ty * world.width + tx;
      const open = [start], seen = new Set<number>([start]), parent = new Map<number, number>(), g = new Map<number, number>([[start, 0]]);
      const h = (index: number) => Math.abs(index % world.width - tx) + Math.abs(Math.floor(index / world.width) - ty);
      let iterations = 0;
      while (open.length && iterations++ < 6000) {
        let best = 0; for (let i = 1; i < open.length; i++) if ((g.get(open[i]) ?? Infinity) + h(open[i]) < (g.get(open[best]) ?? Infinity) + h(open[best])) best = i;
        const current = open.splice(best, 1)[0];
        if (current === goal) {
          const result: Array<{ x: number; y: number }> = [];
          let index = goal; while (index !== start) { result.unshift({ x: index % world.width + 0.5, y: Math.floor(index / world.width) + 0.5 }); const prior = parent.get(index); if (prior === undefined) break; index = prior; }
          return result;
        }
        const x = current % world.width, y = Math.floor(current / world.width);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (!valid(nx, ny)) continue;
          const next = ny * world.width + nx, score = (g.get(current) ?? 0) + 1;
          if (score < (g.get(next) ?? Infinity)) { parent.set(next, current); g.set(next, score); if (!seen.has(next)) { seen.add(next); open.push(next); } }
        }
      }
      return [];
    }

    private attackRange(): number { return engine.state.player.equipment.weapon.includes('bow') ? 5.5 : 1.7; }
    private distance(x: number, y: number): number { return Math.hypot(engine.state.player.x - x, engine.state.player.y - y); }
    private current(x: number, y: number): boolean { return this.distance(x, y) <= VISION + 0.2; }
    private explored(x: number, y: number): boolean {
      const index = Math.floor(y) * engine.world.width + Math.floor(x);
      return this.exploredTiles.has(index) || this.current(x, y);
    }
    private enemyAt(x: number, y: number): EnemyState | undefined {
      return engine.state.enemies.filter(e => e.alive && this.current(e.x, e.y)).find(e => Math.hypot(e.x * TILE - x, e.y * TILE - y) < (ENEMIES[e.typeId]?.kind === 'boss' ? 32 : 23));
    }

    private syncTerrain(): void {
      if (engine.state.explored.length < this.exploredCount) { this.exploredTiles.clear(); this.exploredCount = 0; }
      for (let i = this.exploredCount; i < engine.state.explored.length; i++) this.exploredTiles.add(engine.state.explored[i]);
      this.exploredCount = engine.state.explored.length;
      const camera = this.cameras.main, view = camera.worldView, world = engine.world;
      const x0 = Math.max(0, Math.floor(view.x / TILE) - 3), y0 = Math.max(0, Math.floor(view.y / TILE) - 4);
      const x1 = Math.min(world.width - 1, Math.ceil(view.right / TILE) + 3), y1 = Math.min(world.height - 1, Math.ceil(view.bottom / TILE) + 4);
      const needed = new Set<number>();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!this.explored(x + 0.5, y + 0.5)) continue;
        const index = y * world.width + x; needed.add(index);
        let image = this.tiles.get(index);
        if (!image) { image = this.add.image(x * TILE, y * TILE, this.tileTexture(x, y, index)).setOrigin(0).setDepth(-10); this.tiles.set(index, image); }
        const range = this.distance(x + 0.5, y + 0.5);
        const shade = range <= VISION - 3 ? 1 : range <= VISION + 0.2 ? Math.max(0.23, 1 - (range - (VISION - 3)) / 4) : 0.28;
        image.setTint(Phaser.Display.Color.GetColor(Math.floor(255 * shade), Math.floor(255 * shade), Math.floor(246 * shade + 9)));
      }
      this.tiles.forEach((image, index) => { if (!needed.has(index)) { image.destroy(); this.tiles.delete(index); } });
      this.syncProps(x0, y0, x1, y1);
    }

    private tileTexture(x: number, y: number, index: number): string {
      const world = engine.world, tile = world.tiles[index], variant = (x * 17 + y * 31) % 5;
      const base = 'tf-' + tile + variant;
      if (tile !== 'path') return base;
      let mask = 0;
      const neighbors = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
      neighbors.forEach(([nx, ny], side) => {
        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) return;
        const type = world.tiles[ny * world.width + nx];
        if (type === 'grass' || type === 'forest' || type === 'marsh') mask |= 1 << side;
      });
      if (!mask) return base;
      const key = tile + variant + '-edge' + mask;
      this.texture(key, TILE, TILE, ctx => {
        ctx.drawImage(this.textures.get(base).getSourceImage() as HTMLCanvasElement, 0, 0);
        const rand = seeded(mask * 301 + variant * 7);
        for (let side = 0; side < 4; side++) if (mask & (1 << side)) {
          ctx.save(); ctx.translate(16, 16); ctx.rotate(side * Math.PI / 2); ctx.translate(-16, -16);
          for (let i = 0; i < 32; i += 2) {
            const inset = 1 + rand() * 4;
            ctx.fillStyle = i % 3 ? '#526a46' : '#697b4f';
            ctx.fillRect(i, 0, 2, inset);
            if (i % 4 === 0) segment(ctx, [i, inset + 1], [i - 1, inset - 2], '#9b9e6e', 0.6);
          }
          ctx.restore();
        }
      });
      return 'tf-' + key;
    }

    private syncProps(x0: number, y0: number, x1: number, y1: number): void {
      const needed = new Set<string>(), world = engine.world;
      const add = (id: string, x: number, y: number, texture: string, scale = 1, label?: string, tint?: number) => {
        if (x < x0 - 3 || y < y0 - 3 || x > x1 + 3 || y > y1 + 3 || !this.explored(x, y)) return;
        needed.add(id); let prop = this.props.get(id);
        if (!prop) {
          const image = this.add.image(0, 0, 'tf-' + texture).setOrigin(0.5, 1).setScale(scale);
          if (tint) image.setTint(tint);
          const children: Phaser.GameObjects.GameObject[] = [image];
          if (label) children.push(this.add.text(0, -7, label, { fontFamily: 'Georgia,serif', fontSize: '10px', color: '#e5d8b3', stroke: '#16201b', strokeThickness: 3, align: 'center' }).setOrigin(0.5, 0));
          const object = this.add.container(x * TILE, y * TILE, children).setDepth(y * TILE);
          prop = { object, x, y }; this.props.set(id, prop);
        }
        const distance = this.distance(x, y);
        prop.object.setAlpha(distance <= VISION - 2 ? 1 : distance <= VISION ? Math.max(0.4, 1 - (distance - VISION + 2) * 0.27) : 0.35);
      };
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const index = y * world.width + x, type = world.tiles[index];
        if (!world.blocked[index]) continue;
        const variant = (x * 7 + y * 13) % 3;
        if (type === 'forest') add('tree' + index, x + 0.5, y + 0.9, (x + y) % 5 === 0 ? 'pine' + variant : 'tree' + variant, 0.77 + ((x * 3 + y) % 5) * 0.08);
        else if (type === 'rock') add('rock' + index, x + 0.5, y + 0.8, 'boulder' + variant, 0.9);
        else if (type === 'wall') add('wall' + index, x + 0.5, y + 0.9, 'ruin', 0.55);
      }
      for (const npc of world.npcs) add(npc.id, npc.x + 0.5, npc.y + 0.5, 'npc', 1, npc.name);
      for (const node of world.resources) {
        const collected = engine.state.collectedNodes[node.id];
        if (collected !== undefined && engine.state.worldTime - collected < 300) continue;
        add(node.id, node.x + 0.5, node.y + 0.7, node.kind === 'herb' ? 'herb' : 'ore');
      }
      for (const chest of world.chests) if (!engine.state.openedChests.includes(chest.id)) add(chest.id, chest.x + 0.5, chest.y + 0.7, 'chest');
      for (const mark of world.landmarks) {
        if (mark.kind === 'village') {
          add(mark.id + 'house1', mark.x - 2, mark.y - 1, 'house', 0.85);
          add(mark.id + 'house2', mark.x + 3, mark.y - 1.3, 'house', 0.75);
          add(mark.id + 'house3', mark.x - 6.5, mark.y + 4, 'house', 0.7);
          add(mark.id + 'banner1', mark.x - 0.6, mark.y - 0.8, 'banner');
          add(mark.id + 'banner2', mark.x + 5.7, mark.y + 1, 'banner', 0.9);
          add(mark.id + 'pot1', mark.x - 3, mark.y - 1.1, 'planter', 0.85);
          add(mark.id + 'pot2', mark.x + 4, mark.y - 1.3, 'planter', 0.8);
          for (const [index, [dx, dy]] of [[-2, 2], [-4, -3], [5, 5], [7, -4], [-5, 5], [-1, 6]].entries()) add(mark.id + 'flowers' + index, mark.x + dx + 0.5, mark.y + dy + 0.8, 'flowers', 0.9);

        } else if (mark.kind === 'camp') add(mark.id, mark.x + 0.5, mark.y + 0.5, 'camp');
        else if (mark.kind === 'shrine' || mark.kind === 'portal') add(mark.id, mark.x + 0.5, mark.y + 0.8, 'shrine', mark.kind === 'portal' ? 1.4 : 1);
        else if (mark.kind === 'bridge') add(mark.id, mark.x + 0.5, mark.y + 1.8, 'bridge');
        else if (mark.kind === 'ruin' || mark.kind === 'mine') add(mark.id, mark.x + 0.5, mark.y + 0.8, mark.kind === 'mine' ? 'boulder1' : 'ruin', 1.1);
        const labelId = 'label-' + mark.id;
        if (mark.x >= x0 && mark.x <= x1 && mark.y >= y0 && mark.y <= y1 && this.explored(mark.x + 0.5, mark.y + 0.5)) {
          needed.add(labelId);
          if (!this.props.has(labelId)) {
            const object = this.add.text((mark.x + 0.5) * TILE, (mark.y - 2.8) * TILE, mark.name, { fontFamily: 'Georgia,serif', fontSize: '13px', color: '#dfc995', stroke: '#17221b', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(8500);
            this.props.set(labelId, { object, x: mark.x, y: mark.y });
          }
          this.props.get(labelId)!.object.setAlpha(this.current(mark.x + 0.5, mark.y + 0.5) ? 0.95 : 0.35);
        }
      }
      this.props.forEach((prop, id) => { if (!needed.has(id)) { prop.object.destroy(); this.props.delete(id); } });
    }

    private syncActors(alpha: number): void {
      const p = engine.state.player, hero = this.playerVisual;
      const targetX = p.x * TILE, targetY = p.y * TILE;
      const moving = Math.hypot(targetX - hero.previousX, targetY - hero.previousY) > 0.1 && !engine.state.paused;
      hero.walk += moving ? 0.18 : 0;
      hero.root.setPosition(Phaser.Math.Linear(hero.previousX, targetX, alpha), Phaser.Math.Linear(hero.previousY, targetY, alpha)).setDepth(targetY + 10);
      hero.image.setTexture('tf-hero' + (moving ? Math.floor(this.phase * 8) % 3 : 1)).setY(2 + (moving ? Math.sin(this.phase * 17) * 1.1 : Math.sin(this.phase * 2) * 0.35));
      if (moving && Math.abs(targetX - hero.previousX) > 0.3) hero.image.setFlipX(targetX < hero.previousX);
      hero.root.setAlpha(engine.state.status === 'dead' ? 0.45 : 1);
      const active = new Set<string>();
      for (const enemy of engine.state.enemies) {
        if (!enemy.alive || !this.current(enemy.x, enemy.y)) continue;
        active.add(enemy.id); const def = ENEMIES[enemy.typeId]; let actor = this.enemies.get(enemy.id);
        if (!actor) { actor = this.actor(def?.kind ?? 'bandit', enemy.x * TILE, enemy.y * TILE); this.enemies.set(enemy.id, actor); }
        actor.root.setPosition(Phaser.Math.Linear(actor.previousX, enemy.x * TILE, alpha), Phaser.Math.Linear(actor.previousY, enemy.y * TILE, alpha)).setDepth(enemy.y * TILE + 8);
        const movement = Math.hypot(enemy.x * TILE - actor.previousX, enemy.y * TILE - actor.previousY);
        actor.image.setY(2 + (movement > 0.2 ? Math.sin(this.phase * 12 + enemy.id.length) * 1.2 : 0));
        if (Math.abs(enemy.x * TILE - actor.previousX) > 0.3) actor.image.setFlipX(enemy.x * TILE < actor.previousX);
      }
      this.enemies.forEach((actor, id) => { if (!active.has(id)) { actor.root.destroy(); this.enemies.delete(id); } });
    }

    private drawCombat(): void {
      const g = this.combatOverlay; g.clear();
      for (const enemy of engine.state.enemies) {
        if (!enemy.alive || !this.current(enemy.x, enemy.y)) continue;
        const selected = engine.state.selectedEnemyId === enemy.id, hovered = this.hoverId === enemy.id;
        if (selected) g.lineStyle(1.8, 0xd98b6b, 0.9).strokeEllipse(enemy.x * TILE, enemy.y * TILE - 1, 34 + Math.sin(this.phase * 4) * 2, 15);
        if (selected || hovered || enemy.hp < enemy.maxHp) {
          const y = enemy.y * TILE - (ENEMIES[enemy.typeId]?.kind === 'boss' ? 91 : 52);
          g.fillStyle(0x17201a, 0.95).fillRoundedRect(enemy.x * TILE - 20, y, 40, 5, 2);
          g.fillStyle(0xbd6a52, 1).fillRoundedRect(enemy.x * TILE - 19, y + 1, 38 * Math.max(0, enemy.hp / enemy.maxHp), 3, 1);
        }
      }
      for (const chest of engine.world.chests) if (!engine.state.openedChests.includes(chest.id) && this.current(chest.x + 0.5, chest.y + 0.5)) {
        g.lineStyle(1, 0xdec98b, 0.2 + Math.sin(this.phase * 3) * 0.07).strokeEllipse((chest.x + 0.5) * TILE, (chest.y + 0.62) * TILE, 40, 18);
      }
      for (const mark of engine.world.landmarks) if (mark.kind === 'camp' && this.current(mark.x + 0.5, mark.y + 0.5)) {
        const x = (mark.x + 0.5) * TILE, y = (mark.y + 0.5) * TILE;
        g.fillStyle(0xe7a55f, 0.055 + Math.sin(this.phase * 8) * 0.012).fillCircle(x, y - 10, 42);
        if (this.phase % 0.6 < 0.018) this.spark(x, y - 15, 0xe9bb76, 0.6);
      }
      if (engine.state.paused) this.destination.clear();
    }

    private drawAtmosphere(): void {
      const camera = this.cameras.main;
      const daylight = Math.floor(engine.state.worldTime / 20) % 6;
      if (this.dayLight === daylight && this.atmosphere.getData('width') === camera.width && this.atmosphere.getData('height') === camera.height) return;
      this.dayLight = daylight; this.atmosphere.setData('width', camera.width).setData('height', camera.height);
      this.atmosphere.clear().fillStyle(daylight > 3 ? 0x293144 : 0x6c4037, daylight > 3 ? 0.09 : 0.045).fillRect(0, 0, camera.width, camera.height);
    }

    private displayEvents(): void {
      for (const event of engine.state.events) {
        if (this.knownEvents.has(event.id)) continue;
        this.knownEvents.add(event.id);
        if (!this.current(event.x, event.y)) continue;
        const text = this.add.text(event.x * TILE, event.y * TILE - 42, event.text, { fontFamily: 'Georgia,serif', fontSize: '13px', fontStyle: 'bold', color: event.color, stroke: '#151e18', strokeThickness: 3 }).setOrigin(0.5).setDepth(16000);
        this.tweens.add({ targets: text, y: text.y - 29, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
        const color = Phaser.Display.Color.HexStringToColor(event.color).color;
        if (/^[-+]?\d/.test(event.text)) {
          const slash = this.add.graphics().setDepth(15500); slash.lineStyle(2, color, 0.8).beginPath().arc(event.x * TILE, event.y * TILE - 15, 19, -1.3, 1).strokePath();
          this.tweens.add({ targets: slash, alpha: 0, duration: 240, onComplete: () => slash.destroy() });
        } else for (let i = 0; i < 4; i++) this.spark(event.x * TILE, event.y * TILE - 22, color, 0.8);
      }
      if (this.knownEvents.size > 150) { const current = new Set(engine.state.events.map(e => e.id)); this.knownEvents.forEach(id => { if (!current.has(id)) this.knownEvents.delete(id); }); }
    }
    private spark(x: number, y: number, color: number, life: number): void {
      const spark = this.add.image(x, y, 'tf-spark').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 100);
      const offset = Math.sin(this.phase * 37 + x) * 15;
      this.tweens.add({ targets: spark, x: x + offset, y: y - 28, alpha: 0, scale: 0.2, duration: life * 1000, onComplete: () => spark.destroy() });
    }
    private updateHover(): void {
      const pointer = this.input.activePointer, point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const enemy = this.enemyAt(point.x, point.y); this.hoverId = enemy?.id ?? null;
      if (!enemy || editable()) { this.hoverText.setVisible(false); return; }
      const def = ENEMIES[enemy.typeId];
      this.hoverText.setText(`${def?.name ?? enemy.typeId} · ${def?.level ?? 1}. szint\n${Math.ceil(enemy.hp)} / ${enemy.maxHp} életerő`);
      const positionX = Math.min(pointer.x + 16, this.cameras.main.width - this.hoverText.width - 12);
      const camera = this.cameras.main;
      this.hoverText.setScale(1 / camera.zoom).setPosition((positionX - camera.width / 2) / camera.zoom + camera.width / 2, (Math.max(10, pointer.y - 52) - camera.height / 2) / camera.zoom + camera.height / 2).setVisible(true);
    }

    private clean(): void {
      this.listenerCleanup.forEach(cleanup => cleanup()); this.listenerCleanup = []; this.keys.clear();
      this.tiles.clear(); this.props.clear(); this.enemies.clear(); this.knownEvents.clear();
      this.texturesOwned.forEach(texture => { if (this.textures.exists(texture)) this.textures.remove(texture); }); this.texturesOwned = [];
    }
  };
}
