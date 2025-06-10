class Level1 extends Phaser.Scene {
    constructor() {
        super("Level1");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 250; // reduced for more controlled movement
        this.DRAG = 1200;       // increased for less sliding
        this.physics.world.gravity.y = 1200; // reduced gravity for slower fall
        this.JUMP_VELOCITY = -400; // less negative for slower, higher jump
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0; // This is the camera zoom scale (e.g., 2.0 for 2x zoom)
    }

    create() {
        // Create a new tilemap game object
        this.map = this.add.tilemap("platformer-final-lvl1");

        // Add tilesets to the map
        this.tileset = [
            this.map.addTilesetImage("tilemap_packed_dessert", "dessert_tiles"),
            this.map.addTilesetImage("tilemap_packed", "tilemap_tiles"),
            this.map.addTilesetImage("crop_backgrounds_packed", "background_tiles")
        ];

        // Create layers
        this.bgLayer = this.map.createLayer("Backgrounds", this.tileset, 0, 0);
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);
        this.prettyLayer = this.map.createLayer("Pretty-Stuffs", this.tileset, 0, 0);

        // Set world bounds to match the map size
        this.physics.world.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        // Make platforms collidable
        this.platformLayer.setCollisionByProperty({
            collides: true
        });
        // Explicitly clear collision on prettyLayer to avoid invisible walls
        this.prettyLayer.setCollision(false);

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Donuts-Candy", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });
        this.coinGroup = this.add.group(this.coins);

        // Collect donut object data and create Sprites:
        const donutObjects = this.map.createFromObjects("Donuts-Candy", {
            name: "donut",
            key: "dessert_sheet",
        });

        // Define donut animation
        this.anims.create({
            key: 'donut_spin',
            frames: this.anims.generateFrameNumbers('dessert_sheet', { start: 13, end: 14 }),
            frameRate: 2,
            repeat: -1
        });

        // Replace donuts with Sprites that can animate
        this.donuts = donutObjects.map(obj => {
            const donut = this.add.sprite(obj.x, obj.y, "dessert_sheet", 14);
            donut.anims.play('donut_spin');
            obj.destroy(); // Remove the original static image from the map
            return donut;
        });
        this.physics.world.enable(this.donuts, Phaser.Physics.Arcade.STATIC_BODY);
        this.donutGroup = this.add.group(this.donuts);

        // --- Spikes setup ---
        this.spikes = this.map.createFromObjects("Donuts-Candy", {
            name: "spike"
        });
        this.physics.world.enable(this.spikes, Phaser.Physics.Arcade.STATIC_BODY);
        this.spikes.forEach(obj => obj.visible = false); // Make spike objects invisible
        this.spikeGroup = this.add.group(this.spikes);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(29, 350, "platformer_characters", "tile_0004.png");
        my.sprite.player.setCollideWorldBounds(true); // Enable world bounds collision
        my.sprite.player.setDepth(10);

        // Enable collision handling between player and platforms
        this.physics.add.collider(my.sprite.player, this.platformLayer);

        // Coin collect particle effect
        my.vfx.coinCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ['light_01.png', 'light_02.png', 'light_03.png'],
            scale: { start: 0.03, end: 0.1 },
            lifespan: 500,
            alpha: { start: 1, end: 0.1 },
        });
        my.vfx.coinCollect.stop();

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            my.vfx.coinCollect.emitParticle(1, obj2.x, obj2.y);
        });

        // Donut collect particle effect
        my.vfx.donutCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ['light_01.png', 'light_02.png', 'light_03.png'],
            scale: { start: 0.03, end: 0.1 },
            lifespan: 500,
            alpha: { start: 1, end: 0.1 },
        });
        my.vfx.donutCollect.stop();

        // Donut collision handler
        this.physics.add.overlap(my.sprite.player, this.donutGroup, (obj1, obj2) => {
            obj2.destroy();
            my.vfx.donutCollect.emitParticle(1, obj2.x, obj2.y);
            this.donutsCollected++;
            this.events.emit('updateDonuts', this.donutsCollected);
        });

        // --- One-way platforms setup ---
        this.onewayPlatforms = [];
        this.platformLayer.forEachTile(tile => {
            if (tile.properties.oneway) {
                let body = this.physics.add.staticImage(
                    tile.getCenterX(),
                    tile.getCenterY(),
                    null
                );
                body.displayWidth = tile.width;
                body.displayHeight = tile.height;
                body.visible = false;
                body.refreshBody();
                this.onewayPlatforms.push(body);
            }
        });

        // Add update callback for one-way platforms
        this.events.on('update', () => {
            for (let platform of this.onewayPlatforms) {
                let player = my.sprite.player;
                if (
                    player.body.velocity.y > 0 &&
                    player.body.bottom <= platform.body.top + 5 &&
                    player.body.right > platform.body.left &&
                    player.body.left < platform.body.right
                ) {
                    if (
                        player.body.bottom + player.body.velocity.y * this.game.loop.delta / 1000 >= platform.body.top
                    ) {
                        player.body.y = platform.body.top - player.body.height;
                        player.body.velocity.y = 0;
                        player.body.blocked.down = true;
                        player.body.touching.down = true;
                    }
                }
            }
        });

        // --- Spike collision: reset player to spawn point and lose health ---
        this.physics.add.overlap(my.sprite.player, this.spikeGroup, () => {
            if (this.playerHealth > 0) {
                this.playerHealth--;
                this.events.emit('updateHealth', this.playerHealth); // Update UI on health change
                if (this.playerHealth <= 0) {
                    // Emit health update before restart, then restart scene
                    this.events.emit('updateHealth', this.playerHealth);
                    this.scene.restart();
                    return;
                }
            }
            my.sprite.player.setPosition(29, 350); // Reset player to spawn point
            my.sprite.player.body.setVelocity(0, 0);
        });

        // --- Exit setup ---
        this.exits = this.map.createFromObjects("Donuts-Candy", {
            name: "exit",
            key: "tilemap_sheet",
            frame: 88,          
        });
        this.physics.world.enable(this.exits, Phaser.Physics.Arcade.STATIC_BODY);
        this.exitGroup = this.add.group(this.exits);

        // --- Exit overlap: transfer to Level2 ---
        this.physics.add.overlap(my.sprite.player, this.exitGroup, () => {
            this.scene.start("Level2");
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.clear();
            }
        }, this);

        // Movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            scale: { start: 0.03, end: 0.1 },
            lifespan: 350,
            alpha: { start: 1, end: 0.1 }, 
        });
        my.vfx.walking.stop();
        
        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE); // Camera zoom is 2.0

        // Donut counter setup
        this.donutsCollected = 0;
        this.events.emit('updateDonuts', this.donutsCollected);

        // --- Health system setup ---
        this.playerMaxHealth = 3;
        this.playerHealth = this.playerMaxHealth;
        this.events.emit('updateHealth', this.playerHealth); // Ensure UI is updated at start

        this.scene.launch('UIScene'); // <-- Launch UIScene after assets are loaded
    }

    update() {
        // Player movement and animation logic
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }
        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, -my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }
        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        // Player jump logic
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        // Restart scene on R key
        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}