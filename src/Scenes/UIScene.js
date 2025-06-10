class UIScene extends Phaser.Scene
{
    constructor ()
    {
        super({ key: 'UIScene' }); // <-- Remove 'active: true'

        this.score = 0;

        this.donutsCollected = 0;
        this.playerMaxHealth = 3;
        this.playerHealth = 3;
        this.heartIcons = [];

        this._eventsHooked = false;
    }

    create ()
    {

        // --- Donut Counter UI (top-right) ---
        this.donutIcon = this.add.image(0, 0, "dessert_sheet", 14)
            .setOrigin(1, 0) // top-right
            .setScale(2)
            .setScrollFactor(0)
            .setDepth(1000);

        // --- Health Bar UI (top-left) ---
        this.heartIcons = [];
        for (let i = 0; i < this.playerMaxHealth; i++) {
            let heart = this.add.image(0, 0, "tilemap_sheet", 44)
                .setOrigin(0, 0) // top-left
                .setScale(2)
                .setScrollFactor(0)
                .setDepth(1000);
            this.heartIcons.push(heart);
        }
        
        this.donutText = this.add.text(0, 0, `x${this.donutsCollected}`,
            { font: '18px Arial Black', fill: '#fff', stroke: '#000', strokeThickness: 4 })
            .setOrigin(1, 0) // top-right
            .setScrollFactor(0)
            .setDepth(1000);



        // Initial UI update
        this.updateDonutUI();
        this.updateHeartsUI();

        // --- Ensure textures are loaded before creating UI ---
        // Phaser automatically shares loaded textures between scenes.
        // You do NOT need to call addTilesetImage or createLayer in UIScene.
        // But you MUST make sure UIScene is started AFTER Load and Level1,
        // or at least after the textures are loaded.

        // If you still get "__MISSING" errors, make sure:
        // 1. UIScene is NOT started before Load finishes.
        // 2. The asset keys ("tilemap_sheet", "dessert_sheet") match those in Load.js.
        // 3. The spritesheets are loaded as shown in Load.js.

        // If you want to be extra safe, you can delay UI creation until textures are ready:
        if (!this.textures.exists("tilemap_sheet") || !this.textures.exists("dessert_sheet")) {
            this.scene.sleep();
            this.scene.get('Level1').events.once('create', () => {
                this.scene.wake();
                this.scene.restart();
            });
            return;
        }
    }

    updateDonutUI() {
        // --- Donut Counter UI (top-right) ---
        const cam = this.cameras.main;
        const margin = 20;
        const donutTextSpacing = 8;

        // Place donutIcon in top-right
        this.donutIcon.x = cam.worldView.right - margin;
        this.donutIcon.y = cam.worldView.top + margin;

        // Place donutText to the left of donutIcon
        this.donutText.x = this.donutIcon.x - this.donutIcon.displayWidth - donutTextSpacing;
        this.donutText.y = this.donutIcon.y;
    }

    updateHeartsUI() {
        // --- Health Bar UI (top-left) ---
        const cam = this.cameras.main;
        const margin = 20;
        for (let i = 0; i < this.heartIcons.length; i++) {
            this.heartIcons[i].x = cam.worldView.left + margin + i * (this.heartIcons[i].displayWidth + 10);
            this.heartIcons[i].y = cam.worldView.top + margin;
            if (i < this.playerHealth) {
                this.heartIcons[i].setAlpha(1);
            } else {
                this.heartIcons[i].setFrame(46);
                this.heartIcons[i].setAlpha(1);
            }
        }
    }

    update() {
        // Hook up events to Level1 only once, after Level1 is running
        if (!this._eventsHooked) {
            const level1 = this.scene.get('Level1');
            if (level1) {
                level1.events.on('updateDonuts', (count) => {
                    this.donutsCollected = count;
                    this.donutText.setText(`x${this.donutsCollected}`);
                    this.updateDonutUI();
                });
                level1.events.on('updateHealth', (health) => {
                    this.playerHealth = health;
                    this.updateHeartsUI();
                });
                level1.events.on('setMaxHealth', (max) => {
                    this.playerMaxHealth = max;
                });
                this._eventsHooked = true;
            }
        }
        // Keep UI in correct position if camera moves
        this.updateDonutUI();
        this.updateHeartsUI();
    }
}