/** 
 * @overview sgc - Simple Game Classes for learning programming. 
 * @author Steve Mattingly <mattinglys@dewv.edu>
 * @version 2.0 (using {@link http://semver.org semantic versioning})
 */

/* global Phaser */

/* 
 * The general approach: class Game wraps the Phaser CE game engine and class
 * Sprite wraps Phaser Sprite, arcade physics, etc. into a simpler API.
 * To hide Phaser's States and their transitions, lots of game configuration 
 * information is cached.
 */

/**
 * A simple computer game. 
 */
class Game {
    /** Creates a new game controller. 
     * @hideconstructor
     */
    constructor() {
        /**
         * @property {number} displayWidth - Width of the game display, in pixels.
         * @public
         */
        this.displayWidth = 800;

        /**
         * @property {number} displayHeight - Height of the game display, in pixels.
         * @public
         */
        this.displayHeight = 600;

        /** 
         * @property {Phaser.Game} _phaserGame - A sophisticated game framework encapsulated by this object.
         * @private
         */
        this._phaserGame = new Phaser.Game(this.displayWidth, this.displayHeight, Phaser.AUTO);

        // Add Phaser states 
        this._phaserGame.state.add("PlayState", new Game.PlayState());
        this._phaserGame.state.add("GameOverState", new Game.GameOverState());

        /** 
         * @property {Object} _cache - Stores configuration information for this Game; largely redundant with Phaser.Game but used, for example, to store data before Phaser has completely booted.
         * @private
         */
        this._cache = {
            /** 
             * @property {Object[]} images - Stores configuration information for image files used in this Game.
             * @private
             */
            images: []
        };

        this.reset();
    }

    /**
     * Re-itializes this Game to begin play, removing any existing Sprites.
     * @public
     */
    reset() {
        /** 
         * @property {Sprite[]} _sprites - The sprites that currently exist within the game.
         * @private
         */
        this._sprites = [];

        /** 
         * @property {Phaser.Sprite[]} _phaserSprites - An array of Phaser sprites to support collision handling.
         * @private
         */
        this._phaserSprites = [];

        /**
         * @property {number} _lastKeyCode - Caches code of last pressed key, allowing sync of Phaser keyboard callbacks with game loop.
         * @private
         */
        this._lastKeyCode = undefined;

        this._phaserGame.state.start("PlayState");
    }

    /**
     * Terminates this game.
     * @argument {string} [message] - An end-of-game message to display.
     * @public
     */
    end(message) {
        this._phaserGame.state.start("GameOverState", true, true, message);
    };

    /**
     * @property {number} score - This game's score. 
     * @public
     */
    set score(value) {
        this._score = value;
        if (this._phaserGame.scoreboard) this._phaserGame.scoreboard.text = " Score: " + this._score + " ";
    }

    get score() {
        return this._score || 0;
    }

    /**
     * Returns elapsed game time.
     * @return {number} The number of seconds elapsed since this game started.
     * @public
     */
    getTime() {
        if (this._phaserGame.time) return this._phaserGame.time.totalElapsedSeconds();
        return 0;
    }

    /**
     * @property {number} frameRate - Playback speed for animations, in frames per second. 
     * @private
     * @readonly
     */
    get frameRate() {
        return 10;
    }

    /**
     * Configures the visual background for this game.
     * @argument {string} image - The name of a preloaded image file to display as the background.
     * @argument {number} [horizontalScroll=0] - The horizontal scroll speed for the background, in pixels per second.
     * @argument {number} [verticalScroll=0] - The vertical scroll speed for the background, in pixels per second.
     */
    setBackground(image, horizontalScroll, verticalScroll) {
        this._cache.background = { image: image, horizontalScroll: horizontalScroll, verticalScroll: verticalScroll };
        if (!this._phaserGame.isBooted) return;
        if (this._phaserBackground) this._phaserBackground.destroy();
        this._phaserBackground = this._phaserGame.add.tileSprite(0, 0, this.displayWidth, this.displayHeight, image);
        this._phaserBackground.sendToBack();

        if (horizontalScroll || verticalScroll) {
            this._phaserBackground.autoScroll(horizontalScroll, verticalScroll);
        }
    }

    /**
     * Creates a new text display area in this game.
     * @argument {number} x - The x coordinate for the new text area object.
     * @argument {number} y - The y coordinate for the new text area object.
     * @return {Object} A new text area object that can be passed to {@linkcode Game#writeToTextArea writeToTextArea}.
     * @public
     * @since 1.7
     */
    createTextArea(x, y) {
        return this._phaserGame.add.text(x, y, "", {
            font: "24px Arial",
            fill: "#ffffff",
            backgroundColor: "#00000048", // black, 75% opaque
            align: "center"
        });
    }

