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
        // Hide UI if in Ending scene
        if (this.scene.isActive('Ending')) {
            this.scene.setVisible(false);
            return;
        } else {
            this.scene.setVisible(true);
        }

        // --- Donut Counter UI (top-right) ---
        this.donutBg = this.add.graphics().setDepth(999).setScrollFactor(0);
        this.donutBg.isDonutBg = true; // tag for updateDonutUI

        this.donutIcon = this.add.image(0, 0, "dessert_sheet", 14)
            .setOrigin(1, 0) // top-right
            .setScale(2)
            .setScrollFactor(0)
            .setDepth(1000);

        // --- Health Bar UI (top-left) ---
        this.heartBg = this.add.graphics().setDepth(999).setScrollFactor(0);
        this.heartBg.isHeartBg = true; // tag for updateHeartsUI

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
        const bgPadding = 8;

        // Place donutIcon in top-right
        this.donutIcon.x = cam.worldView.right - margin;
        this.donutIcon.y = cam.worldView.top + margin;

        // Place donutText to the left of donutIcon
        this.donutText.x = this.donutIcon.x - this.donutIcon.displayWidth - donutTextSpacing;
        this.donutText.y = this.donutIcon.y;

        // Adjust outline rectangle to fit behind icon and text
        const bgWidth = this.donutIcon.displayWidth + this.donutText.displayWidth + donutTextSpacing + bgPadding * 2;
        const bgHeight = Math.max(this.donutIcon.displayHeight, this.donutText.displayHeight) + bgPadding * 2;
        const bgX = this.donutIcon.x + bgPadding - 2; // fudge for border
        const bgY = this.donutIcon.y - bgPadding;

        // Draw orange fill and outline with rounded corners
        this.donutBg.clear();
        this.donutBg.fillStyle(0xffa500, 0.3); // orange fill, semi-transparent
        this.donutBg.fillRoundedRect(bgX - bgWidth, bgY, bgWidth, bgHeight, 12);
        this.donutBg.lineStyle(3, 0xffa500, 1); // orange outline
        this.donutBg.strokeRoundedRect(bgX - bgWidth, bgY, bgWidth, bgHeight, 12);
    }

    updateHeartsUI() {
        // --- Health Bar UI (top-left) ---
        const cam = this.cameras.main;
        const margin = 20;
        const bgPadding = 8;
        let maxRight = 0;
        let maxBottom = 0;
        for (let i = 0; i < this.heartIcons.length; i++) {
            this.heartIcons[i].x = cam.worldView.left + margin + i * (this.heartIcons[i].displayWidth + 10);
            this.heartIcons[i].y = cam.worldView.top + margin;
            if (i < this.playerHealth) {
                this.heartIcons[i].setAlpha(1);
                this.heartIcons[i].setFrame(44);
            } else {
                this.heartIcons[i].setFrame(46);
                this.heartIcons[i].setAlpha(1);
            }
            maxRight = Math.max(maxRight, this.heartIcons[i].x + this.heartIcons[i].displayWidth);
            maxBottom = Math.max(maxBottom, this.heartIcons[i].y + this.heartIcons[i].displayHeight);
        }
        // Adjust outline rectangle to fit behind hearts
        const bgX = cam.worldView.left + margin - bgPadding;
        const bgY = cam.worldView.top + margin - bgPadding;
        const bgWidth = (maxRight - cam.worldView.left - margin) + bgPadding * 2;
        const bgHeight = (maxBottom - cam.worldView.top - margin) + bgPadding * 2;

        this.heartBg.clear();
        this.heartBg.fillStyle(0xffa500, 0.3); // orange fill, semi-transparent
        this.heartBg.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, 12);
        this.heartBg.lineStyle(3, 0xffa500, 1); // orange outline
        this.heartBg.strokeRoundedRect(bgX, bgY, bgWidth, bgHeight, 12);
    }

    update() {
        // Hide UI if in Ending scene
        if (this.scene.isActive('Ending')) {
            this.scene.setVisible(false);
            return;
        } else {
            this.scene.setVisible(true);
        }

        // Hook up events to Level1, Level2, and oceanFloor only once, after any is running
        if (!this._eventsHooked) {
            const level1 = this.scene.get('Level1');
            const level2 = this.scene.get('Level2');
            const oceanFloor = this.scene.get('oceanFloor');
            const hookEvents = (level) => {
                if (!level) return;
                level.events.on('updateDonuts', (count) => {
                    this.donutsCollected = count;
                    this.donutText.setText(`x${this.donutsCollected}`);
                    this.updateDonutUI();
                });
                level.events.on('updateHealth', (health) => {
                    this.playerHealth = health;
                    this.updateHeartsUI();
                });
                level.events.on('setMaxHealth', (max) => {
                    this.playerMaxHealth = max;
                    // Add new heart icons if needed
                    while (this.heartIcons.length < this.playerMaxHealth) {
                        let heart = this.add.image(0, 0, "tilemap_sheet", 44)
                            .setOrigin(0, 0)
                            .setScale(2)
                            .setScrollFactor(0)
                            .setDepth(1000);
                        this.heartIcons.push(heart);
                    }
                    // Remove extra icons if max health decreased (optional)
                    while (this.heartIcons.length > this.playerMaxHealth) {
                        let heart = this.heartIcons.pop();
                        heart.destroy();
                    }
                    this.updateHeartsUI();
                });
            };
            if (level1) hookEvents(level1);
            if (level2) hookEvents(level2);
            if (oceanFloor) hookEvents(oceanFloor);
            if (level1 || level2 || oceanFloor) this._eventsHooked = true;
        }
        // Keep UI in correct position if camera moves
        this.updateDonutUI();
        this.updateHeartsUI();
    }
}