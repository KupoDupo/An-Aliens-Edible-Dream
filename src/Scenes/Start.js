class Start extends Phaser.Scene {
    constructor() {
        super("Start");
    }

    init() {
    }

    create() {
        // Set background color to pale green
        this.cameras.main.setBackgroundColor('#dbf3c9');

        // Center coordinates
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Show player sprite in center with walking animation
        this.player = this.add.sprite(centerX, centerY, "platformer_characters", "tile_0004.png");
        this.player.setScale(2);
        this.player.setDepth(10);
        this.player.anims.play("walk");

        // Show Game Title 
        this.add.text(centerX, centerY - 120, "The Alien's Escape From The Edible Forest", {
            fontFamily: "Arial",
            fontSize: 48,
            color: "#fff",
            stroke: "#000",
            strokeThickness: 6
        }).setOrigin(0.5);

        // Play Game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start("Level1");
        });

        this.add.text(centerX, centerY + 80, "Press SPACE to play", {
            fontFamily: "Arial",
            fontSize: 20,
            color: "#fff",
            stroke: "#000",
            strokeThickness: 3
        }).setOrigin(0.5);
    }
}