    /** Sets the text content displayed by a text area.
     * @argument {Object} area - A text area object, returned by an earlier call to {@linkcode Game#createTextArea createTextArea}.
     * @argument {string} message - The text to display in the text area.
     * @public
     * @since 1.7
     */
    writeToTextArea(area, message) {
        if (!(area instanceof Phaser.Text)) {
            alert("Warning: writeToTextArea requires a text area previously created by createTextArea.");
        }
        let margin = " ";
        area.text = margin + message + margin;
    }

    /**
     * Determines if a given sprite is active in this game.
     * @argument {Sprite} sprite - A Sprite object.
     * @return {boolean} true if the sprite argument is active in this game; false otherwise.
     * @public
     */
    isActiveSprite(sprite) {
        return this._sprites.indexOf(sprite) >= 0;
    }

    /**
     * Removes a sprite from this game.
     * @argument {Sprite} sprite - A sprite to be removed from this game.
     * @public
     */
    removeSprite(sprite) {
        // Find sgc sprite in array and remove it
        let index = this._sprites.indexOf(sprite);
        if (index < 0) return;
        this._sprites.copyWithin(index, index + 1);
        this._sprites.pop();

        // Find Phaser sprite in array and remove it
        index = this._phaserSprites.indexOf(sprite._phaserSprite);
        this._phaserSprites.copyWithin(index, index + 1);
        this._phaserSprites.pop();

        sprite._phaserSprite.pendingDestroy = true;
        sprite._phaserSprite = undefined;
    }

    /**
     * Preloads an image file, optionally dividing it into frames.
     * @argument {string} fileName - The name of an image file to preload.
     * @argument {number} [width] - The width of frames (if applicable), in pixels.
     * @argument {number} [height] - The height of frames (if applicable), in pixels.
     * @public
     */
    preloadImage(fileName, width, height) {
        this._cache.images.push({ fileName: fileName, width: width, height: height });
    }

    /** 
     * Returns an array of sprites that overlap a specified rectangle.
     * @argument {number} x - The x coordinate of the specified rectangle's upper left corner.
     * @argument {number} y - The y coordinate of the specified rectangle's upper left corner.
     * @argument {number} width - The width of the specified rectangle, in pixels.
     * @argument {number} height - The height of the specified rectangle, in pixels.
     * @argument {Object} [spriteClass] - A class based on the {@linkcode Sprite Sprite} class; if defined, the results will be limited to instances of this class.
     * @public
     * @since 1.8
     */
    getSpritesOverlapping(x, y, width, height, spriteClass) {
        let results = [];
        for (let iSprite = 0; iSprite < this._sprites.length; iSprite++) {
            let sprite = this._sprites[iSprite];
            if ((sprite.x < x + width) && (sprite.x + sprite.width > x) &&
                (sprite.y < y + height) && (sprite.y + sprite.height > y)) {
                if (spriteClass) {
                    if (sprite instanceof spriteClass) {
                        results.push(sprite);
                    }
                } else {
                    results.push(sprite);
                }
            }
        }

        return results;
    }

    /** 
     * Returns the horizontal position of the mouse pointer.
     * @returns {number} The current x-coordinate of the mouse pointer. 
     * @public
     * @since 1.10
     */
    getMouseX() {
        return this._phaserGame.input.mousePointer.x;
    }

    /** 
     * Returns the vertical position of the mouse pointer.
     * @returns {number} The current y-coordinate of the mouse pointer. 
     * @public
     * @since 1.10
     */
    getMouseY() {
        return this._phaserGame.input.mousePointer.y;
    }
}

/** 
 * A game state for active game play. Phaser uses "states" to organize games. A state defines a mode of game behavior.
 * @private
 */
