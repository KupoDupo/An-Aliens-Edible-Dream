class Level2 extends Phaser.Scene {
    constructor() {
        super("Level2");
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
        this.map = this.add.tilemap("platformer-final-lvl2");

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

        // Make sure keyboard input is enabled 
        this.input.keyboard.enabled = true;

        const heartObjects = this.map.createFromObjects("Donuts-Candy", {
            name: "heart",
            key: "tilemap_sheet",
            frame: 44,
        })

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
        my.sprite.player = this.physics.add.sprite(15, 276, "platformer_characters", "tile_0004.png");
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
            if (this.donutPickupSound) this.donutPickupSound.play({ volume: 1.0 }); // louder
            this.donutsCollected++;
            this.events.emit('updateDonuts', this.donutsCollected);
        });

        // Create heart sprites from map objects
        this.hearts = heartObjects.map(obj => {
            const heart = this.add.sprite(obj.x, obj.y, "tilemap_sheet", 44);
            // Add pulse animation: scale between 1 and 1.3
            this.tweens.add({
                targets: heart,
                scale: 1.3,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 200) // randomize for variety
            });
            obj.destroy();
            return heart;
        });
        this.physics.world.enable(this.hearts, Phaser.Physics.Arcade.STATIC_BODY);
        this.heartGroup = this.add.group(this.hearts);

        // Heart collect particle effect (optional, similar to donut)
        my.vfx.heartCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ['light_01.png', 'light_02.png', 'light_03.png'],
            scale: { start: 0.03, end: 0.1 },
            lifespan: 500,
            alpha: { start: 1, end: 0.1 },
        });
        my.vfx.heartCollect.stop();

        // Heart collision handler
        this.physics.add.overlap(my.sprite.player, this.heartGroup, (obj1, obj2) => {
            // Only allow collection if playerHealth < 3
            if (this.playerHealth < 3) {
                obj2.destroy();
                my.vfx.heartCollect.emitParticle(1, obj2.x, obj2.y);
                if (this.heartPickupSound) this.heartPickupSound.play({ volume: 1.0 });
                this.playerHealth = Math.min(this.playerHealth + 1, 3);
                this.events.emit('updateHealth', this.playerHealth);
            }
            // If at max health (3), do nothing (heart remains)
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
            if (this.deathSound) this.deathSound.play({ volume: 0.7 });
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
            my.sprite.player.setPosition(15, 276); // Reset player to spawn point
            my.sprite.player.body.setVelocity(0, 0);
        });

        // --- Exit setup ---
        this.exits = this.map.createFromObjects("Donuts-Candy", {
            name: "exit",
            key: "shipGreen"
        });
        this.physics.world.enable(this.exits, Phaser.Physics.Arcade.STATIC_BODY);
        this.exitGroup = this.add.group(this.exits);

        // Make exit images smaller
        this.exits.forEach(exit => {
            exit.setScale(0.2);
            if (exit.body) {
                exit.body.width *= 0.3 / (exit.body.width / exit.displayWidth);
                exit.body.height *= 0.3 / (exit.body.height / exit.displayHeight);
                exit.body.updateFromGameObject();
            }
        });

        // --- Exit overlap: transfer to Ending ---
        this.physics.add.overlap(my.sprite.player, this.exitGroup, () => {
            this.scene.start("Ending", { donutsCollected: this.donutsCollected });
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
            scale: { start: 0.01, end: 0.05 },
            lifespan: 350,
            frequency: 50,
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

        // --- Bug Enemy setup: pacing between x=123 and x=347 ---
        this.bugEnemy = this.physics.add.sprite(123, 270, "platformer_characters", "tile_0018.png");
        this.bugEnemy.setCollideWorldBounds(true);
        this.bugEnemy.setVelocityX(60); // initial speed to the right
        this.bugEnemy.maxX = 347;
        this.bugEnemy.minX = 116;
        this.bugEnemy.body.allowGravity = true;
        this.bugEnemy.setDepth(10);
        this.bugEnemy.setFlipX(true);

        if (this.anims.exists('bug_walk')) {
            this.bugEnemy.anims.play('bug_walk');
        }
        this.physics.add.collider(this.bugEnemy, this.platformLayer);

        // --- New Enemy Type: pacing between x=725 and x=945 ---
        this.bugEnemy2 = this.physics.add.sprite(725, 349, "platformer_characters", "tile_0019.png");
        this.bugEnemy2.setCollideWorldBounds(true);
        this.bugEnemy2.setVelocityX(60);
        this.bugEnemy2.maxX = 945;
        this.bugEnemy2.minX = 725;
        this.bugEnemy2.body.allowGravity = true;
        this.bugEnemy2.setDepth(10);
        this.bugEnemy2.setFlipX(true);

        // Use bug_walk for animation if it fits, or define a new animation if needed
        if (this.anims.exists('bug_walk')) {
            this.bugEnemy2.anims.play('bug_walk');
        }
        this.physics.add.collider(this.bugEnemy2, this.platformLayer);

        // --- Shoot Enemy setup: idle at (1290, 225) ---
        this.shootEnemy = this.physics.add.sprite(1265, 218, "platformer_characters", "tile_0005.png");
        this.shootEnemy.setCollideWorldBounds(true);
        this.shootEnemy.body.allowGravity = true;
        this.shootEnemy.setDepth(10);
        if (this.anims.exists('shoot_idle')) {
            this.shootEnemy.anims.play('shoot_idle');
        }
        this.physics.add.collider(this.shootEnemy, this.platformLayer);

        // --- Second Shoot Enemy setup: idle at (1537, 326) ---
        this.shootEnemy2 = this.physics.add.sprite(1537, 326, "platformer_characters", "tile_0005.png");
        this.shootEnemy2.setCollideWorldBounds(true);
        this.shootEnemy2.body.allowGravity = true;
        this.shootEnemy2.setDepth(10);
        if (this.anims.exists('shoot_idle')) {
            this.shootEnemy2.anims.play('shoot_idle');
        }
        this.physics.add.collider(this.shootEnemy2, this.platformLayer);

        // --- Shoot Enemy Projectile Setup ---
        this.shootProjectiles = this.physics.add.group();
        this.shootEnemyLastFired = 0;
        this.shootEnemyFireInterval = 5000; // 5 seconds

        // --- Second Shoot Enemy Projectile Setup ---
        this.shootEnemy2LastFired = 0;
        this.shootEnemy2FireInterval = 5000; // 5 seconds

        // --- Pipe setup ---
        this.pipes = this.map.createFromObjects("Donuts-Candy", {
            name: "pipe"
        });
        this.pipes.forEach(obj => obj.visible = false);
        this.physics.world.enable(this.pipes, Phaser.Physics.Arcade.STATIC_BODY);
        this.pipeGroup = this.add.group(this.pipes);

        // --- Pipe overlap: transfer to oceanFloor.js ---
        this.physics.add.overlap(my.sprite.player, this.pipeGroup, (player, pipe) => {
            // Prevent multiple triggers by disabling the pipe and player input
            this.physics.world.disable(pipe);
            // Running into issues where player won't move when transitioning to level2 because of this line -> have to set to true in create()
            this.input.keyboard.enabled = false;
            this.scene.start("oceanFloor");
        });

        // Optional: projectile-player collision (player takes damage)
        this.physics.add.overlap(my.sprite.player, this.shootProjectiles, (player, projectile) => {
            projectile.destroy();
            if (this.deathSound) this.deathSound.play({ volume: 0.7 });
            if (this.playerHealth > 0) {
                this.playerHealth--;
                this.events.emit('updateHealth', this.playerHealth);
                if (this.playerHealth <= 0) {
                    this.events.emit('updateHealth', this.playerHealth);
                    this.scene.restart();
                    return;
                }
            }
            player.setPosition(15, 276);
            player.body.setVelocity(0, 0);
        });

        // --- Player & Bug Enemy collision logic ---
        this.physics.add.overlap(my.sprite.player, this.bugEnemy, (player, enemy) => {
            // Shrink player hitbox for enemy collision
            const playerHitbox = {
                x: player.body.x + player.body.width * 0.15,
                y: player.body.y + player.body.height * 0.15,
                width: player.body.width * 0.7,
                height: player.body.height * 0.7
            };
            const enemyHitbox = {
                x: enemy.body.x,
                y: enemy.body.y,
                width: enemy.body.width,
                height: enemy.body.height
            };

            // Check if player is falling and above enemy (stomp)
            const playerBottom = player.body.y + player.body.height;
            const enemyTop = enemy.body.y + 5; // small fudge for easier stomp
            const playerFalling = player.body.velocity.y > 0;

            // Axis-Aligned Bounding Box (AABB) overlap for smaller player hitbox
            const overlap =
                playerHitbox.x < enemyHitbox.x + enemyHitbox.width &&
                playerHitbox.x + playerHitbox.width > enemyHitbox.x &&
                playerHitbox.y < enemyHitbox.y + enemyHitbox.height &&
                playerHitbox.y + playerHitbox.height > enemyHitbox.y;

            if (playerFalling && playerBottom <= enemyTop + 10) {
                // Stomp enemy: set frame to death, then disable after short delay
                enemy.anims.stop();
                enemy.setFrame('tile_0020.png');
                enemy.body.enable = false;
                if (this.bugDeathSound) this.bugDeathSound.play({ volume: 0.7 });
                this.time.delayedCall(350, () => {
                    enemy.disableBody(true, true);
                });
                player.body.setVelocityY(this.JUMP_VELOCITY * 0.7); // Bounce player up a bit
            } else if (overlap) {
                // Player takes damage and respawns (like spikes)
                if (this.deathSound) this.deathSound.play({ volume: 0.7 });
                if (this.playerHealth > 0) {
                    this.playerHealth--;
                    this.events.emit('updateHealth', this.playerHealth);
                    if (this.playerHealth <= 0) {
                        this.events.emit('updateHealth', this.playerHealth);
                        this.scene.restart();
                        return;
                    }
                }
                player.setPosition(15, 276); // Reset player to spawn point
                player.body.setVelocity(0, 0);
            }
        });

        // --- Player & New Enemy Type collision logic ---
        this.physics.add.overlap(my.sprite.player, this.bugEnemy2, (player, enemy) => {
            // Shrink player hitbox for enemy collision
            const playerHitbox = {
                x: player.body.x + player.body.width * 0.15,
                y: player.body.y + player.body.height * 0.15,
                width: player.body.width * 0.7,
                height: player.body.height * 0.7
            };
            const enemyHitbox = {
                x: enemy.body.x,
                y: enemy.body.y,
                width: enemy.body.width,
                height: enemy.body.height
            };

            // Check if player is falling and above enemy (stomp)
            const playerBottom = player.body.y + player.body.height;
            const enemyTop = enemy.body.y + 5;
            const playerFalling = player.body.velocity.y > 0;

            const overlap =
                playerHitbox.x < enemyHitbox.x + enemyHitbox.width &&
                playerHitbox.x + playerHitbox.width > enemyHitbox.x &&
                playerHitbox.y < enemyHitbox.y + enemyHitbox.height &&
                playerHitbox.y + playerHitbox.height > enemyHitbox.y;

            if (playerFalling && playerBottom <= enemyTop + 10) {
                enemy.anims.stop();
                enemy.setFrame('tile_0020.png');
                enemy.body.enable = false;
                if (this.bugDeathSound) this.bugDeathSound.play({ volume: 0.7 });
                this.time.delayedCall(350, () => {
                    enemy.disableBody(true, true);
                });
                player.body.setVelocityY(this.JUMP_VELOCITY * 0.7);
            } else if (overlap) {
                if (this.deathSound) this.deathSound.play({ volume: 0.7 });
                if (this.playerHealth > 0) {
                    this.playerHealth--;
                    this.events.emit('updateHealth', this.playerHealth);
                    if (this.playerHealth <= 0) {
                        this.events.emit('updateHealth', this.playerHealth);
                        this.scene.restart();
                        return;
                    }
                }
                player.setPosition(15, 276);
                player.body.setVelocity(0, 0);
            }
        });

        // --- Player & Shoot Enemy collision logic ---
        this.physics.add.overlap(my.sprite.player, this.shootEnemy, (player, enemy) => {
            // Shrink player hitbox for enemy collision
            const playerHitbox = {
                x: player.body.x + player.body.width * 0.15,
                y: player.body.y + player.body.height * 0.15,
                width: player.body.width * 0.7,
                height: player.body.height * 0.7
            };
            const enemyHitbox = {
                x: enemy.body.x,
                y: enemy.body.y,
                width: enemy.body.width,
                height: enemy.body.height
            };

            // Check if player is falling and above enemy (stomp)
            const playerBottom = player.body.y + player.body.height;
            const enemyTop = enemy.body.y + 5;
            const playerFalling = player.body.velocity.y > 0;

            const overlap =
                playerHitbox.x < enemyHitbox.x + enemyHitbox.width &&
                playerHitbox.x + playerHitbox.width > enemyHitbox.x &&
                playerHitbox.y < enemyHitbox.y + enemyHitbox.height &&
                playerHitbox.y + playerHitbox.height > enemyHitbox.y;

            if (playerFalling && playerBottom <= enemyTop + 10) {
                enemy.anims.stop();
                enemy.body.enable = false;
                if (this.bugDeathSound) this.bugDeathSound.play({ volume: 0.7 });
                this.time.delayedCall(350, () => {
                    enemy.disableBody(true, true);
                });
                player.body.setVelocityY(this.JUMP_VELOCITY * 0.7);
            } else if (overlap) {
                if (this.deathSound) this.deathSound.play({ volume: 0.7 });
                if (this.playerHealth > 0) {
                    this.playerHealth--;
                    this.events.emit('updateHealth', this.playerHealth);
                    if (this.playerHealth <= 0) {
                        this.events.emit('updateHealth', this.playerHealth);
                        this.scene.restart();
                        return;
                    }
                }
                player.setPosition(15, 276);
                player.body.setVelocity(0, 0);
            }
        });

        // Walking sound effects
        this.footstepSounds = [
            this.sound.add("footstep1"),
            this.sound.add("footstep2")
        ];
        this.lastFootstepTime = 0;
        this.footstepInterval = 220; // ms between footsteps

        // Bug death sound effect
        this.bugDeathSound = this.sound.add("bugDeath");

        // Death sound effect (was spikeHitSound)
        this.deathSound = this.sound.add("spikeHit");

        // Pickup sound effects
        this.donutPickupSound = this.sound.add("donutPickup");
        this.heartPickupSound = this.sound.add("heartPickup");

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
            my.vfx.walking.startFollow(my.sprite.player, -my.sprite.player.displayWidth/2 + 2, my.sprite.player.displayHeight/2-5, false);
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

        // Bug Enemy pacing logic
        if (this.bugEnemy && this.bugEnemy.active) {
            // If stopped (velocity is 0), force a direction
            if (this.bugEnemy.body.velocity.x === 0) {
                // If blocked on left, go right; if blocked on right, go left; else pick right
                if (this.bugEnemy.body.blocked.left) {
                    this.bugEnemy.setVelocityX(60);
                    this.bugEnemy.setFlipX(true);
                } else if (this.bugEnemy.body.blocked.right) {
                    this.bugEnemy.setVelocityX(-60);
                    this.bugEnemy.setFlipX(false);
                } else {
                    // Not blocked, but stopped: pick a direction (default right)
                    this.bugEnemy.setVelocityX(60);
                    this.bugEnemy.setFlipX(true);
                }
            }
            // Reverse direction if at min/max X
            if (this.bugEnemy.x <= this.bugEnemy.minX) {
                this.bugEnemy.setVelocityX(60);
                this.bugEnemy.setFlipX(true);
            } else if (this.bugEnemy.x >= this.bugEnemy.maxX) {
                this.bugEnemy.setVelocityX(-60);
                this.bugEnemy.setFlipX(false);
            }
            // Reverse direction if blocked by wall
            if (this.bugEnemy.body.blocked.left) {
                this.bugEnemy.setVelocityX(60);
                this.bugEnemy.setFlipX(true);
            } else if (this.bugEnemy.body.blocked.right) {
                this.bugEnemy.setVelocityX(-60);
                this.bugEnemy.setFlipX(false);
            }

            // Play walk animation if moving, idle if stopped
            if (Math.abs(this.bugEnemy.body.velocity.x) > 0) {
                if (this.bugEnemy.anims.currentAnim && this.bugEnemy.anims.currentAnim.key !== 'bug_walk') {
                    this.bugEnemy.anims.play('bug_walk');
                }
            } else {
                if (this.bugEnemy.anims.currentAnim && this.bugEnemy.anims.currentAnim.key !== 'bug_idle') {
                    this.bugEnemy.anims.play('bug_idle');
                }
            }
        }

        // New Enemy Type pacing logic
        if (this.bugEnemy2 && this.bugEnemy2.active) {
            if (this.bugEnemy2.body.velocity.x === 0) {
                if (this.bugEnemy2.body.blocked.left) {
                    this.bugEnemy2.setVelocityX(60);
                    this.bugEnemy2.setFlipX(true);
                } else if (this.bugEnemy2.body.blocked.right) {
                    this.bugEnemy2.setVelocityX(-60);
                    this.bugEnemy2.setFlipX(false);
                } else {
                    this.bugEnemy2.setVelocityX(60);
                    this.bugEnemy2.setFlipX(true);
                }
            }
            if (this.bugEnemy2.x <= this.bugEnemy2.minX) {
                this.bugEnemy2.setVelocityX(60);
                this.bugEnemy2.setFlipX(true);
            } else if (this.bugEnemy2.x >= this.bugEnemy2.maxX) {
                this.bugEnemy2.setVelocityX(-60);
                this.bugEnemy2.setFlipX(false);
            }
            if (this.bugEnemy2.body.blocked.left) {
                this.bugEnemy2.setVelocityX(60);
                this.bugEnemy2.setFlipX(true);
            } else if (this.bugEnemy2.body.blocked.right) {
                this.bugEnemy2.setVelocityX(-60);
                this.bugEnemy2.setFlipX(false);
            }
            if (Math.abs(this.bugEnemy2.body.velocity.x) > 0) {
                if (this.bugEnemy2.anims.currentAnim && this.bugEnemy2.anims.currentAnim.key !== 'bug_walk') {
                    this.bugEnemy2.anims.play('bug_walk');
                }
            } else {
                if (this.bugEnemy2.anims.currentAnim && this.bugEnemy2.anims.currentAnim.key !== 'bug_idle') {
                    this.bugEnemy2.anims.play('bug_idle');
                }
            }
        }

        // --- Shoot Enemy logic: stay fixed in position ---
        if (this.shootEnemy && this.shootEnemy.active) {
            this.shootEnemy.setVelocityX(0);
            this.shootEnemy.setVelocityY(0);
            this.shootEnemy.x = 1265;
            this.shootEnemy.y = 218;

            // Fire projectile every 5 seconds
            if (!this.shootEnemyLastFired || this.time.now - this.shootEnemyLastFired > this.shootEnemyFireInterval) {
                const projectile = this.shootProjectiles.create(this.shootEnemy.x - 20, this.shootEnemy.y, "platformer_characters", "tile_0008.png");
                projectile.setVelocityX(-200);
                projectile.setGravityY(0);
                projectile.setScale(.5);
                projectile.setCollideWorldBounds(false);
                projectile.body.allowGravity = false;
                projectile.setDepth(5);
                this.shootEnemyLastFired = this.time.now;
            }
        }

        // --- Second Shoot Enemy logic: stay fixed in position ---
        if (this.shootEnemy2 && this.shootEnemy2.active) {
            this.shootEnemy2.setVelocityX(0);
            this.shootEnemy2.setVelocityY(0);
            this.shootEnemy2.x = 1537;
            this.shootEnemy2.y = 326;

            // Fire projectile every 5 seconds
            if (!this.shootEnemy2LastFired || this.time.now - this.shootEnemy2LastFired > this.shootEnemy2FireInterval) {
                const projectile = this.shootProjectiles.create(this.shootEnemy2.x - 20, this.shootEnemy2.y, "platformer_characters", "tile_0008.png");
                projectile.setVelocityX(-200);
                projectile.setGravityY(0);
                projectile.setScale(.5);
                projectile.setCollideWorldBounds(false);
                projectile.body.allowGravity = false;
                projectile.setDepth(5);
                this.shootEnemy2LastFired = this.time.now;
            }
        }

        // Destroy projectiles that go out of bounds
        this.shootProjectiles.children.each((proj) => {
            if (proj.x < 0 || proj.x > this.physics.world.bounds.width || proj.y < 0 || proj.y > this.physics.world.bounds.height) {
                proj.destroy();
            }
        });

        // Play walking sound effect if moving on ground
        if (
            (cursors.left.isDown || cursors.right.isDown) &&
            my.sprite.player.body.blocked.down
        ) {
            const now = this.time.now;
            if (now - this.lastFootstepTime > this.footstepInterval) {
                Phaser.Utils.Array.GetRandom(this.footstepSounds).play({ volume: 0.5 });
                this.lastFootstepTime = now;
            }
        }
    }
}