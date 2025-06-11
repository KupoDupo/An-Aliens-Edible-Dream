class Ending extends Phaser.Scene {
    constructor() {
        super("Ending");
    }

    init(data) {
        // Expect data.donutsCollected to be passed in
        this.donutsCollected = data && data.donutsCollected ? data.donutsCollected : 0;
    }

    create() {
        // Set background color to lime green
        this.cameras.main.setBackgroundColor('#32cd32');

        // Center coordinates
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Show player sprite in center with walking animation
        this.player = this.add.sprite(centerX, centerY, "platformer_characters", "tile_0004.png");
        this.player.setScale(2);
        this.player.setDepth(10);
        this.player.anims.play("walk");

        // Show total donuts collected
        this.add.text(centerX, centerY + 100, `Total Donuts Collected: ${this.donutsCollected}`, {
            fontFamily: "Arial",
            fontSize: 32,
            color: "#fff",
            stroke: "#000",
            strokeThickness: 4
        }).setOrigin(0.5);

        // Show "The End" text
        this.add.text(centerX, centerY - 120, "The End", {
            fontFamily: "Arial",
            fontSize: 48,
            color: "#fff",
            stroke: "#000",
            strokeThickness: 6
        }).setOrigin(0.5);

        // Optionally, restart game on key press
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start("Level1");
        });

        this.add.text(centerX, centerY + 160, "Press SPACE to play again", {
            fontFamily: "Arial",
            fontSize: 20,
            color: "#fff",
            stroke: "#000",
            strokeThickness: 3
        }).setOrigin(0.5);
    }
}
