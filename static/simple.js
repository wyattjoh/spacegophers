$(document).ready(function() {

  var footer = $("footer .connection");
  var userFooter = $("footer .player");

  // Sourced from: https://ecommerce.shopify.com/c/ecommerce-design/t/ordinal-number-in-javascript-1st-2nd-3rd-4th-29259
  function getGetOrdinal(n) {
     var s=["th","st","nd","rd"],
         v=n%100;
     return n+(s[(v-20)%10]||s[v]||s[0]);
  }

  var Gopher = function(game, deets, isPlayer) {
    this.id = deets.i;

    this.shape = new createjs.Sprite();

    this.image = isPlayer ? game.loader.getResult("usergopher") : game.loader.getResult("enemygopher");

    this.shape.spriteSheet = new createjs.SpriteSheet({
      images: [this.image],
      frames: {
        width: 50,
        height: 50,
        regX: 25,
        regY: 25
      }
    });

    this.update(deets);

    this.shape.play();

    console.log("New Gopher[" + this.id + "] at " + this.shape.x + "," + this.shape.y);
  };

  Gopher.prototype.update = function(deets) {
    this.velocity = deets.v;
    this.shape.rotation = deets.a * 180/3.14159265 + 90;
    this.shape.x = deets.p.x;
    this.shape.y = deets.p.y;
    this.points = deets.t;
    this.ns = deets.ns;

    // check if gopher is alive?
    if (deets.s) {
      // it is alive!

    } else {
      // it is dead..
    }
  };

  var Shot = function(game, deets) {
    this.id = deets.i;

    this.shape = new createjs.Sprite();

    this.shape.spriteSheet = new createjs.SpriteSheet({
      images: [game.loader.getResult("shot")],
      frames: {
        width: 10,
        height: 20,
        regX: 5,
        regY: 10
      }
    });

    this.update(deets);

    this.shape.play();
  };

  Shot.prototype.update = function(deets) {
    this.velocity = deets.v;
    this.shape.rotation = deets.a * 180/3.14159265 + 90;
    this.shape.x = deets.p.x;
    this.shape.y = deets.p.y;
  };

  var Game = function(id, queue) {
    var self = this;

    self.id = id;
    self.usergopherid = "";
    self.usergopher = null;
    self.enemygophers = {};
    self.shots = {};
    self.loader = new createjs.LoadQueue();
    self.state = false;
    self.commands = {};

    // self.loader.installPlugin()

    var manifest = [
      {id: "usergopher", src: "usergopher.png"},
      {id: "enemygopher", src: "enemygopher.png"},
      {id: "sky", src: "sky.png"},
      {id: "shot", src: "shot.png"}
    ];

    self.loader.loadManifest(manifest, true, "/static/");
    self.loader.on("complete", self.start, self);
  };

  Game.prototype.updateState = function(state) {
    var self = this;

    if (!self.state) {
      return;
    }

    var gopher, shot, current_gophers = {}, current_shots = {};

    state.shots.forEach(function(shotState) {
      current_shots[shotState.i] = true;

      if (shotState.i in self.shots) {
        shot = self.shots[shotState.i];

        shot.update(shotState);
      } else {
        shot = new Shot(self, shotState);

        self.shots[shotState.i] = shot;

        self.stage.addChild(shot.shape);
      }
    });

    state.gophers.forEach(function(gopherState, place) {
      current_gophers[gopherState.i] = true;

      if (gopherState.i == self.usergopherid) {
        if (self.usergopher) {
          self.usergopher.update(gopherState);
        } else {
          self.usergopher = new Gopher(self, gopherState, true);

          self.stage.addChild(self.usergopher.shape);
        }

        userFooter.text("You are in " + getGetOrdinal(place + 1) + " place with " + gopherState.t + " points.");
      } else if (gopherState.i in self.enemygophers) {
        gopher = self.enemygophers[gopherState.i];

        gopher.update(gopherState);
      } else {
        gopher = new Gopher(self, gopherState);

        self.enemygophers[gopherState.i] = gopher;

        self.stage.addChild(gopher.shape);
      }
    });

    // compute the diff from me to move everything to center
    var posx = self.usergopher.shape.x;
    var posy = self.usergopher.shape.y;

    self.usergopher.shape.x = self.w / 2.0;
    self.usergopher.shape.y = self.h / 2.0;

    var diffx = self.usergopher.shape.x - posx;
    var diffy = self.usergopher.shape.y - posy;

    // walk through enemy gophers and update based on my position...
    Object.keys(self.enemygophers).forEach(function(gopher_id) {
      var gopher = self.enemygophers[gopher_id];

      // if the gopher went away
      if (!(gopher_id in current_gophers)) {
        // then remove it from the scene
        self.stage.removeChild(gopher.shape);

        delete self.enemygophers[gopher_id];
      } else {
        gopher.shape.x += diffx;
        gopher.shape.y += diffy;
      }
    });

    Object.keys(self.shots).forEach(function(shot_id) {
      var shot = self.shots[shot_id];

      // if the shot went away
      if (!(shot_id in current_shots)) {
        // then remove it from the scene
        self.stage.removeChild(shot.shape);

        delete self.shots[shot_id];
      } else {
        shot.shape.x += diffx;
        shot.shape.y += diffy;
      }
    });

  };

  Game.prototype.resize = function(self) {
    return function() {
      self.w = window.innerWidth;
      self.h = window.innerHeight;

      self.stage.width = self.w;
      self.stage.height = self.h;

      self.stage.canvas.width = self.w;
      self.stage.canvas.height = self.h;

      self.sky.graphics.beginBitmapFill(self.loader.getResult("sky")).drawRect(0, 0, self.w, self.h);
    };
  };

  Game.prototype.start = function() {
    var self = this;

    self.meter = new FPSMeter({
      theme: 'colorful',
      heat: 1,
      graph: 1,
      history: 20
    });

    self.stage = new createjs.Stage("canvas");

    self.sky = new createjs.Shape();

    // resize the stage
    self.resize(self)();

    // Resize event listener
    window.addEventListener('resize', self.resize(self), false);
    window.addEventListener('orientationchange', self.resize(self), false);

    self.stage.addChild(self.sky);

    self.ws = new WebSocket("ws://" + window.wshost + "/" + self.id + "/ws");

    self.ws.onopen = function(evt) {
      footer.text("Connection opened");

      self.run();
    };

    self.ws.onclose = function(evt) {
      footer.text("Connection closed");
    };

    self.ws.onmessage = function(evt) {
      var pl = JSON.parse(evt.data);

      switch (pl.type) {
        case 'init':
          self.usergopherid = pl.i;
          break;
        case 'state':
          self.state = pl;
          break;
      }
    };
  };


  Game.prototype.setCommand = function(command, value) {
    var self = this;

    return function(e) {
      e.preventDefault();

      self.commands[command] = value;
    };
  };

  Game.prototype.setFire = function(value) {
    var self = this;

    return function(e) {
      e.preventDefault();

      if (!self.usergopher.ns) {
        self.commands.fire = value;
      } else {
        self.commands.fire = false;
      }
    };
  };

  Game.prototype.sendCommands = function() {
    var self = this;

    Object.keys(self.commands).forEach(function(command) {
      if (self.commands[command]) {
        console.log("Sending: " + command);
        self.ws.send(command);
      }
    });
  };

  Game.prototype.run = function() {
    var self = this;

    keyboardJS.bind(['a', 'left'], self.setCommand('left', true), self.setCommand('left', false));
    keyboardJS.bind(['d', 'right'], self.setCommand('right', true), self.setCommand('right', false));
    keyboardJS.bind(['w', 'up'], self.setCommand('up', true), self.setCommand('up', false));
    keyboardJS.bind(['s', 'down'], self.setCommand('down', true), self.setCommand('down', false));
    keyboardJS.bind('space', self.setFire(true), self.setFire(false));

    //Update stage will render next frame
    createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener("tick", self.handleTick(self));

    console.log("FPS: " + createjs.Ticker.framerate);
  };

  Game.prototype.handleTick = function(self) {
    return function() {
      self.sendCommands();
      self.updateState(self.state);
      self.stage.update();
      self.meter.tick();
    };
  };

  var getID = function(cb) {
    if (window.location.hash && window.location.hash.length > 0) {
      cb(window.location.hash.substring(1));
    } else {
      $.ajax({
        method: 'POST',
        url: '/',
        dataType: 'json'
      }).done(function (data) {
        window.location.hash = '#' + data.id;
        cb(data.id);
      });
    }
  };

  if (window.WebSocket) {
    getID(function(id) {
      new Game(id);
    });
  } else {
    footer.text("Your browser does not support WebSockets");
  }

});