Game.PlayState = class {
    preload() {
        this.load.onFileError.add((key, file) => {
            alert("Error: Unable to load file " + key);
        });

        // Preload images 
        for (let i = 0; i < game._cache.images.length; i++) {
            if (game._cache.images[i].height && game._cache.images[i].width) {
                game._phaserGame.load.spritesheet(game._cache.images[i].fileName, game._cache.images[i].fileName, game._cache.images[i].width, game._cache.images[i].height);
            } else {
                game._phaserGame.load.image(game._cache.images[i].fileName, game._cache.images[i].fileName);
            }
        }
    }

    /**
     * Called by Phaser after `preload()` has completed, and game assets are available.
     * @private
     */
    create() {
        // Enable Phaser's arcade physics system
        game._phaserGame.physics.startSystem(Phaser.Physics.ARCADE);

        // Set up keyboard handling
        this.input.keyboard.addCallbacks(this, () => {
            game._lastKeyCode = this.input.keyboard.lastKey.keyCode;
        });

        // Set up sprites 
        for (let i = 0; i < game._sprites.length; i++) {
            game._sprites[i]._createPhaserSprite();
        }

        // Set up scoreboard if specified in game configuration.
        if (game.showScore) {
            // Create scoreboard text to display.
            game._phaserGame.scoreboard = game._phaserGame.add.text(10, 10, "", {
                font: "24px Arial",
                fill: "#ffffff",
                backgroundColor: "#00000048", // black, 75% opaque
                align: "center"
            });
            game.score = game.score; // to initiate scoreboard display
        }

        if (game._cache.background) game.setBackground(game._cache.background.image, game._cache.background.horizontalScroll, game._cache.background.verticalScroll);
    }

    /**
     * Called by Phaser in each pass of the game loop. 
     * @private
     */
    update() {
        // Update each sprite
        for (let i = 0; i < game._sprites.length; i++) {
            game._sprites[i]._update();
        }

        let collisionCallback = (phaserSprite1, phaserSprite2) => {
            let sprite1 = phaserSprite1.data.sgcSprite;
            let sprite2 = phaserSprite2.data.sgcSprite;
            let allHandlersSayBounce = true;

            // Call first sprite's collision handler, if it exists.
            if (sprite1.handleCollision) {
                allHandlersSayBounce = allHandlersSayBounce && sprite1.handleCollision(sprite2);
            }

            // Call second sprite's collision handler, if it exists and is different from first.
            if (sprite2.handleCollision && sprite2.handleCollision !== sprite1.handleCollision) {
                allHandlersSayBounce = allHandlersSayBounce && sprite2.handleCollision(sprite1);
            }

            return allHandlersSayBounce;
        };
        game._phaserGame.physics.arcade.collide(game._phaserSprites, game._phaserSprites, undefined, collisionCallback);

        if (game._phaserBackground) game._phaserBackground.sendToBack();

        if (game._phaserGame.scoreboard) game._phaserGame.scoreboard.bringToTop();
    }
};

/** 
 * A game state for end of game. Phaser uses "states" to organize games. A state defines a mode of game behavior.
 *  @private
 */
Game.GameOverState = class {
    /**
     * Called by Phaser when the state is activated.
     * @argument {string} [message] - A message to display.
     * @private
     */
    init(message) {
        this.message = message;
    }

    /**
     * Called by Phaser when the state is activated.
     * @private
     */
    create() {
        // Display a game over message, including final score if it exists.
        this.message = this.message || "               Game Over!";
        if (game.showScore) this.message += "\n\n               Your score: " + game.score;
        game._phaserGame.add.text(150, game._phaserGame.height / 2 - 100, this.message, {
            font: "30px Arial",
            fill: "#ffffff",
            align: "center"
        });
    }
};

/**
 * A simple computer game object. 
 */
class Sprite {
    constructor() {
        /**
         * @property {string} name - A name for this Sprite. sgc uses the name only in error messages.
         * @public
         */
        this.name = "An unnamed sprite";

        /**
         * @property {boolean} [accelerateOnBounce=true] - Indicates if this Sprite's motion should be affected when it bounces with another Sprite.
         * @public
         */
        this.accelerateOnBounce = true;

        /**
         * @property {string} _image - The name of the image file to be displayed for this Sprite.
         * @private
         */
        this._image = undefined;

        /**
         * @property {Object} _cache - Stores this Sprite's configuration data; largely redundant with Phaser.Sprite properties, but used for example, to store config before Phaser has fully booted.
         * @private
         */
        this._cache = {
            /**
             * @property {Object[]} animations - Configuration information for this Sprite's animations.
             * @private
             */
            animations: []
        };

        /**
         * @property {Phaser.Sprite} _phaserSprite - The Phaser.Sprite object wrapped by this Sprite.
         * @private
         */
        this._phaserSprite = undefined;

        game._sprites.push(this);
    }

