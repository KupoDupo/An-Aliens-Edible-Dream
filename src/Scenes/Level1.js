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
            this.donutText.setText(`Donuts: ${this.donutsCollected}`); // Update label
            console.log(`Donuts collected: ${this.donutsCollected}`);
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
                this.updateHeartsUI();
                if (this.playerHealth <= 0) {
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

        // Add donut icon (frame 14 from dessert_sheet)
        // Initial position is 0,0 as it will be constantly updated
        this.donutIcon = this.add.image(0, 0, "dessert_sheet", 14)
            .setOrigin(1, 0) // Origin (1,0) for top-right of the element
            .setScale(1.2)
            .setScrollFactor(0) // Fixed to camera
            .setDepth(1000); 

        // Add donut count text next to icon
        this.donutText = this.add.text(0, 0, `Donuts: ${this.donutsCollected}`,
            { font: '28px Arial Black', fill: '#fff', stroke: '#000', strokeThickness: 4 })
            .setOrigin(1, 0) // Origin (1,0) for top-right of the element
            .setScrollFactor(0) // Fixed to camera
            .setDepth(1000);

        // Add background rectangle for donut score
        this.donutScoreBg = this.add.rectangle(0, 0, 200, 50, 0x000000, 0.5) // Initial size is a guess
            .setOrigin(1, 0) // Origin (1,0) for top-right of the element
            .setScrollFactor(0) // Fixed to camera
            .setDepth(999);

        // --- Health system setup ---
        this.playerMaxHealth = 3;
        this.playerHealth = this.playerMaxHealth;
        this.heartIcons = [];
        for (let i = 0; i < this.playerMaxHealth; i++) {
            let heart = this.add.image(0, 0, "tilemap_sheet", 44) // Use frame 44 only
            .setOrigin(0, 1) // Origin (0,1) for bottom-left of the element
            .setScale(1.2)
            .setScrollFactor(0) // Fixed to camera
            .setDepth(1000);
            this.heartIcons.push(heart);
        }

        // --- Debugging elements ---
        // A simple rectangle at the very top-left of the camera's viewport
        this.testRect = this.add.rectangle(0, 0, 50, 50, 0xff0000)
            .setOrigin(0, 0) // Top-left origin
            .setScrollFactor(0) // Fixed to camera
            .setDepth(2000);

        // A simple text message to confirm UI is appearing and fixed
        this.debugTestText = this.add.text(0, 0, 'UI Debug', {
            font: '24px Arial', fill: '#00FFFF'
        })
        .setOrigin(0, 0) // Top-left origin
        .setScrollFactor(0) // Fixed to camera
        .setDepth(9999);


        // Initial update of heart UI (to set correct alphas)
        this.updateHeartsUI();
    }

    updateHeartsUI() {
        for (let i = 0; i < this.heartIcons.length; i++) {
            if (i < this.playerHealth) {
                this.heartIcons[i].setAlpha(1);
            } else {
            this.heartIcons[i].setFrame(46); // Empty/lost heart
            this.heartIcons[i].setAlpha(1);  // Keep visible
            }
        }
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

        // --- UI Positioning (relative to camera's worldview) ---
        // This calculates positions based on the camera's current visible area
        // Elements with setScrollFactor(0) are positioned relative to the camera's
        // top-left corner (cam.worldView.left, cam.worldView.top).
        const cam = this.cameras.main;
        const margin = 10; // Margin from the camera's edges

        // Heart Icons UI (bottom-left)
        // heartIcons have origin (0,1) = bottom-left corner.
        // So, their X is their left edge, Y is their bottom edge.
        const heartMargin = 20;
        let lastHeartRight = cam.worldView.left + heartMargin;
        for (let i = 0; i < this.heartIcons.length; i++) {
            this.heartIcons[i].x = lastHeartRight;
            this.heartIcons[i].y = cam.worldView.bottom - heartMargin;
            lastHeartRight += this.heartIcons[i].displayWidth + 10;
        }

        // Donut Counter UI (bottom-left, after hearts)
        // donutIcon, donutText, donutScoreBg have origin (0,1) = bottom-left corner.
        // Their X is their left edge, Y is their bottom edge.
        // Place donutIcon right after the last heart icon
        const donutIconSpacing = 20;
        this.donutIcon.setOrigin(0, 1);
        this.donutIcon.x = lastHeartRight + donutIconSpacing;
        this.donutIcon.y = cam.worldView.bottom - heartMargin;

        const textIconSpacing = 5;
        this.donutText.setOrigin(0, 1);
        this.donutText.x = this.donutIcon.x + this.donutIcon.displayWidth + textIconSpacing;
        this.donutText.y = this.donutIcon.y; // Align bottom

        // Calculate background size and position based on content
        // The background's content area (icon+text) starts at the leftmost point of the icon
        // and ends at the rightmost point of the text.
        const contentLeft = this.donutIcon.x;
        const contentRight = this.donutText.x + this.donutText.displayWidth;
        const contentTop = Math.min(this.donutIcon.y - this.donutIcon.displayHeight, this.donutText.y - this.donutText.displayHeight);
        const contentBottom = this.donutIcon.y;

        const bgPadding = 10; // Padding around the text and icon inside the background
        this.donutScoreBg.displayWidth = (contentRight - contentLeft) + (bgPadding * 2);
        this.donutScoreBg.displayHeight = (contentBottom - contentTop) + (bgPadding * 2);

        // Position the background (origin 0,1 - bottom-left corner)
        this.donutScoreBg.setOrigin(0, 1);
        this.donutScoreBg.x = contentLeft - bgPadding;
        this.donutScoreBg.y = contentBottom + bgPadding;

        // Debugging elements (top-left)
        // testRect and debugTestText have origin (0,0) = top-left corner.
        this.testRect.x = cam.worldView.left + 10;
        this.testRect.y = cam.worldView.top + 10;
        
        // Position debugText below testRect
        this.debugTestText.x = cam.worldView.left + 10;
        this.debugTestText.y = cam.worldView.top + 10 + this.testRect.displayHeight + 10; 
    }
}