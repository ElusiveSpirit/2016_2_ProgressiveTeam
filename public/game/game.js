(function () {
    'use strict';

    const WSHandler = window.WSHandler;
    const Animation = window.Animation;
    const TimeLine = window.TimeLine;
    const Pane = window.Pane;
    const Unit = window.Unit;
    const Field = window.Field;
    const cellSize = window.cellSize;

    class Game {
        constructor({canvas, width, height}, debug = true) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = width;
            this.height = height;

            this.debug = debug;
            if (!debug) {
                this.ws = new WSHandler(this.newTurn.bind(this));
            } else {
                let ntf = this.newTurn.bind(this);
                this.ws = {
                    data: null,
                    sendPosition: positions => {
                        return newTurn(this.data);
                    },
                    newTurn: ntf
                };
            }

            this.timeline = new TimeLine();
            this.field = new Field({
                x: 0,
                y: 0,
                count_x: 10,
                count_y: 6
            });
            this.field.addUnits([
                new Unit({ id: 1, x: 1, y: 1 }),
                new Unit({ id: 2, x: 3, y: 4 }),
            ]);
            if (debug) {
                this.field.setActiveUnit(1);
            }

            this.pane = new Pane(this.field, this.timeline);

            this.initEvents();
        }

        start() {
            this.active = true;

            if (this.debug) {
                let unit = this.field.clicked({ x: 1, y: 1 });

                unit.runAnimation(new Animation('move', {
                    rawX: 200
                }, {
                    x: 2
                }));

                console.log(unit);

            }
            // Stop animation during developing
            /*
            setTimeout(function(){
                this.active = false;
            }.bind(this), 2000);
            */

            this.renderLoop();
        }

        ready() {
            this.ws.sendPosition(this.field.getPosition());

            // Show animation to wait for opponent
            this.pane.toggleWaitOpponentAnim();
        }

        /**
         * New turn
         */
        newTurn(data) {
            this.pane.toggleWaitOpponentAnim();

            this.timeline.update(data.timeline);
            let currentTurn = this.timeline.pop();

            // this.field.setActiveUnit(currentTurn.unit_id);
            console.log('Coords', data);
            this.runAction(data.action);

            return;
            if (currentTurn.isMine() && currentTurn.id === data.id) {
                this.pane.startMyTurn(currentTurn);
            }
        }

        initEvents() {
            this.canvas.addEventListener('mousedown', event => {
                let coords = {
                    x: (event.x / cellSize ^ 0) - 1,
                    y: (event.y / cellSize ^ 0) - 1
                };
                console.log(coords);

                if (event.x < this.field._width + cellSize && event.y < this.field._height + cellSize) {
                    let unit = this.field.clicked(coords);
                    let activeUnit = this.field.getActiveUnit();

                    if (unit && unit.isEnemy()) {
                        // currentUnit is going to attack unit
                        let moving_to_coords = this.field.getCellToMove(event);

                        if (activeUnit.isReachable(coords) &&
                                this.activeUnit.isReachable(moving_to_coords)) {
                            this.ws.sendTurn({
                                action: 'attack',
                                coords: moving_to_coords,
                                action_to: coords
                            });
                        }
                    } else {
                        if (activeUnit.isReachable(coords)) {
                            if (!this.debug) {
                                this.ws.sendTurn({
                                    action: 'move',
                                    coords
                                });
                            } else {
                                let data = {
                                    'action': {
                                        type: 'move',
                                        coords: {x: coords.x, y: coords.y}
                                    }
                                };
                                this.newTurn(data);
                            }
                        }
                    }
                }
            });
        }

        isActive() {
            return this.active;
        }

        runAction(action_data) {
            let activeUnit = this.field.getActiveUnit();
            activeUnit.setAction(action_data);
        }

        renderLoop() {
            let time,
                isActive = this.isActive.bind(this),
                exec = this.exec.bind(this);
            
            function step() {
                let now = Date.now(),
                    dt = now - (time || now);

                time = now;

                if (isActive()) {
                    requestAnimationFrame(step);
                }

                exec(dt);
            }

            step();
        }

        exec(dt) {
            let activeUnit = this.field.getActiveUnit();
            activeUnit.update(dt);

            this.renderAll();
        }

        renderAll() {
            this.field.draw(this.ctx); 
        }
    }

    // export
    window.Game = Game;

})();