    /**
     * @property {number} x - Horizontal display coordinate of this Sprite.
     * @public
     */
    set x(value) {
        this._cache.x = value;
        if (this._phaserSprite) {
            this._phaserSprite.x = value;
        }
    }

    get x() {
        if (this._phaserSprite) {
            return this._phaserSprite.x;
        }
        return this._cache.x || 0;
    }

    /**
     * @property {number} y - Vertical display coordinate of this Sprite.
     * @public
     */
    set y(value) {
        this._cache.y = value;
        if (this._phaserSprite) {
            this._phaserSprite.y = value;
        }
    }

    get y() {
        if (this._phaserSprite) {
            return this._phaserSprite.y;
        }
        return this._cache.y || 0;
    }

    /**
     * Configures the image used to display this Sprite.
     * @argument {string} image - The name of a preloaded image file to display for this Sprite. 
     */
    setImage(image) {
        this._image = image;
        if (this._phaserSprite) this._phaserSprite.loadTexture(image);
    }

    /**
     * Returns the image used to display this Sprite. 
     * @return {string} The name of the image file configured to display for this Sprite. 
     */
    getImage() {
        return this._image;
    }

    /**
     * @property {number} angle - The angle of travel for this Sprite, in degrees counter-clockwise from a ray extending to the right.
     * @public
     */
    set angle(value) {
        this._cache.angle = value;
        this._cache.angleChanged = true;
    }

    get angle() {
        if (this._cache.angleChanged || typeof this._phaserSprite === "undefined") {
            return this._cache.angle || 0;
        }

        let angle = Math.round((-this._phaserSprite.body.angle) // counter-clockwise to clockwise
            *
            180 / Math.PI); // radians to degrees
        while (angle < 0) angle += 360;
        return angle;
    }

    /**
     * @property {number} speed - The speed of travel for this Sprite, in pixels per second. 
     * @public
     */
    set speed(value) {
        this._cache.speed = value;
        this._cache.speedChanged = true;
    }

    get speed() {
        if (this._cache.speedChanged || typeof this._phaserSprite === "undefined") {
            return this._cache.speed || 0;
        }

        return this._phaserSprite.body.speed;
    }

    /**
     * @property {number} width - The width of this Sprite, in pixels. 
     * @public
     */
    set width(value) {
        if (this._phaserSprite) {
            this._phaserSprite.width = value;
        } else {
            this._cache.width = value;
        }
    }

    get width() {
        if (this._phaserSprite) {
            return this._phaserSprite.width;
        }
        return this._cache.width || 0;
    }

    /**
     * @property {number} height - The height of this Sprite, in pixels. 
     * @public
     */
    set height(value) {
        if (this._phaserSprite) {
            this._phaserSprite.height = value;
        } else {
            this._cache.height = value;
        }
    }

    get height() {
        if (this._phaserSprite) {
            return this._phaserSprite.height;
        }
        return this._cache.height || 0;
    }

    /**
     * Creates a Phaser sprite to implement the behavior of this (sgc) sprite.
     * Note that this Sprite may create and destroy multiple underlying Phaser
     * sprites over its lifespan.
     * @private
     */
    _createPhaserSprite() {
        this._phaserSprite = game._phaserGame.add.sprite(this.x, this.y, this.getImage());
        if (this._phaserSprite.key === "__missing") {
            alert("Error: " + this.name + " uses an image " + this.getImage() + " that was not preloaded.");
        }
        game._phaserSprites.push(this._phaserSprite);

        // Enable arcade physics for this Sprite.
        game._phaserGame.physics.arcade.enable(this._phaserSprite);
        this._phaserSprite.body.bounce.x = 1;
        this._phaserSprite.body.bounce.y = 1;

        // Create a back-reference.
        this._phaserSprite.data.sgcSprite = this;

        // Frame 7 is the "standing" pose in the typical twelve-image character sprite sheets.
        this._defaultImageFrame = 7;
        this._phaserSprite.frame = this._defaultImageFrame;

        // Set up handling for end-of-animation event.
        let handler = () => {
            this._cache.currentAnimation = undefined;
            this._phaserSprite.frame = this._defaultImageFrame;
            if (this.handleAnimationEnd) {
                this.handleAnimationEnd();
            }
        };
        this._phaserSprite.events.onAnimationComplete.add(handler, this);

        // Actually play any animation that was previously cached to play. 
        if (this._cache.currentAnimation) {
            this.playAnimation(this._cache.currentAnimation.name, this._cache.currentAnimation.repeat);
        }
    }

