
var Disc = function(options) {
    this.options = options;
    var opt = this.options;
    this.id = opt.id;
    this.el = $('<div id="disc-' + opt.id +'" title="Disc ' + opt.id +
                     '" class="disc"></div>');
    this.width = opt.width;
    this.margin = opt.margin;
    this.height = opt.height;
    this.el.css({
	'width': this.width,
	'height': this.height,
	'margin-left': this.margin,
	'margin-right': this.margin
    });
    return true;
};

Disc.prototype.getId = function() {
    return this.id;
}

Disc.prototype.getDisc = function() {
    return this.el;
};

var Peg = function(id) {
    this.alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.discs = [];
    this.container = jQuery('<div class="peg-container"></div>');
    this.peg = jQuery('<div class="peg" id="peg-' + (id+1) + '"></div>');
    this.id = id + 1;
    this.label = jQuery('<div class="peg-label">' + this.alpha[id] + '</div>');
    this.container.append(this.peg);
    this.container.append(this.label);
  
    return true;
};

Peg.prototype.top = function() {
    return this.discs.length > 0 ? this.discs[0] : null;
};

Peg.prototype.push = function(el) {
    // Si el disco no esta vacio
    // ponerlo en 0, de lo contrario al final
    if (this.discs.length > 0) {
	this.discs.unshift(el);
    } else {
	this.discs.push(el);
    }
};

Peg.prototype.pop = function() {
    var first = this.discs.shift();

    return first;
};

Peg.prototype.getPegContainer = function() {
    return this.container;
};

Peg.prototype.getPeg = function() {
    return this.peg;
};

var Game = function(options) {
    this.options = {
	numOfPegs: 3,
	numOfDiscs: 3,
	container: '#game-container',
	discHeight: 25,
	discMaxWidth: 200,
	destinationPeg: 3
    };

    // estado inicial del juego
    this.state = 'init';

    // Resultado del juego
    this.result = 0;

    var opt = this.options;

    // pasos realizados
    this.steps = 0;

    // pasos para ganar el juego
    this.maxSteps = Math.pow(2, this.options.numOfDiscs) - 1;

    // torres en el juego 
    this.pegs = [];

    // contenedor para el videojuego
    this.container = jQuery(opt.container);

    // referencia al objeto actual
    var _this = this;

    // llama a esta funcion despues de haber hecho un paso.
    this.afterStep = this.options.afterStep || function(_this) {};
    this.afterInit = this.options.afterInit || function(_this) {};

    // crear torres
    this.createPegs();

    // torre base, aqui se inicializan los discos
    var sourcePeg = this.pegs[0];

    // se crean los discos en la torre base
    this.createDiscs(sourcePeg);
    
    // ahora esta jugando
    this.state = 'playing';
    this.afterInit(_this);
}; 

// Crear Torres 
Game.prototype.createPegs = function() {
    for (var i = 0; i < this.options.numOfPegs; i++) {
      this.pegs[i] = new Peg(i);
      this.container.append(this.pegs[i].getPegContainer());

      this.pegs[i].getPeg().css({	// calcula la altura en base al numero de discos
	'min-height': this.options.discHeight*this.options.numOfDiscs
      });


	this._bindDroppableToPeg(this.pegs[i]);
    }
    // torre destino de color, verde => hanoi.css
    this.pegs[this.options.destinationPeg-1].getPeg().parent().addClass('peg-destination');
}


// Crear discos, 
Game.prototype.createDiscs = function(sourcePeg) {
  for (var i = 0; i < this.options.numOfDiscs; i++) {
    var disc = new Disc({
      id: i+1,
      width: this.options.discMaxWidth - (this.options.numOfDiscs-i)*20,
      height: this.options.discHeight,
      margin: (this.options.numOfDiscs-i)*10
    });

      // hacer disco draggable
      this._bindDraggableToDisc(disc);

      sourcePeg.discs.push(disc);
      sourcePeg.getPeg().append(disc.getDisc());
      disc.getDisc().css('top', i*this.options.discHeight);
  }

    var idealPegHeight = sourcePeg.getPeg().height();
    for (var i = 1; i < this.options.numOfPegs; i++) {
	this.pegs[i].getPeg().height(idealPegHeight);
    }

    // activar el primer disco de la torre, que sea movible
    var topDisc = sourcePeg.top().getDisc();
    topDisc.draggable('option', 'disabled', false).addClass('moveable');
}

