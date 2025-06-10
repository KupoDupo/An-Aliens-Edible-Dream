class UIScene extends Phaser.Scene
{
    constructor ()
    {
        super({ key: 'UIScene', active: true });

        this.score = 0;

        this.donutsCollected = 0;
        this.playerMaxHealth = 3;
        this.playerHealth = 3;
        this.heartIcons = [];

        this._eventsHooked = false;
    }

    create ()
    {

        // --- Donut Counter UI ---
        this.donutIcon = this.add.image(0, 0, "dessert_sheet", 14)
            .setOrigin(0, 1)
            .setScale(1.2)
            .setScrollFactor(0)
            .setDepth(1000);

        this.donutText = this.add.text(0, 0, `x${this.donutsCollected}`,
            { font: '28px Arial Black', fill: '#fff', stroke: '#000', strokeThickness: 4 })
            .setOrigin(0, 1)
            .setScrollFactor(0)
            .setDepth(1000);

        this.donutScoreBg = this.add.rectangle(0, 0, 120, 50, 0x000000, 0.5)
            .setOrigin(0, 1)
            .setScrollFactor(0)
            .setDepth(999);

        // --- Health Bar UI ---
        // Use frame 0 for full heart, 1 for empty heart (adjust as needed)
        const FULL_HEART_FRAME = 44;   // Change to correct frame index for full heart
        const EMPTY_HEART_FRAME = 46;  // Change to correct frame index for empty heart

        for (let i = 0; i < this.playerMaxHealth; i++) {
            let heart = this.add.image(0, 0, "tilemap_sheet", FULL_HEART_FRAME)
                .setOrigin(0, 1)
                .setScale(1.2)
                .setScrollFactor(0)
                .setDepth(1000);
            this.heartIcons.push(heart);
        }

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
        // Layout donut UI at bottom-left, after hearts
        const cam = this.cameras.main;
        const heartMargin = 20;
        const donutIconSpacing = 20;
        const donutTextSpacing = 8;
        const donutBgPadding = 10;

        // Heart icons width
        let heartWidth = this.heartIcons.length > 0 ? this.heartIcons[0].displayWidth : 0;
        let donutIconX = cam.worldView.left + heartMargin + this.heartIcons.length * (heartWidth + 10) + donutIconSpacing;
        let donutIconY = cam.worldView.bottom - heartMargin;

        this.donutIcon.x = donutIconX;
        this.donutIcon.y = donutIconY;

        this.donutText.x = this.donutIcon.x + this.donutIcon.displayWidth + donutTextSpacing;
        this.donutText.y = this.donutIcon.y + this.donutIcon.displayHeight/2 - this.donutText.displayHeight/2;

        // Adjust background to fit icon and text
        const donutBgWidth = (this.donutText.x + this.donutText.displayWidth) - this.donutIcon.x + donutBgPadding * 2;
        const donutBgHeight = Math.max(this.donutIcon.displayHeight, this.donutText.displayHeight) + donutBgPadding * 2;
        this.donutScoreBg.displayWidth = donutBgWidth;
        this.donutScoreBg.displayHeight = donutBgHeight;
        this.donutScoreBg.x = this.donutIcon.x - donutBgPadding;
        this.donutScoreBg.y = this.donutIcon.y + donutBgPadding;
    }

    updateHeartsUI() {
        const cam = this.cameras.main;
        const heartMargin = 20;
        const FULL_HEART_FRAME = 44;   // Change to correct frame index for full heart
        const EMPTY_HEART_FRAME = 46;  // Change to correct frame index for empty heart
        for (let i = 0; i < this.heartIcons.length; i++) {
            this.heartIcons[i].x = cam.worldView.left + heartMargin + i * (this.heartIcons[i].displayWidth + 10);
            this.heartIcons[i].y = cam.worldView.bottom - heartMargin;
            if (i < this.playerHealth) {
                this.heartIcons[i].setFrame(FULL_HEART_FRAME);
                this.heartIcons[i].setAlpha(1);
            } else {
                this.heartIcons[i].setFrame(EMPTY_HEART_FRAME);
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
                    // (Recreate hearts if needed)
                });
                this._eventsHooked = true;
            }
        }
        // Keep UI in correct position if camera moves
        this.updateDonutUI();
        this.updateHeartsUI();
    }
}