    /**
     * Updates this Sprite for the current pass of the game loop. 
     *
     * @private
     */
    _update() {
        if (!this._phaserSprite) this._createPhaserSprite();

        this._phaserSprite.body.immovable = !this.accelerateOnBounce;

        // If key handlers are defined for this Sprite, call them as appropriate 
        let keyboard = game._phaserGame.input.keyboard;
        if (this.handleLeftArrowKey && keyboard.isDown(Phaser.Keyboard.LEFT)) {
            this.handleLeftArrowKey();
        }
        if (this.handleRightArrowKey && keyboard.isDown(Phaser.Keyboard.RIGHT)) {
            this.handleRightArrowKey();
        }
        if (this.handleUpArrowKey && keyboard.isDown(Phaser.Keyboard.UP)) {
            this.handleUpArrowKey();
        }
        if (this.handleDownArrowKey && keyboard.isDown(Phaser.Keyboard.DOWN)) {
            this.handleDownArrowKey();
        }
        if (this.handleSpacebar && keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.handleSpacebar();
        }
        if (this.handleEscKey && keyboard.isDown(Phaser.Keyboard.ESC)) {
            this.handleEscKey();
        }
        if (this.handleEnterKey && keyboard.isDown(Phaser.Keyboard.ENTER)) {
            this.handleEnterKey();
        }
        if (this.handleAlphaNumericKeys) {
            if (keyboard.isDown(game._lastKeyCode)) {
                let keyChar = String.fromCharCode(game._lastKeyCode);
                if ((keyChar >= "A" && keyChar <= "Z") // alphabetic
                    ||
                    (keyChar >= "0" && keyChar <= "9")) // numeric  
                {
                    this.handleAlphaNumericKeys(keyChar);
                }
            }
        }

        // if mouse pointer is over this Sprite ...
        let mouse = game._phaserGame.input.mousePointer;
        if (this._phaserSprite.body.hitTest(mouse.x, mouse.y)) {
            // ... handle mouse events
            const MOUSE_TIME_THRESHOLD = 25; // 25 msec is empirical kludge, trying to avoid multiple hits for one click

            // If mouse left button down handler is defined for this Sprite, call it as appropriate
            if (this.handleMouseLeftButtonDown && mouse.leftButton.justPressed(MOUSE_TIME_THRESHOLD)) {
                this.handleMouseLeftButtonDown();
            }

            // If mouse left button up handler is defined for this Sprite, call it as appropriate
            if (mouse.leftButton.justReleased(MOUSE_TIME_THRESHOLD)) {
                if (this.handleMouseLeftButtonUp) this.handleMouseLeftButtonUp();
                if (this.handleMouseClick) this.handleMouseClick();
            }
        }

        // If boundary contact handler is defined for this Sprite, call it as appropriate
        if (this.handleBoundaryContact && (this.x < 0 || this.y < 0 || this.x > game.displayWidth || this.y > game.displayHeight)) {
            this.handleBoundaryContact();
        }

        // Update Phaser physics engine velocities if this Sprite's speed or direction was changed.
        if (typeof this._phaserSprite !== "undefined" && this._cache.speedChanged || this._cache.angleChanged)) {
            let radiansCW = ((-this.angle) // counter-clockwise to clockwise 
                *
                Math.PI / 180) + 2 * Math.PI; // degrees to radians

            this._phaserSprite.body.velocity.x = this.speed * Math.cos(radiansCW);
            this._phaserSprite.body.velocity.y = this.speed * Math.sin(radiansCW);
            this._cache.speedChanged = this._cache.angleChanged = false;
        }

        // If first game loop handler is defined for this Sprite, call it.
        if (this.handleFirstGameLoop) {
            this.handleFirstGameLoop();
            // Disable it.
            this.handleFirstGameLoop = undefined;
        }

