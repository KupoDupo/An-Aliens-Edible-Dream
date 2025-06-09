class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
        
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        // this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);
        this.map = this.add.tilemap("platformer-final-lvl1", 18, 18, 90, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = [
            this.map.addTilesetImage("tilemap_packed_dessert", "dessert_tiles"),
            this.map.addTilesetImage("tilemap_packed", "tilemap_tiles"),
            this.map.addTilesetImage("crop_backgrounds_packed", "background_tiles")
        ];

        // Create a layer
        this.bgLayer = this.map.createLayer("Backgrounds", this.tileset, 0, 0);
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);
        this.prettyLayer = this.map.createLayer("Pretty-Stuffs", this.tileset, 0, 0);


        // Make it collidable
        this.bgLayer.setCollisionByProperty({
            collides: true
        });

        this.platformLayer.setCollisionByProperty({
            collides: true
        });

        this.prettyLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Donuts-Candy", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.donuts = this.map.createFromObjects("Donuts-Candy", {
            name: "donut",
            key: "dessert_sheet",
            frame: 14
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.donuts, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        this.donutGroup = this.add.group(this.donuts);

        // Find water tiles
        /* this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });*/

        ////////////////////
        // Water bubble particle effect here
        // It's OK to have it start running (what I did)
        ////////////////////
        // flame_01.png (1-4) would be good for water bubbling
        // use let water of this.waterTiles not let water in this.waterTiles since former gets you the actual water tile while the latter gets you the index in the array 
        // have to say water.pixelX and water.pixelY to get the pixel coordinates of the tile
        // water.x and water.y are the tilemap coordinates (in tiles) of the tile - won't reflect actual position in game
        /*my.vfx.waterBubbling = [];
        for (let water of this.waterTiles) {
            let centerX = water.pixelX + this.map.tileWidth / 2;
            let centerY = water.pixelY + this.map.tileHeight / 2;
            let emitter = this.add.particles(centerX, centerY, "kenny-particles", {
                    frame: ['circle_01.png', 'circle_02.png', 'circle_03.png'],
                    random: true, // tells Phaser to randomly pick a frame from the frame array for each particle emitted - helps it look more natural
                    scale: {start: 0.03, end: 0.07},
                    lifespan: 800,
                    alpha: {start: 1, end: 0.1},
                    emitting: false, // don't emit continuously - why it looked so bad at first
                    speedY: { min: -40, max: -80 }, // speed of particles in y direction - negative because we want them to go up
                    gravityY: 0, // no gravity on particles - phaser's world gravity set in this file pulls all physics objects down but we don't want that to happen here 
                });
                my.vfx.waterBubbling.push(emitter);
        }

        this.time.addEvent({
            delay: 50, // how often to bubble up (ms)
            loop:true,
            callback: () => {
                if (my.vfx.waterBubbling.length > 0) {
                    let emitter = Phaser.Utils.Array.GetRandom(my.vfx.waterBubbling);
                    emitter.explode(Phaser.Math.Between(1, 3));
                }
            }
        })*/


        // set up player avatar
        my.sprite.player = this.physics.add.sprite(50, 10, "platformer_characters", "tile_0004.png");
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setDepth(10);

        // Enable collision handling
        // Only collide with the platformLayer
        this.physics.add.collider(my.sprite.player, this.platformLayer);


        // Coin collect particle effect here
        // Important: make sure it's not running
        // "light_03.png" (1-3) would be good for coin collect
        // parameters: 0, 0 are the initial x and y position of the particle emitter (don't matter cause we pause it immediately and adjust these to other places when we call again)
        // "kenny-particles" is the key of the particle texture atlas (or can be the image to use for the particles) - must be preloaded 
        // the {} is the configuration object for the emitter (if empty it uses all default settings - isn't empty here cause we create our own settings for the vfx)
        my.vfx.coinCollect = this.add.particles(0,0, "kenny-particles", {
            frame: ['light_01.png', 'light_02.png', 'light_03.png'],
            scale: {start: 0.03, end: 0.1},
            lifespan: 500,
            alpha: {start: 1, end: 0.1},
        });
        // Stop it immediately - don't want it running 24/7 just during collision which is handled in arrow function below
        my.vfx.coinCollect.stop();


        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            // Start the coin collect particle effect here
            // This line emits (creates) one particle from the coinCollect particle emitter 
            // at the position (x,y) of obj2 (the collected coin)
            my.vfx.coinCollect.emitParticle(1, obj2.x, obj2.y);
        });

        my.vfx.donutCollect = this.add.particles(0,0, "kenny-particles", {
            frame: ['light_01.png', 'light_02.png', 'light_03.png'],
            scale: {start: 0.03, end: 0.1},
            lifespan: 500,
            alpha: {start: 1, end: 0.1},
        });
        // Stop it immediately - don't want it running 24/7 just during collision which is handled in arrow function below
        my.vfx.donutCollect.stop();


        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.donutGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            // Start the coin collect particle effect here
            // This line emits (creates) one particle from the coinCollect particle emitter 
            // at the position (x,y) of obj2 (the collected coin)
            my.vfx.donutCollect.emitParticle(1, obj2.x, obj2.y);
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // Movement vfx here
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        

    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // Particle following code here
            //This controls the emitter to follow the player avatar - set emitter location to right hand side of avatar (moving left, emit right)
            // set the offset location to be just above ground level (my.sprite.player.displayHeight/2-5) and just by avatar's feet (my.sprite.player.displayWidth/2-10)
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            // speed of particles is positive because we want them to move right (positive x direction)
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            // Only play smoke effect if touching the ground - don't want player emitting smoke changing direction in air
            // he does emit this smoke when he jumps though which makes it look like he's farting and it propels him lmao 
            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // Particle following code here
            my.vfx.walking.startFollow(my.sprite.player, -my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            // speed of particles is negative because we want them to move left (negative x direction)
            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // Have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}