// hacer torre droppable
Game.prototype._bindDroppableToPeg = function (pegObj) {
    // guardar referencia al objeto actual
    var _this = this;

    // manejador interno de droppable que tienen las torres
    var _pegDroppableHandler = function(e, ui) {
	var disc = ui.draggable;
	var disc_id = disc.attr('id');
	var targetPeg = jQuery(this);
        targetPeg = _this.getPegById(targetPeg.attr('id'));
	var isTargetPegEmpty = targetPeg.top() === null ? true : false;
	var targetPegTopDiscId = !isTargetPegEmpty ?
                             targetPeg.top().getDisc().attr('id') : null;

	// Calcular primera posicion para el disco destino
	var targetPegTopPosition;
	if (!isTargetPegEmpty) {
	    targetPegTopPosition = targetPeg.getPeg().height() - 
		(targetPeg.discs.length+1)*_this.options.discHeight;
	} else {
	    targetPegTopPosition =
		(_this.options.numOfDiscs-1)*_this.options.discHeight;
	}

	disc.draggable('option', 'revert', false);
	// Rovertir cuando el disco soltado es mayor al que esta en la torre
	if (!isTargetPegEmpty && targetPegTopDiscId <= disc_id) {
	    disc.draggable('option', 'revert', true); return;
	}

	// sacar el disco de la torre origen y ponerla en la torre destino
	var previousPeg = _this.getPegByDiscId(disc.attr('id'));
	targetPeg.push(previousPeg.pop());

	if (!isTargetPegEmpty) {
	    // ponerla al principio de las otras torres
	    targetPeg.getPeg().prepend(disc);
	    disc.css('top', targetPegTopPosition);
	} else {
	    // poner al final de la torre
	    targetPeg.getPeg().append(disc);
	    disc.css('top', targetPegTopPosition);
	}

	// Incrementa los pasos, por que el disco a sido lanzado
	// en la torre destino
	_this.steps++;

	for (p in _this.pegs) {
	    // Desabilidar dragging en todos los discos. 
	    for (d in _this.pegs[p].discs) {
		_this.pegs[p].discs[d].getDisc().draggable(
		    'option', 'disabled', true
		).removeClass('moveable');
	    }
	    if ( _this.pegs[p].top() !== null ) {
		// Activar draggable para el disco(top)
		// cuando este no sea null
		_this.pegs[p].top().getDisc().draggable(
		    'option', 'disabled', false
		).addClass('moveable');
	    }
	}

	// se ejecuta despues de haber hecho el primer paso.
	_this.afterStep(_this);
    }

    pegObj.getPeg().droppable({
	hoverClass: 'peg-over',
	drop: _pegDroppableHandler
    });
};

// Hacer un disco draggable
Game.prototype._bindDraggableToDisc = function (discObj) {
  discObj.getDisc().draggable({
    revert: 'invalid',
    containment: this.container,
    cursor: 'move',
    disabled: true,
    helper: 'clone',
    opacity: 0.35
  });
}

// Obtener torre por id
Game.prototype.getPegById = function(attr_id) {
    if (!attr_id) return null;

    var id = attr_id.substring(4) * 1;
    
    for (var i = 0; i < this.pegs.length; i++) {
	if (this.pegs[i].id == id) return this.pegs[i];
    }
    return null;
};

// obtener la torre que contiene el disco con un dado id
Game.prototype.getPegByDiscId = function(disc_id) {
    var pegs = this.pegs;
    for (p in pegs) {
	var discs = pegs[p].discs;
	for (d in discs) {
	    if (disc_id === discs[d].getDisc().attr('id')) {
		return pegs[p];
	    }
	}
    }

    return null;
};

