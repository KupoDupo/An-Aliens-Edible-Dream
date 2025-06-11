class oceanFloor extends Phaser.Scene {
    constructor() {
        super("oceanFloor");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 120; // lower for floatier underwater movement
        this.DRAG = 600;         // lower drag for more glide
        this.physics.world.gravity.y = 200; // lower gravity for floaty jumps (lowered from 400)
        this.JUMP_VELOCITY = -75; // less negative for slower, higher jump (raised from -250)
        this.PARTICLE_VELOCITY = 30;
        this.SCALE = 2.0; // This is the camera zoom scale (e.g., 2.0 for 2x zoom)
    }

    create() {
        // --- Fix: Use correct tilemap key ---
        this.map = this.add.tilemap("oceanMap");

        // --- Fix: Use correct tileset image key ---
        this.tileset = [
            this.map.addTilesetImage("dessert", "dessert_tiles"), // If your Tiled map uses "dessert", keep this
            this.map.addTilesetImage("tilemap_packed", "tilemap_tiles"), 
        ];

        // --- Fix: Only create layers if they exist in the map ---
        const layerNames = this.map.layers.map(l => l.name);
        if (layerNames.includes("Water")) {
            this.bgLayer = this.map.createLayer("Water", this.tileset, 0, 0);
        }
        if (layerNames.includes("Pipes")) {
            this.pipeLayer = this.map.createLayer("Pipes", this.tileset, 0, 0);
        }
        if (layerNames.includes("Grounds")) {
            this.platformLayer = this.map.createLayer("Grounds", this.tileset, 0, 0);
        }
        if (layerNames.includes("BlueTint")) {
            this.tintLayer = this.map.createLayer("BlueTint", this.tileset, 0, 0);
            this.tintLayer.setDepth(12);
        }

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
        this.pipeLayer.setCollision(false);

        const heartObjects = this.map.createFromObjects("Objects", {
            name: "heart",
            key: "tilemap_sheet",
            frame: 44,
        })

        // Collect donut object data and create Sprites:
        const donutObjects = this.map.createFromObjects("Objects", {
            name: "donut",
            key: "dessert_sheet",
        });

        // --- Fix: Only create donut_spin animation if it doesn't exist ---
        if (!this.anims.exists('donut_spin')) {
            this.anims.create({
                key: 'donut_spin',
                frames: this.anims.generateFrameNumbers('dessert_sheet', { start: 13, end: 14 }),
                frameRate: 2,
                repeat: -1
            });
        }

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
        this.spikes = this.map.createFromObjects("Objects", {
            name: "spike",
            key: "dessert_sheet",
            frame: 105,
        });
        this.physics.world.enable(this.spikes, Phaser.Physics.Arcade.STATIC_BODY);
        this.spikes.forEach(obj => obj.visible = true);
        this.spikeGroup = this.add.group(this.spikes);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(40, 160, "platformer_characters", "tile_0004.png");
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
            // --- Update donut counter UI if needed ---
            if (this.scene.isActive('UIScene')) {
                const uiScene = this.scene.get('UIScene');
                if (uiScene && typeof uiScene.updateDonutUI === 'function') {
                    uiScene.updateDonutUI();
                }
            }
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
            // --- Update donut counter UI ---
            if (this.scene.isActive('UIScene')) {
                const uiScene = this.scene.get('UIScene');
                if (uiScene && typeof uiScene.updateDonutUI === 'function') {
                    uiScene.updateDonutUI();
                }
            }
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
            // Only allow collection if playerHealth < this.playerMaxHealth
            if (this.playerHealth < this.playerMaxHealth) {
                obj2.destroy();
                my.vfx.heartCollect.emitParticle(1, obj2.x, obj2.y);
                if (this.heartPickupSound) this.heartPickupSound.play({ volume: 1.0 });
                this.playerHealth = Math.min(this.playerHealth + 1, this.playerMaxHealth);
                this.events.emit('updateHealth', this.playerHealth);
                // --- Update health UI ---
                if (this.scene.isActive('UIScene')) {
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene && typeof uiScene.updateHeartsUI === 'function') {
                        uiScene.updateHeartsUI();
                    }
                }
            }
            // If at max health, do nothing (heart remains)
        });

        // --- Spike collision: reset player to spawn point and lose health ---
        this.physics.add.overlap(my.sprite.player, this.spikeGroup, () => {
            if (this.deathSound) this.deathSound.play({ volume: 0.7 });
            if (this.playerHealth > 0) {
                this.playerHealth--;
                this.events.emit('updateHealth', this.playerHealth); // Update UI on health change
                // --- Update health UI ---
                if (this.scene.isActive('UIScene')) {
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene && typeof uiScene.updateHeartsUI === 'function') {
                        uiScene.updateHeartsUI();
                    }
                }
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

        // --- Exit setup for Pipes---
        this.pipeLeft = this.map.createFromObjects("Objects", {
            name: "pipe1",
            key: "tilemap_sheet",
            frame: 134,          
        });
        this.pipeRight = this.map.createFromObjects("Objects", {
            name: "pipe2",
            key: "tilemap_sheet",
            frame: 134,          
        });
        // Combine both pipes into one group
        const allPipes = [...this.pipeLeft, ...this.pipeRight];
        this.physics.world.enable(allPipes, Phaser.Physics.Arcade.STATIC_BODY);
        this.exitGroup = this.add.group(allPipes);

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
        // Remove walking particle effect for underwater
        // my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
        //     frame: ['smoke_03.png', 'smoke_09.png'],
        //     scale: { start: 0.03, end: 0.1 },
        //     lifespan: 350,
        //     alpha: { start: 1, end: 0.1 }, 
        // });
        // my.vfx.walking.stop();
        
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

        // Ensure UIScene is running and visible when oceanFloor starts
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        } else {
            this.scene.setVisible(true, 'UIScene');
        }

        /*// --- Bug Enemy setup: pacing between x=333 and x=450 ---
        this.bugEnemy = this.physics.add.sprite(333, 380, "platformer_characters", "tile_0018.png");
        this.bugEnemy.setCollideWorldBounds(true);
        this.bugEnemy.setVelocityX(60); // initial speed to the right
        this.bugEnemy.maxX = 450;
        this.bugEnemy.minX = 333; // <-- add this line to avoid undefined
        this.bugEnemy.body.allowGravity = true;
        this.bugEnemy.setDepth(10);
        this.bugEnemy.setFlipX(true);

        // Only play bug_walk if the animation exists
        if (this.anims.exists('bug_walk')) {
            this.bugEnemy.anims.play('bug_walk');
        }

        // Enemy collides with platforms
        this.physics.add.collider(this.bugEnemy, this.platformLayer);

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
                player.setPosition(29, 350); // Reset player to spawn point
                player.body.setVelocity(0, 0);
            }
        });
        */

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
        if (cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // Remove walking vfx underwater
            // my.vfx.walking.startFollow(...);
            // my.vfx.walking.setParticleSpeed(...);
            // if (my.sprite.player.body.blocked.down) {
            //     my.vfx.walking.start();
            // }
        } else if (cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // Remove walking vfx underwater
            // my.vfx.walking.startFollow(...);
            // my.vfx.walking.setParticleSpeed(...);
            // if (my.sprite.player.body.blocked.down) {
            //     my.vfx.walking.start();
            // }
        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // my.vfx.walking.stop();
        }

        // Player jump logic (allow repeated up arrow taps to move up)
        if (cursors.up.isDown) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            my.sprite.player.anims.play('jump');
        }

        // Restart scene on R key
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        /*// Bug Enemy pacing logic
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
        }*/

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