        // If game loop handler is defined for this Sprite, call it.
        if (this.handleGameLoop) {
            this.handleGameLoop();
        }
    }

    /**
     * Creates an animation for this Sprite, which can then be used by calling this Sprite's {@linkcode Sprite#playAnimation playAnimation} method.
     * @argument {string} name - The animation's name.
     * @argument {number} firstFrame - The zero-based frame index of the animation's first frame.
     * @argument {number} lastFrame - The zero-based frame index of the animation's last frame.
     * @public
     */
    defineAnimation(name, firstFrame, lastFrame) {
        let frameArray = [];

        for (let iFrame = firstFrame; iFrame <= lastFrame; iFrame++) {
            frameArray.push(iFrame);
        }

        this._cache.animations.push({ name: name, frames: frameArray });
    }

    /**
     * Starts playback of an animation for this Sprite.
     * @argument {string} name - The animation's name, previously defined by a call to this Sprite's {@linkcode Sprite#defineAnimation defineAnimation} method.
     * @argument {boolean} [repeat=false] - Indicates if the animation should loop continuously.
     * @public
     */
    playAnimation(animationName, repeat) {
        // cache the request in case Phaser is not yet booted
        this._cache.currentAnimation = {
            name: animationName,
            repeat: repeat
        };

        if (typeof this._phaserSprite === "undefined") return;

        let currentAnimation = this._phaserSprite.animations.currentAnim;
        if (currentAnimation && currentAnimation.isPlaying && currentAnimation.name === animationName) {
            return; // animation is already playing
        }

        // Register newly added animations with Phaser 
        for (let i = 0; i < this._cache.animations.length; i++) {
            if (!this._phaserSprite.animations.getAnimation(this._cache.animations[i].name)) {
                this._phaserSprite.animations.add(this._cache.animations[i].name, this._cache.animations[i].frames, game.frameRate);
            }
        }

        if (!this._phaserSprite.animations.play(animationName, game.frameRate, repeat)) {
            alert("Warning: unable to play animation " + animationName + " on " + this.name);
        }
    };

    /**
     * Sets the angle of this Sprite so that it is aimed at a specified point. 
     * Note that this Sprite's speed is not changed; it may be zero. Note also 
     * that there is no guarantee that this Sprite will reach the specified point; 
     * its speed may not be an integral factor of the distance, and other 
     * factors may affect its motion. 
     * @argument {number} x - The horizontal coordinate to aim for.
     * @argument {number} y - The vertical coordinate to aim for.
     * @since 1.8
     * @public
     */
    aimFor(x, y) {
        // TODO check: is this correct for all directions?
        let opposite = Math.abs(this.x - x);
        let adjacent = Math.abs(this.y - y);
        let tangent = opposite / adjacent; // radians
        let arctangent = Math.atan(tangent) * 180 / Math.PI; // degrees

        let baseAngle = 90;
        if (this.y < y) {
            baseAngle = 270;
        }

        if (this.x < x) {
            this.angle = baseAngle + arctangent;
        } else {
            this.angle = baseAngle - arctangent;
        }
    }
}

/**
 * Called by sgc on each game loop where any letter or numeral key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleAlphaNumericKeys
 * @memberof Sprite
 * @instance
 * @argument {string} keyChar - The capital letter or numeral on the key that is down.
 * @public
 */

/**
 * Called by sgc on each game loop where the left arrow key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleLeftArrowKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the right arrow key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleRightArrowKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the up arrow key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleUpArrowKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the spacebar is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleSpacebar
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the Esc key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleEscKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the Enter key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleEnterKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where the down arrow key is down.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleDownArrowKey
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc when the mouse pointer is over this Sprite and the left mouse button moves from up to down. 
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleLeftMouseButtonDown
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc when the mouse pointer is over this Sprite and the left mouse button moves from down to up. 
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleLeftMouseButtonUp
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc when the mouse pointer is over this Sprite and the left mouse button is released. 
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleMouseClick
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where this Sprite is touching an edge of the display area.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleBoundaryContact
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on the first game loop that this Sprite is active in the Game.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleFirstGameLoop
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on every game loop that this Sprite is active in the Game.
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleGameLoop
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc when this Sprite's animation has played to the end. 
 * Subclasses may override the {@linkcode Sprite} implementation, which does nothing.
 * 
 * @method handleAnimationEnd
 * @memberof Sprite
 * @instance
 * @public
 */

/**
 * Called by sgc on each game loop where this Sprite is touching another Sprite.
 * The {@linkcode Sprite} implementation causes the Sprites to bounce against each other.
 * If both Sprites involved in the collison are instances of subclasses that override 
 * the base implementation, sgc calls both overrides unless they are the same 
 * function (i.e., the Sprites are of the same subclass). If all overrides called
 * for the collision return <code>true</code>, the default bounce behavior will 
 * still occur.
 * 
 * @method handleCollision
 * @memberof Sprite
 * @instance
 * @argument {Sprite} otherSprite - Another Sprite that is colliding with this Sprite.
 * @return {boolean} true if bounce is desired, false otherwise
 * @public
 */

/** 
 * global 
 * @type Game
 */
let game = new Game();

export { game, Sprite };
