class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load characters spritesheet
        this.load.atlas("platformer_characters", "tilemap-characters-packed.png", "tilemap-characters-packed.json");

        this.load.image("dessert_tiles", "dessert.png");                         // Packed tilemap

        this.load.image("background_tiles", "crop_backgrounds_packed.png");

        this.load.image("shipGreen", "shipGreen.png");
        
        // Load tilemap information
        this.load.image("tilemap_tiles", "tilemap_packed.png");
        this.load.tilemapTiledJSON("platformer-final-lvl1", "platformer-final-lvl1.tmj");
        this.load.tilemapTiledJSON("platformer-final-lvl2", "platformer-final-lvl2.tmj");
        this.load.tilemapTiledJSON("oceanMap", "ocean-map.tmj");

        // Load the tilemap as a spritesheet
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        this.load.spritesheet("dessert_sheet", "dessert.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        this.load.spritesheet("background_sheet", "crop_backgrounds_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        // Load walking sound effects
        this.load.setPath("./assets/Audio/");
        this.load.audio("footstep1", "footstep_carpet_003.ogg");
        this.load.audio("footstep2", "footstep_carpet_004.ogg");

        // Load bug death sound effect
        this.load.audio("bugDeath", "impactGeneric_light_000.ogg");

        // Load spike hit sound effect
        this.load.audio("spikeHit", "impactMining_000.ogg");

        // Load pickup sound effect
        this.load.audio("donutPickup", "impactTin_medium_000.ogg");
        this.load.audio("heartPickup", "jingles_NES03.ogg")
    }

    create() {
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('platformer_characters', {
                prefix: "tile_",
                start: 0,
                end: 1,
                suffix: ".png",
                zeroPad: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0000.png" }
            ],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0001.png" }
            ],
        });

                // --- Enemy Animations ---
        this.anims.create({
            key: 'bug_walk',
            frames: [
                { key: 'platformer_characters', frame: 'tile_0018.png' },
                { key: 'platformer_characters', frame: 'tile_0019.png' }
            ],
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'bug_idle',
            frames: [
                { key: 'platformer_characters', frame: 'tile_0018.png' }
            ],
            frameRate: 1,
            repeat: -1
        });

        this.anims.create({
            key: 'shoot_idle',
            frames: [
                { key: 'platformer_characters', frame: 'tile_0004.png' },
                { key: 'platformer_characters', frame: 'tile_0005.png' }
            ],
            frameRate: 6,
            repeat: -1
        })

         // ...and pass to the next Scene
         this.scene.start("Start");
    }

    // Never get here since a new scene is started in create()
    update() {
    }
}