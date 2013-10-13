
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

var requestFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;

if (!requestFrame) {
    alert('ups! Browser not supported?');
}

var BASE_ZEALOT_IMG = '/img/assets/zealot_';
var EXTENSION = '.bmp';
var angle = '000';



var zealot = new Image();
zealot.src = BASE_ZEALOT_IMG + angle + EXTENSION;
zealot.onload = function() {
    requestFrame(render);
};

function render() {
    
    
    
    ctx.drawImage(zealot, 0, 0);
    
    requestFrame(render);
}

